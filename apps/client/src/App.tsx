import { useEffect, useRef, useState } from "react";
import {
  fetchCatalogs,
  fetchCharts,
  fetchConstants,
  fetchDocumentJournals,
  fetchDocuments,
  fetchProcessors,
  type CatalogItem,
  type CatalogRecord,
  type ChartRecord,
  type ConstantRecord,
  type DocumentJournalRecord,
  type DocumentRecord,
  type ProcessorRecord,
} from "./api/client";
import TopMenu from "./components/TopMenu";
import MdiWindow from "./components/MdiWindow";
import CatalogListForm from "./components/CatalogListForm";
import DocumentJournalForm from "./components/DocumentJournalForm";
import DocumentJournalListForm from "./components/DocumentJournalListForm";
import AccountListForm from "./components/AccountListForm";
import ProcessorRunner from "./components/ProcessorRunner";
import ConstantsForm from "./components/ConstantsForm";
import LogPanel, { type LogEntry } from "./components/LogPanel";
import "./App.css";

type WindowKind =
  | "catalog"
  | "processor"
  | "document"
  | "chart"
  | "journal"
  | "constants";

interface OpenWindow {
  id: string;
  kind: WindowKind;
  ownerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

function App() {
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [processors, setProcessors] = useState<ProcessorRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [journals, setJournals] = useState<DocumentJournalRecord[]>([]);
  const [constants, setConstants] = useState<ConstantRecord[]>([]);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [pendingPick, setPendingPick] = useState<{
    catalogId: string;
    onPick: (item: CatalogItem) => void;
  } | null>(null);
  const zCounterRef = useRef(1);
  const logCounterRef = useRef(1);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogEntries((prev) => [
      ...prev,
      { id: String(logCounterRef.current++), time, text },
    ]);
  };

  useEffect(() => {
    fetchCatalogs()
      .then(setCatalogs)
      .catch((err) => console.error("Не удалось загрузить справочники", err));
    fetchProcessors()
      .then(setProcessors)
      .catch((err) => console.error("Не удалось загрузить обработки", err));
    fetchDocuments()
      .then(setDocuments)
      .catch((err) => console.error("Не удалось загрузить документы", err));
    fetchCharts()
      .then(setCharts)
      .catch((err) => console.error("Не удалось загрузить планы счетов", err));
    fetchDocumentJournals()
      .then(setJournals)
      .catch((err) =>
        console.error("Не удалось загрузить журналы документов", err),
      );
    fetchConstants()
      .then(setConstants)
      .catch((err) => console.error("Не удалось загрузить константы", err));
  }, []);

  const openWindow = (kind: WindowKind, ownerId: string) => {
    const id = `${kind}:${ownerId}`;
    setOpenWindows((prev) => {
      const existing = prev.find((w) => w.id === id);
      const z = ++zCounterRef.current;
      if (existing) {
        return prev.map((w) => (w.id === id ? { ...w, zIndex: z } : w));
      }
      const cascade = (prev.length % 8) * 24;
      return [
        ...prev,
        {
          id,
          kind,
          ownerId,
          x: 40 + cascade,
          y: 30 + cascade,
          width: 480,
          height: 340,
          zIndex: z,
        },
      ];
    });
  };

  const openCatalogWindow = (catalogId: string) =>
    openWindow("catalog", catalogId);
  const openProcessorWindow = (processorId: string) =>
    openWindow("processor", processorId);
  const openDocumentWindow = (documentId: string) =>
    openWindow("document", documentId);
  const openChartWindow = (chartId: string) => openWindow("chart", chartId);
  const openJournalWindow = (journalId: string) =>
    openWindow("journal", journalId);
  const openConstantsWindow = () => openWindow("constants", "singleton");

  const openCatalogForPick = (
    catalogId: string,
    onPick: (item: CatalogItem) => void,
  ) => {
    setPendingPick({ catalogId, onPick });
    openWindow("catalog", catalogId);
  };

  const closeWindow = (id: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id));
    setPendingPick((prev) =>
      prev && id === `catalog:${prev.catalogId}` ? null : prev,
    );
  };

  const focusWindow = (id: string) =>
    setOpenWindows((prev) => {
      const z = ++zCounterRef.current;
      return prev.map((w) => (w.id === id ? { ...w, zIndex: z } : w));
    });

  const updateWindowRect = (
    id: string,
    rect: Partial<Pick<OpenWindow, "x" | "y" | "width" | "height">>,
  ) =>
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...rect } : w)),
    );

  const topZ = openWindows.reduce((max, w) => Math.max(max, w.zIndex), -1);

  return (
    <div className="app">
      <TopMenu
        catalogs={catalogs}
        processors={processors}
        documents={documents}
        charts={charts}
        journals={journals}
        onSelectCatalog={openCatalogWindow}
        onSelectProcessor={openProcessorWindow}
        onSelectDocument={openDocumentWindow}
        onSelectChart={openChartWindow}
        onSelectJournal={openJournalWindow}
        onOpenConstants={openConstantsWindow}
      />
      <main className="app-content">
        {openWindows.length === 0 && (
          <div className="app-placeholder">
            Выберите справочник, документ, план счетов или обработку в меню
          </div>
        )}
        {openWindows.map((win) => {
          if (win.kind === "catalog") {
            const catalog = catalogs.find((c) => c.id === win.ownerId);
            if (!catalog) return null;
            return (
              <MdiWindow
                key={win.id}
                title={`Справочник: ${catalog.synonym || catalog.name}`}
                x={win.x}
                y={win.y}
                width={win.width}
                height={win.height}
                zIndex={win.zIndex}
                active={win.zIndex === topZ}
                onFocus={() => focusWindow(win.id)}
                onClose={() => closeWindow(win.id)}
                onRectChange={(rect) => updateWindowRect(win.id, rect)}
              >
                <CatalogListForm
                  catalog={catalog}
                  catalogs={catalogs}
                  constants={constants}
                  onLog={addLog}
                  onPickFromCatalog={openCatalogForPick}
                  onPick={
                    pendingPick?.catalogId === catalog.id
                      ? (item) => {
                          pendingPick.onPick(item);
                          setPendingPick(null);
                        }
                      : undefined
                  }
                />
              </MdiWindow>
            );
          }

          if (win.kind === "document") {
            const document = documents.find((d) => d.id === win.ownerId);
            if (!document) return null;
            return (
              <MdiWindow
                key={win.id}
                title={`Документ: ${document.synonym || document.name}`}
                x={win.x}
                y={win.y}
                width={win.width}
                height={win.height}
                zIndex={win.zIndex}
                active={win.zIndex === topZ}
                onFocus={() => focusWindow(win.id)}
                onClose={() => closeWindow(win.id)}
                onRectChange={(rect) => updateWindowRect(win.id, rect)}
              >
                <DocumentJournalForm
                  document={document}
                  catalogs={catalogs}
                  constants={constants}
                  onLog={addLog}
                />
              </MdiWindow>
            );
          }

          if (win.kind === "chart") {
            const chart = charts.find((c) => c.id === win.ownerId);
            if (!chart) return null;
            return (
              <MdiWindow
                key={win.id}
                title={`План счетов: ${chart.synonym || chart.name}`}
                x={win.x}
                y={win.y}
                width={win.width}
                height={win.height}
                zIndex={win.zIndex}
                active={win.zIndex === topZ}
                onFocus={() => focusWindow(win.id)}
                onClose={() => closeWindow(win.id)}
                onRectChange={(rect) => updateWindowRect(win.id, rect)}
              >
                <AccountListForm
                  chart={chart}
                  catalogs={catalogs}
                  constants={constants}
                  onLog={addLog}
                />
              </MdiWindow>
            );
          }

          if (win.kind === "journal") {
            const journal = journals.find((j) => j.id === win.ownerId);
            if (!journal) return null;
            return (
              <MdiWindow
                key={win.id}
                title={`Журнал документов: ${journal.synonym || journal.name}`}
                x={win.x}
                y={win.y}
                width={win.width}
                height={win.height}
                zIndex={win.zIndex}
                active={win.zIndex === topZ}
                onFocus={() => focusWindow(win.id)}
                onClose={() => closeWindow(win.id)}
                onRectChange={(rect) => updateWindowRect(win.id, rect)}
              >
                <DocumentJournalListForm
                  journal={journal}
                  documents={documents}
                  catalogs={catalogs}
                  constants={constants}
                  onLog={addLog}
                />
              </MdiWindow>
            );
          }

          if (win.kind === "constants") {
            return (
              <MdiWindow
                key={win.id}
                title="Константы"
                x={win.x}
                y={win.y}
                width={win.width}
                height={win.height}
                zIndex={win.zIndex}
                active={win.zIndex === topZ}
                onFocus={() => focusWindow(win.id)}
                onClose={() => closeWindow(win.id)}
                onRectChange={(rect) => updateWindowRect(win.id, rect)}
              >
                <ConstantsForm />
              </MdiWindow>
            );
          }

          const processor = processors.find((p) => p.id === win.ownerId);
          if (!processor) return null;
          return (
            <MdiWindow
              key={win.id}
              title={`Обработка: ${processor.synonym || processor.name}`}
              x={win.x}
              y={win.y}
              width={win.width}
              height={win.height}
              zIndex={win.zIndex}
              active={win.zIndex === topZ}
              onFocus={() => focusWindow(win.id)}
              onClose={() => closeWindow(win.id)}
              onRectChange={(rect) => updateWindowRect(win.id, rect)}
            >
              <ProcessorRunner
                processor={processor}
                catalogs={catalogs}
                constants={constants}
                onClose={() => closeWindow(win.id)}
                onLog={addLog}
              />
            </MdiWindow>
          );
        })}
      </main>
      <LogPanel entries={logEntries} onClear={() => setLogEntries([])} />
    </div>
  );
}

export default App;
