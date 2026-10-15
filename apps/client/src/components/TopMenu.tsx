import { useState } from "react";
import type {
  CatalogRecord,
  ChartRecord,
  DocumentJournalRecord,
  DocumentRecord,
  ProcessorRecord,
} from "../api/client";
import "./TopMenu.css";

type MenuKey =
  | "catalogs"
  | "processors"
  | "documents"
  | "charts"
  | "journals";

function TopMenuItem({
  label,
  isOpen,
  onToggle,
  items,
  emptyLabel,
  onSelect,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  items: { id: string; name: string; synonym: string }[];
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="top-menu-item">
      <button type="button" className="top-menu-button" onClick={onToggle}>
        {label}
      </button>
      {isOpen && (
        <>
          <div className="top-menu-overlay" onClick={onToggle} />
          <div className="top-menu-dropdown">
            {items.length === 0 ? (
              <div className="top-menu-empty">{emptyLabel}</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="top-menu-dropdown-item"
                  onClick={() => onSelect(item.id)}
                >
                  {item.synonym || item.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TopMenu({
  catalogs,
  processors,
  documents,
  charts,
  journals,
  onSelectCatalog,
  onSelectProcessor,
  onSelectDocument,
  onSelectChart,
  onSelectJournal,
  onOpenConstants,
}: {
  catalogs: CatalogRecord[];
  processors: ProcessorRecord[];
  documents: DocumentRecord[];
  charts: ChartRecord[];
  journals: DocumentJournalRecord[];
  onSelectCatalog: (catalogId: string) => void;
  onSelectProcessor: (processorId: string) => void;
  onSelectDocument: (documentId: string) => void;
  onSelectChart: (chartId: string) => void;
  onSelectJournal: (journalId: string) => void;
  onOpenConstants: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  const toggle = (key: MenuKey) =>
    setOpenMenu((v) => (v === key ? null : key));

  return (
    <nav className="top-menu">
      <div className="top-menu-item">
        <button
          type="button"
          className="top-menu-button"
          onClick={onOpenConstants}
        >
          Константы
        </button>
      </div>
      <TopMenuItem
        label="Справочники"
        isOpen={openMenu === "catalogs"}
        onToggle={() => toggle("catalogs")}
        items={catalogs}
        emptyLabel="Справочников нет"
        onSelect={(id) => {
          onSelectCatalog(id);
          setOpenMenu(null);
        }}
      />
      <TopMenuItem
        label="Документы"
        isOpen={openMenu === "documents"}
        onToggle={() => toggle("documents")}
        items={documents}
        emptyLabel="Документов нет"
        onSelect={(id) => {
          onSelectDocument(id);
          setOpenMenu(null);
        }}
      />
      <TopMenuItem
        label="Журналы документов"
        isOpen={openMenu === "journals"}
        onToggle={() => toggle("journals")}
        items={journals}
        emptyLabel="Журналов нет"
        onSelect={(id) => {
          onSelectJournal(id);
          setOpenMenu(null);
        }}
      />
      <TopMenuItem
        label="Планы счетов"
        isOpen={openMenu === "charts"}
        onToggle={() => toggle("charts")}
        items={charts}
        emptyLabel="Планов счетов нет"
        onSelect={(id) => {
          onSelectChart(id);
          setOpenMenu(null);
        }}
      />
      <TopMenuItem
        label="Обработки"
        isOpen={openMenu === "processors"}
        onToggle={() => toggle("processors")}
        items={processors}
        emptyLabel="Обработок нет"
        onSelect={(id) => {
          onSelectProcessor(id);
          setOpenMenu(null);
        }}
      />
    </nav>
  );
}

export default TopMenu;
