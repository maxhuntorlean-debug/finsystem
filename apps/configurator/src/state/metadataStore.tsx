import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createCatalogAttributeRequest,
  createCatalogRequest,
  createChartRequest,
  createConstantRequest,
  createDocumentJournalRequest,
  createDocumentRequest,
  createProcessorRequest,
  deleteCatalogAttributeRequest,
  fetchCatalogAttributes,
  fetchCatalogs,
  fetchCharts,
  fetchConstants,
  fetchDocumentJournals,
  fetchDocuments,
  fetchProcessors,
  reorderCatalogAttributesRequest,
  updateCatalogAttributeRequest,
  updateCatalogRequest,
  updateChartRequest,
  updateConstantRequest,
  updateDocumentJournalRequest,
  updateDocumentRequest,
  updateProcessorRequest,
  type CatalogAttributeRecord,
  type ConstantValueType,
} from "../api/client";

export type CatalogAttribute = CatalogAttributeRecord;

export interface CatalogDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  levels: number;
  codeLength: number;
  nameLength: number;
  editMode: "list" | "dialog";
  codeType: "numeric" | "text";
}

const CATALOG_DEFAULTS = {
  levels: 1,
  codeLength: 9,
  nameLength: 25,
  editMode: "list" as const,
  codeType: "numeric" as const,
};

const CATALOG_ATTRIBUTE_DEFAULTS = {
  synonym: "",
  comment: "",
  valueType: "string" as const,
  referenceCatalogId: null as string | null,
  valueLength: 10,
  valueUnbounded: false,
  valuePrecision: 0,
  sortOrder: 0,
};

export interface ProcessorDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

export interface DocumentDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  numberLength: number;
}

const DOCUMENT_DEFAULTS = {
  numberLength: 9,
};

export interface ChartDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  codeLength: number;
  levels: number;
}

const CHART_DEFAULTS = {
  codeLength: 2,
  levels: 1,
};

export interface JournalDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

export interface ConstantDef {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  valueType: ConstantValueType;
  value: string;
  referenceCatalogId: string | null;
  valueLength: number;
  valueUnbounded: boolean;
  valuePrecision: number;
}

const CONSTANT_DEFAULTS = {
  valueType: "string" as const,
  value: "",
  referenceCatalogId: null as string | null,
  valueLength: 10,
  valueUnbounded: false,
  valuePrecision: 0,
};

export type MdiWindowKind =
  | "catalog-editor"
  | "item-form"
  | "processor-editor"
  | "processor-form"
  | "document-editor"
  | "document-form"
  | "chart-editor"
  | "chart-form"
  | "journal-editor"
  | "constant-editor"
  | "attribute-editor";

export interface MdiWindowState {
  id: string;
  kind: MdiWindowKind;
  ownerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

type NewWindow = Omit<MdiWindowState, "zIndex">;

interface MetadataContextValue {
  catalogs: CatalogDef[];
  processors: ProcessorDef[];
  documents: DocumentDef[];
  selectedNodeId: string;
  selectNode: (id: string) => void;
  addCatalog: () => void;
  updateCatalog: (id: string, patch: Partial<Omit<CatalogDef, "id">>) => void;
  openItemForm: (catalogId: string) => void;
  catalogAttributes: Record<string, CatalogAttribute[]>;
  ensureCatalogAttributes: (catalogId: string) => void;
  addCatalogAttribute: (catalogId: string) => string;
  updateCatalogAttribute: (
    catalogId: string,
    attributeId: string,
    patch: Partial<Omit<CatalogAttribute, "id" | "catalogId" | "sortOrder">>,
  ) => void;
  removeCatalogAttribute: (catalogId: string, attributeId: string) => void;
  reorderCatalogAttributes: (catalogId: string, orderedIds: string[]) => void;
  openAttributeEditor: (catalogId: string, attributeId: string) => void;
  addProcessor: () => void;
  updateProcessor: (
    id: string,
    patch: Partial<Omit<ProcessorDef, "id">>,
  ) => void;
  openProcessorForm: (processorId: string) => void;
  addDocument: () => void;
  updateDocument: (
    id: string,
    patch: Partial<Omit<DocumentDef, "id">>,
  ) => void;
  openDocumentForm: (documentId: string) => void;
  charts: ChartDef[];
  addChart: () => void;
  updateChart: (id: string, patch: Partial<Omit<ChartDef, "id">>) => void;
  openChartForm: (chartId: string) => void;
  journals: JournalDef[];
  addJournal: () => void;
  updateJournal: (id: string, patch: Partial<Omit<JournalDef, "id">>) => void;
  constants: ConstantDef[];
  addConstant: () => void;
  updateConstant: (
    id: string,
    patch: Partial<Omit<ConstantDef, "id">>,
  ) => void;
  openWindows: MdiWindowState[];
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowRect: (
    windowId: string,
    rect: Partial<Pick<MdiWindowState, "x" | "y" | "width" | "height">>,
  ) => void;
}

const MetadataContext = createContext<MetadataContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function createDebouncedUpdater<T>(
  pendingPatches: Map<string, Partial<T>>,
  updateTimers: Map<string, ReturnType<typeof setTimeout>>,
  sendRequest: (id: string, patch: Partial<T>) => Promise<void>,
  errorMessage: string,
) {
  return (id: string, patch: Partial<T>) => {
    const accumulated = { ...(pendingPatches.get(id) ?? {}), ...patch };
    pendingPatches.set(id, accumulated);

    const existingTimer = updateTimers.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      const toSend = pendingPatches.get(id);
      pendingPatches.delete(id);
      updateTimers.delete(id);
      if (toSend) {
        sendRequest(id, toSend).catch((err) => console.error(errorMessage, err));
      }
    }, 500);
    updateTimers.set(id, timer);
  };
}

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [catalogs, setCatalogs] = useState<CatalogDef[]>([]);
  const [processors, setProcessors] = useState<ProcessorDef[]>([]);
  const [documents, setDocuments] = useState<DocumentDef[]>([]);
  const [charts, setCharts] = useState<ChartDef[]>([]);
  const [journals, setJournals] = useState<JournalDef[]>([]);
  const [constants, setConstants] = useState<ConstantDef[]>([]);
  const [catalogAttributes, setCatalogAttributes] = useState<
    Record<string, CatalogAttribute[]>
  >({});
  const loadedAttributeCatalogs = useRef<Set<string>>(new Set());
  const pendingNewAttributes = useRef<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string>("root");
  const [openWindows, setOpenWindows] = useState<MdiWindowState[]>([]);
  const zCounterRef = useRef(1);

  const catalogPendingPatches = useRef<
    Map<string, Partial<Omit<CatalogDef, "id">>>
  >(new Map());
  const catalogUpdateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const debouncedUpdateCatalog = useMemo(
    () =>
      createDebouncedUpdater(
        catalogPendingPatches.current,
        catalogUpdateTimers.current,
        updateCatalogRequest,
        "Не удалось сохранить изменения справочника",
      ),
    [],
  );

  const processorPendingPatches = useRef<
    Map<string, Partial<Omit<ProcessorDef, "id">>>
  >(new Map());
  const processorUpdateTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const debouncedUpdateProcessor = useMemo(
    () =>
      createDebouncedUpdater(
        processorPendingPatches.current,
        processorUpdateTimers.current,
        updateProcessorRequest,
        "Не удалось сохранить изменения обработки",
      ),
    [],
  );

  const documentPendingPatches = useRef<
    Map<string, Partial<Omit<DocumentDef, "id">>>
  >(new Map());
  const documentUpdateTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const debouncedUpdateDocument = useMemo(
    () =>
      createDebouncedUpdater(
        documentPendingPatches.current,
        documentUpdateTimers.current,
        updateDocumentRequest,
        "Не удалось сохранить изменения документа",
      ),
    [],
  );

  const chartPendingPatches = useRef<Map<string, Partial<Omit<ChartDef, "id">>>>(
    new Map(),
  );
  const chartUpdateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const debouncedUpdateChart = useMemo(
    () =>
      createDebouncedUpdater(
        chartPendingPatches.current,
        chartUpdateTimers.current,
        updateChartRequest,
        "Не удалось сохранить изменения плана счетов",
      ),
    [],
  );

  const journalPendingPatches = useRef<
    Map<string, Partial<Omit<JournalDef, "id">>>
  >(new Map());
  const journalUpdateTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const debouncedUpdateJournal = useMemo(
    () =>
      createDebouncedUpdater(
        journalPendingPatches.current,
        journalUpdateTimers.current,
        updateDocumentJournalRequest,
        "Не удалось сохранить изменения журнала документов",
      ),
    [],
  );

  const constantPendingPatches = useRef<
    Map<string, Partial<Omit<ConstantDef, "id">>>
  >(new Map());
  const constantUpdateTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const debouncedUpdateConstant = useMemo(
    () =>
      createDebouncedUpdater(
        constantPendingPatches.current,
        constantUpdateTimers.current,
        updateConstantRequest,
        "Не удалось сохранить изменения константы",
      ),
    [],
  );

  const attributePendingPatches = useRef<
    Map<string, Partial<Omit<CatalogAttribute, "id" | "catalogId" | "sortOrder">>>
  >(new Map());
  const attributeUpdateTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const debouncedUpdateCatalogAttribute = useMemo(
    () =>
      createDebouncedUpdater(
        attributePendingPatches.current,
        attributeUpdateTimers.current,
        updateCatalogAttributeRequest,
        "Не удалось сохранить изменения реквизита",
      ),
    [],
  );

  useEffect(() => {
    fetchCatalogs()
      .then((records) =>
        setCatalogs(records.map((r) => ({ ...CATALOG_DEFAULTS, ...r }))),
      )
      .catch((err) => console.error("Не удалось загрузить справочники", err));
    fetchProcessors()
      .then(setProcessors)
      .catch((err) => console.error("Не удалось загрузить обработки", err));
    fetchDocuments()
      .then((records) =>
        setDocuments(records.map((r) => ({ ...DOCUMENT_DEFAULTS, ...r }))),
      )
      .catch((err) => console.error("Не удалось загрузить документы", err));
    fetchCharts()
      .then((records) =>
        setCharts(records.map((r) => ({ ...CHART_DEFAULTS, ...r }))),
      )
      .catch((err) => console.error("Не удалось загрузить планы счетов", err));
    fetchDocumentJournals()
      .then(setJournals)
      .catch((err) =>
        console.error("Не удалось загрузить журналы документов", err),
      );
    fetchConstants()
      .then((records) =>
        setConstants(records.map((r) => ({ ...CONSTANT_DEFAULTS, ...r }))),
      )
      .catch((err) => console.error("Не удалось загрузить константы", err));
  }, []);

  const focusWindow = useCallback((windowId: string) => {
    setOpenWindows((prev) => {
      const z = ++zCounterRef.current;
      return prev.map((w) => (w.id === windowId ? { ...w, zIndex: z } : w));
    });
  }, []);

  const updateWindowRect = useCallback(
    (
      windowId: string,
      rect: Partial<Pick<MdiWindowState, "x" | "y" | "width" | "height">>,
    ) => {
      setOpenWindows((prev) =>
        prev.map((w) => (w.id === windowId ? { ...w, ...rect } : w)),
      );
    },
    [],
  );

  const openOrFocusWindow = useCallback((factory: () => NewWindow) => {
    setOpenWindows((prev) => {
      const base = factory();
      const existing = prev.find((w) => w.id === base.id);
      const z = ++zCounterRef.current;
      if (existing) {
        return prev.map((w) => (w.id === base.id ? { ...w, zIndex: z } : w));
      }
      const cascadeOffset = (prev.length % 8) * 24;
      return [
        ...prev,
        {
          ...base,
          x: base.x + cascadeOffset,
          y: base.y + cascadeOffset,
          zIndex: z,
        },
      ];
    });
  }, []);

  const selectNode = useCallback(
    (id: string) => {
      setSelectedNodeId(id);
      if (id.startsWith("catalog:")) {
        const catalogId = id.slice("catalog:".length);
        openOrFocusWindow(() => ({
          id: `win:catalog:${catalogId}`,
          kind: "catalog-editor",
          ownerId: catalogId,
          x: 80,
          y: 60,
          width: 560,
          height: 460,
        }));
      } else if (id.startsWith("processor:")) {
        const processorId = id.slice("processor:".length);
        openOrFocusWindow(() => ({
          id: `win:processor:${processorId}`,
          kind: "processor-editor",
          ownerId: processorId,
          x: 80,
          y: 60,
          width: 420,
          height: 260,
        }));
      } else if (id.startsWith("document:")) {
        const documentId = id.slice("document:".length);
        openOrFocusWindow(() => ({
          id: `win:document:${documentId}`,
          kind: "document-editor",
          ownerId: documentId,
          x: 80,
          y: 60,
          width: 420,
          height: 280,
        }));
      } else if (id.startsWith("chart:")) {
        const chartId = id.slice("chart:".length);
        openOrFocusWindow(() => ({
          id: `win:chart:${chartId}`,
          kind: "chart-editor",
          ownerId: chartId,
          x: 80,
          y: 60,
          width: 420,
          height: 280,
        }));
      } else if (id.startsWith("journal:")) {
        const journalId = id.slice("journal:".length);
        openOrFocusWindow(() => ({
          id: `win:journal:${journalId}`,
          kind: "journal-editor",
          ownerId: journalId,
          x: 80,
          y: 60,
          width: 420,
          height: 320,
        }));
      } else if (id.startsWith("constant:")) {
        const constantId = id.slice("constant:".length);
        openOrFocusWindow(() => ({
          id: `win:constant:${constantId}`,
          kind: "constant-editor",
          ownerId: constantId,
          x: 80,
          y: 60,
          width: 420,
          height: 480,
        }));
      }
    },
    [openOrFocusWindow],
  );

  const addCatalog = useCallback(() => {
    const id = generateId();
    const newCatalog: CatalogDef = {
      id,
      name: `Справочник${catalogs.length + 1}`,
      synonym: "",
      comment: "",
      ...CATALOG_DEFAULTS,
    };
    setCatalogs((prev) => [...prev, newCatalog]);
    createCatalogRequest(newCatalog).catch((err) =>
      console.error("Не удалось сохранить справочник", err),
    );
    setSelectedNodeId(`catalog:${id}`);
    openOrFocusWindow(() => ({
      id: `win:catalog:${id}`,
      kind: "catalog-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 560,
      height: 460,
    }));
  }, [catalogs.length, openOrFocusWindow]);

  const openItemForm = useCallback(
    (catalogId: string) => {
      openOrFocusWindow(() => ({
        id: `win:item-form:${catalogId}`,
        kind: "item-form",
        ownerId: catalogId,
        x: 100,
        y: 70,
        width: 800,
        height: 600,
      }));
    },
    [openOrFocusWindow],
  );

  const ensureCatalogAttributes = useCallback((catalogId: string) => {
    if (loadedAttributeCatalogs.current.has(catalogId)) return;
    loadedAttributeCatalogs.current.add(catalogId);
    fetchCatalogAttributes(catalogId)
      .then((records) => {
        setCatalogAttributes((prev) => ({ ...prev, [catalogId]: records }));
      })
      .catch((err) => {
        loadedAttributeCatalogs.current.delete(catalogId);
        console.error("Не удалось загрузить реквизиты справочника", err);
      });
  }, []);

  const addCatalogAttribute = useCallback(
    (catalogId: string) => {
      const id = generateId();
      const existing = catalogAttributes[catalogId] ?? [];
      const newAttribute: CatalogAttribute = {
        id,
        catalogId,
        name: `Реквизит${existing.length + 1}`,
        ...CATALOG_ATTRIBUTE_DEFAULTS,
        sortOrder: existing.length,
      };
      setCatalogAttributes((prev) => ({
        ...prev,
        [catalogId]: [...(prev[catalogId] ?? []), newAttribute],
      }));
      createCatalogAttributeRequest(catalogId, newAttribute).catch((err) =>
        console.error("Не удалось сохранить реквизит", err),
      );
      pendingNewAttributes.current.add(id);
      return id;
    },
    [catalogAttributes],
  );

  const updateCatalogAttribute = useCallback(
    (
      catalogId: string,
      attributeId: string,
      patch: Partial<Omit<CatalogAttribute, "id" | "catalogId" | "sortOrder">>,
    ) => {
      setCatalogAttributes((prev) => ({
        ...prev,
        [catalogId]: (prev[catalogId] ?? []).map((attr) =>
          attr.id === attributeId ? { ...attr, ...patch } : attr,
        ),
      }));
      debouncedUpdateCatalogAttribute(attributeId, patch);
      pendingNewAttributes.current.delete(attributeId);
    },
    [debouncedUpdateCatalogAttribute],
  );

  const removeCatalogAttribute = useCallback(
    (catalogId: string, attributeId: string) => {
      setCatalogAttributes((prev) => ({
        ...prev,
        [catalogId]: (prev[catalogId] ?? []).filter(
          (attr) => attr.id !== attributeId,
        ),
      }));
      deleteCatalogAttributeRequest(attributeId).catch((err) =>
        console.error("Не удалось удалить реквизит", err),
      );
    },
    [],
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      setOpenWindows((prev) => prev.filter((w) => w.id !== windowId));
      if (windowId.startsWith("win:attribute:")) {
        const attributeId = windowId.slice("win:attribute:".length);
        if (pendingNewAttributes.current.has(attributeId)) {
          pendingNewAttributes.current.delete(attributeId);
          const attr = Object.values(catalogAttributes)
            .flat()
            .find((a) => a.id === attributeId);
          if (attr) removeCatalogAttribute(attr.catalogId, attr.id);
        }
      }
    },
    [catalogAttributes, removeCatalogAttribute],
  );

  const reorderCatalogAttributes = useCallback(
    (catalogId: string, orderedIds: string[]) => {
      setCatalogAttributes((prev) => {
        const current = prev[catalogId] ?? [];
        const byId = new Map(current.map((attr) => [attr.id, attr]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((attr): attr is CatalogAttribute => !!attr);
        return { ...prev, [catalogId]: reordered };
      });
      reorderCatalogAttributesRequest(catalogId, orderedIds).catch((err) =>
        console.error("Не удалось изменить порядок реквизитов", err),
      );
    },
    [],
  );

  const openAttributeEditor = useCallback(
    (catalogId: string, attributeId: string) => {
      ensureCatalogAttributes(catalogId);
      openOrFocusWindow(() => ({
        id: `win:attribute:${attributeId}`,
        kind: "attribute-editor",
        ownerId: attributeId,
        x: 140,
        y: 100,
        width: 380,
        height: 420,
      }));
    },
    [ensureCatalogAttributes, openOrFocusWindow],
  );

  const addProcessor = useCallback(() => {
    const id = generateId();
    const newProcessor: ProcessorDef = {
      id,
      name: `Обработка${processors.length + 1}`,
      synonym: "",
      comment: "",
    };
    setProcessors((prev) => [...prev, newProcessor]);
    createProcessorRequest(newProcessor).catch((err) =>
      console.error("Не удалось сохранить обработку", err),
    );
    setSelectedNodeId(`processor:${id}`);
    openOrFocusWindow(() => ({
      id: `win:processor:${id}`,
      kind: "processor-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 420,
      height: 260,
    }));
  }, [processors.length, openOrFocusWindow]);

  const openProcessorForm = useCallback(
    (processorId: string) => {
      openOrFocusWindow(() => ({
        id: `win:processor-form:${processorId}`,
        kind: "processor-form",
        ownerId: processorId,
        x: 120,
        y: 90,
        width: 560,
        height: 420,
      }));
    },
    [openOrFocusWindow],
  );

  const addDocument = useCallback(() => {
    const id = generateId();
    const newDocument: DocumentDef = {
      id,
      name: `Документ${documents.length + 1}`,
      synonym: "",
      comment: "",
      ...DOCUMENT_DEFAULTS,
    };
    setDocuments((prev) => [...prev, newDocument]);
    createDocumentRequest(newDocument).catch((err) =>
      console.error("Не удалось сохранить документ", err),
    );
    setSelectedNodeId(`document:${id}`);
    openOrFocusWindow(() => ({
      id: `win:document:${id}`,
      kind: "document-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 420,
      height: 280,
    }));
  }, [documents.length, openOrFocusWindow]);

  const openDocumentForm = useCallback(
    (documentId: string) => {
      openOrFocusWindow(() => ({
        id: `win:document-form:${documentId}`,
        kind: "document-form",
        ownerId: documentId,
        x: 120,
        y: 90,
        width: 560,
        height: 420,
      }));
    },
    [openOrFocusWindow],
  );

  const addChart = useCallback(() => {
    const id = generateId();
    const newChart: ChartDef = {
      id,
      name: `ПланСчетов${charts.length + 1}`,
      synonym: "",
      comment: "",
      ...CHART_DEFAULTS,
    };
    setCharts((prev) => [...prev, newChart]);
    createChartRequest(newChart).catch((err) =>
      console.error("Не удалось сохранить план счетов", err),
    );
    setSelectedNodeId(`chart:${id}`);
    openOrFocusWindow(() => ({
      id: `win:chart:${id}`,
      kind: "chart-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 420,
      height: 280,
    }));
  }, [charts.length, openOrFocusWindow]);

  const openChartForm = useCallback(
    (chartId: string) => {
      openOrFocusWindow(() => ({
        id: `win:chart-form:${chartId}`,
        kind: "chart-form",
        ownerId: chartId,
        x: 120,
        y: 90,
        width: 560,
        height: 420,
      }));
    },
    [openOrFocusWindow],
  );

  const addJournal = useCallback(() => {
    const id = generateId();
    const newJournal: JournalDef = {
      id,
      name: `ЖурналДокументов${journals.length + 1}`,
      synonym: "",
      comment: "",
    };
    setJournals((prev) => [...prev, newJournal]);
    createDocumentJournalRequest(newJournal).catch((err) =>
      console.error("Не удалось сохранить журнал документов", err),
    );
    setSelectedNodeId(`journal:${id}`);
    openOrFocusWindow(() => ({
      id: `win:journal:${id}`,
      kind: "journal-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 420,
      height: 320,
    }));
  }, [journals.length, openOrFocusWindow]);

  const addConstant = useCallback(() => {
    const id = generateId();
    const newConstant: ConstantDef = {
      id,
      name: `Константа${constants.length + 1}`,
      synonym: "",
      comment: "",
      ...CONSTANT_DEFAULTS,
    };
    setConstants((prev) => [...prev, newConstant]);
    createConstantRequest(newConstant).catch((err) =>
      console.error("Не удалось сохранить константу", err),
    );
    setSelectedNodeId(`constant:${id}`);
    openOrFocusWindow(() => ({
      id: `win:constant:${id}`,
      kind: "constant-editor",
      ownerId: id,
      x: 80,
      y: 60,
      width: 420,
      height: 480,
    }));
  }, [constants.length, openOrFocusWindow]);

  const updateCatalog = useCallback(
    (id: string, patch: Partial<Omit<CatalogDef, "id">>) => {
      setCatalogs((prev) =>
        prev.map((catalog) =>
          catalog.id === id ? { ...catalog, ...patch } : catalog,
        ),
      );
      debouncedUpdateCatalog(id, patch);
    },
    [debouncedUpdateCatalog],
  );

  const updateProcessor = useCallback(
    (id: string, patch: Partial<Omit<ProcessorDef, "id">>) => {
      setProcessors((prev) =>
        prev.map((processor) =>
          processor.id === id ? { ...processor, ...patch } : processor,
        ),
      );
      debouncedUpdateProcessor(id, patch);
    },
    [debouncedUpdateProcessor],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<Omit<DocumentDef, "id">>) => {
      setDocuments((prev) =>
        prev.map((document) =>
          document.id === id ? { ...document, ...patch } : document,
        ),
      );
      debouncedUpdateDocument(id, patch);
    },
    [debouncedUpdateDocument],
  );

  const updateChart = useCallback(
    (id: string, patch: Partial<Omit<ChartDef, "id">>) => {
      setCharts((prev) =>
        prev.map((chart) => (chart.id === id ? { ...chart, ...patch } : chart)),
      );
      debouncedUpdateChart(id, patch);
    },
    [debouncedUpdateChart],
  );

  const updateJournal = useCallback(
    (id: string, patch: Partial<Omit<JournalDef, "id">>) => {
      setJournals((prev) =>
        prev.map((journal) =>
          journal.id === id ? { ...journal, ...patch } : journal,
        ),
      );
      debouncedUpdateJournal(id, patch);
    },
    [debouncedUpdateJournal],
  );

  const updateConstant = useCallback(
    (id: string, patch: Partial<Omit<ConstantDef, "id">>) => {
      setConstants((prev) =>
        prev.map((constant) =>
          constant.id === id ? { ...constant, ...patch } : constant,
        ),
      );
      debouncedUpdateConstant(id, patch);
    },
    [debouncedUpdateConstant],
  );

  const value = useMemo(
    () => ({
      catalogs,
      processors,
      documents,
      selectedNodeId,
      selectNode,
      addCatalog,
      updateCatalog,
      openItemForm,
      catalogAttributes,
      ensureCatalogAttributes,
      addCatalogAttribute,
      updateCatalogAttribute,
      removeCatalogAttribute,
      reorderCatalogAttributes,
      openAttributeEditor,
      addProcessor,
      updateProcessor,
      openProcessorForm,
      addDocument,
      updateDocument,
      openDocumentForm,
      charts,
      addChart,
      updateChart,
      openChartForm,
      journals,
      addJournal,
      updateJournal,
      constants,
      addConstant,
      updateConstant,
      openWindows,
      closeWindow,
      focusWindow,
      updateWindowRect,
    }),
    [
      catalogs,
      processors,
      documents,
      selectedNodeId,
      selectNode,
      addCatalog,
      updateCatalog,
      openItemForm,
      catalogAttributes,
      ensureCatalogAttributes,
      addCatalogAttribute,
      updateCatalogAttribute,
      removeCatalogAttribute,
      reorderCatalogAttributes,
      openAttributeEditor,
      addProcessor,
      updateProcessor,
      openProcessorForm,
      addDocument,
      updateDocument,
      openDocumentForm,
      charts,
      addChart,
      updateChart,
      openChartForm,
      journals,
      addJournal,
      updateJournal,
      constants,
      addConstant,
      updateConstant,
      openWindows,
      closeWindow,
      focusWindow,
      updateWindowRect,
    ],
  );

  return (
    <MetadataContext.Provider value={value}>
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata(): MetadataContextValue {
  const ctx = useContext(MetadataContext);
  if (!ctx) {
    throw new Error("useMetadata must be used within MetadataProvider");
  }
  return ctx;
}
