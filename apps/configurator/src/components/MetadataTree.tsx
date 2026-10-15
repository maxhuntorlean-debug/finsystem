import { useEffect, useState } from "react";
import { useMetadata } from "../state/metadataStore";
import "./MetadataTree.css";

interface TreeNodeData {
  id: string;
  label: string;
  children?: TreeNodeData[];
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface ContextMenuItem {
  label: string;
  onSelect: () => void;
}

const CATEGORY_DEFS: { id: string; label: string }[] = [
  { id: "constants", label: "Константы" },
  { id: "catalogs", label: "Справочники" },
  { id: "documents", label: "Документы" },
  { id: "document-journals", label: "Журналы документов" },
  { id: "enums", label: "Перечисления" },
  { id: "reports", label: "Отчеты" },
  { id: "data-processors", label: "Обработки" },
  { id: "chart-of-accounts", label: "Планы счетов" },
  { id: "subconto-kinds", label: "Виды субконто" },
  { id: "operation", label: "Операция" },
  { id: "transaction", label: "Проводка" },
  { id: "registers", label: "Регистры" },
  { id: "calc-journals", label: "Журналы расчетов" },
  { id: "calc-kinds", label: "Виды расчетов" },
  { id: "calc-groups", label: "Группы расчетов" },
  { id: "calendars", label: "Календари" },
];

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onContextMenu,
}: {
  node: TreeNodeData;
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
}) {
  const [expanded, setExpanded] = useState(depth <= 1);
  const isBranch = node.children !== undefined;
  const hasVisibleChildren = isBranch && node.children!.length > 0;

  return (
    <div>
      <div
        className={
          "tree-row" + (selectedId === node.id ? " tree-row-selected" : "")
        }
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => onSelect(node.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onSelect(node.id);
          onContextMenu(node.id, e.clientX, e.clientY);
        }}
      >
        {isBranch ? (
          <span
            className="tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? "−" : "+"}
          </span>
        ) : (
          <span className="tree-toggle-spacer" />
        )}
        <span className="tree-icon" />
        <span className="tree-label">{node.label}</span>
      </div>
      {expanded && hasVisibleChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getContextMenuItems(
  nodeId: string,
  actions: {
    addCatalog: () => void;
    openItemForm: (catalogId: string) => void;
    addProcessor: () => void;
    openProcessorForm: (processorId: string) => void;
    addDocument: () => void;
    openDocumentForm: (documentId: string) => void;
    addChart: () => void;
    openChartForm: (chartId: string) => void;
    addJournal: () => void;
    addConstant: () => void;
  },
): ContextMenuItem[] {
  if (nodeId === "constants") {
    return [{ label: "Новая константа", onSelect: actions.addConstant }];
  }
  if (nodeId === "catalogs") {
    return [{ label: "Новый справочник", onSelect: actions.addCatalog }];
  }
  if (nodeId.startsWith("catalog:")) {
    const catalogId = nodeId.slice("catalog:".length);
    return [
      {
        label: "Форма элемента",
        onSelect: () => actions.openItemForm(catalogId),
      },
    ];
  }
  if (nodeId === "data-processors") {
    return [{ label: "Новая обработка", onSelect: actions.addProcessor }];
  }
  if (nodeId.startsWith("processor:")) {
    const processorId = nodeId.slice("processor:".length);
    return [
      {
        label: "Форма",
        onSelect: () => actions.openProcessorForm(processorId),
      },
    ];
  }
  if (nodeId === "documents") {
    return [{ label: "Новый документ", onSelect: actions.addDocument }];
  }
  if (nodeId.startsWith("document:")) {
    const documentId = nodeId.slice("document:".length);
    return [
      {
        label: "Форма документа",
        onSelect: () => actions.openDocumentForm(documentId),
      },
    ];
  }
  if (nodeId === "chart-of-accounts") {
    return [{ label: "Новый план счетов", onSelect: actions.addChart }];
  }
  if (nodeId.startsWith("chart:")) {
    const chartId = nodeId.slice("chart:".length);
    return [
      {
        label: "Форма счёта",
        onSelect: () => actions.openChartForm(chartId),
      },
    ];
  }
  if (nodeId === "document-journals") {
    return [
      { label: "Новый журнал документов", onSelect: actions.addJournal },
    ];
  }
  return [];
}

function MetadataTree() {
  const {
    catalogs,
    processors,
    documents,
    charts,
    journals,
    constants,
    selectedNodeId,
    selectNode,
    addCatalog,
    openItemForm,
    addProcessor,
    openProcessorForm,
    addDocument,
    openDocumentForm,
    addChart,
    openChartForm,
    addJournal,
    addConstant,
  } = useMetadata();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    null,
  );

  useEffect(() => {
    if (!contextMenu) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [contextMenu]);

  const root: TreeNodeData = {
    id: "root",
    label: "Конфигурация",
    children: CATEGORY_DEFS.map((category) => ({
      id: category.id,
      label: category.label,
      children:
        category.id === "constants"
          ? constants.map((constant) => ({
              id: `constant:${constant.id}`,
              label: constant.synonym || constant.name,
            }))
          : category.id === "catalogs"
            ? catalogs.map((catalog) => ({
                id: `catalog:${catalog.id}`,
                label: catalog.synonym || catalog.name,
              }))
            : category.id === "data-processors"
            ? processors.map((processor) => ({
                id: `processor:${processor.id}`,
                label: processor.synonym || processor.name,
              }))
            : category.id === "documents"
              ? documents.map((document) => ({
                  id: `document:${document.id}`,
                  label: document.synonym || document.name,
                }))
              : category.id === "chart-of-accounts"
                ? charts.map((chart) => ({
                    id: `chart:${chart.id}`,
                    label: chart.synonym || chart.name,
                  }))
                : category.id === "document-journals"
                  ? journals.map((journal) => ({
                      id: `journal:${journal.id}`,
                      label: journal.synonym || journal.name,
                    }))
                  : [],
    })),
  };

  const handleContextMenu = (nodeId: string, x: number, y: number) => {
    const items = getContextMenuItems(nodeId, {
      addCatalog,
      openItemForm,
      addProcessor,
      openProcessorForm,
      addDocument,
      openDocumentForm,
      addChart,
      openChartForm,
      addJournal,
      addConstant,
    });
    if (items.length === 0) return;
    setContextMenu({ nodeId, x, y });
  };

  return (
    <div className="metadata-tree">
      <TreeNode
        node={root}
        depth={0}
        selectedId={selectedNodeId}
        onSelect={selectNode}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <>
          <div
            className="tree-context-menu-overlay"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="tree-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {getContextMenuItems(contextMenu.nodeId, {
              addCatalog,
              openItemForm,
              addProcessor,
              openProcessorForm,
              addDocument,
              openDocumentForm,
              addChart,
              openChartForm,
              addJournal,
              addConstant,
            }).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onSelect();
                  setContextMenu(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MetadataTree;
