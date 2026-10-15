import { useEffect } from "react";
import { useMetadata } from "../state/metadataStore";
import {
  fetchCatalogForm,
  fetchChartForm,
  fetchDocumentForm,
  fetchProcessorForm,
  saveCatalogForm,
  saveChartForm,
  saveDocumentForm,
  saveProcessorForm,
} from "../api/client";
import type { RequisiteField } from "./RequisitesDialog";
import MdiWindow from "./MdiWindow";
import CatalogEditor from "./CatalogEditor";
import ProcessorEditor from "./ProcessorEditor";
import DocumentEditor from "./DocumentEditor";
import ChartEditor from "./ChartEditor";
import DocumentJournalEditor from "./DocumentJournalEditor";
import ConstantEditor from "./ConstantEditor";
import AttributePropertiesDialog from "./AttributePropertiesDialog";
import FormCanvas from "./FormCanvas";

const DOCUMENT_REQUISITE_FIELDS: RequisiteField[] = [
  { id: "number", label: "Номер" },
  { id: "date", label: "Дата" },
];

const ACCOUNT_REQUISITE_FIELDS: RequisiteField[] = [
  { id: "code", label: "Код" },
  { id: "name", label: "Наименование" },
];

function WindowsHost() {
  const {
    openWindows,
    catalogs,
    processors,
    documents,
    charts,
    journals,
    constants,
    catalogAttributes,
    ensureCatalogAttributes,
    updateCatalogAttribute,
    closeWindow,
    focusWindow,
    updateWindowRect,
  } = useMetadata();

  const topZ = openWindows.reduce((max, w) => Math.max(max, w.zIndex), -1);

  useEffect(() => {
    for (const win of openWindows) {
      if (win.kind === "item-form") {
        ensureCatalogAttributes(win.ownerId);
      }
    }
  }, [openWindows, ensureCatalogAttributes]);

  return (
    <>
      {openWindows.map((win) => {
        const catalog = catalogs.find((c) => c.id === win.ownerId);
        const processor = processors.find((p) => p.id === win.ownerId);
        const document = documents.find((d) => d.id === win.ownerId);
        const chart = charts.find((c) => c.id === win.ownerId);
        const journal = journals.find((j) => j.id === win.ownerId);
        const constant = constants.find((c) => c.id === win.ownerId);
        const attribute =
          win.kind === "attribute-editor"
            ? Object.values(catalogAttributes)
                .flat()
                .find((a) => a.id === win.ownerId)
            : undefined;

        let title = "";
        if (win.kind === "item-form") {
          title = `Форма элемента-Справочник.${catalog?.name ?? ""}`;
        } else if (win.kind === "catalog-editor") {
          title = `Справочник: ${catalog?.name ?? ""}`;
        } else if (win.kind === "processor-form") {
          title = `Форма-Обработка.${processor?.name ?? ""}`;
        } else if (win.kind === "processor-editor") {
          title = `Обработка: ${processor?.name ?? ""}`;
        } else if (win.kind === "document-form") {
          title = `Форма документа-Документ.${document?.name ?? ""}`;
        } else if (win.kind === "document-editor") {
          title = `Документ: ${document?.name ?? ""}`;
        } else if (win.kind === "chart-form") {
          title = `Форма счёта-ПланСчетов.${chart?.name ?? ""}`;
        } else if (win.kind === "chart-editor") {
          title = `План счетов: ${chart?.name ?? ""}`;
        } else if (win.kind === "journal-editor") {
          title = `Журнал документов: ${journal?.name ?? ""}`;
        } else if (win.kind === "attribute-editor") {
          title = "Свойства Реквизита";
        } else {
          title = `Константа: ${constant?.name ?? ""}`;
        }

        const requisiteFields: RequisiteField[] = [
          { id: "code", label: "Код" },
          { id: "name", label: "Наименование" },
          ...(catalog
            ? (catalogAttributes[catalog.id] ?? []).map((a) => ({
                id: a.id,
                label: a.name,
              }))
            : []),
        ];

        return (
          <MdiWindow
            key={win.id}
            title={title}
            x={win.x}
            y={win.y}
            width={win.width}
            height={win.height}
            zIndex={win.zIndex}
            active={win.zIndex === topZ}
            resizable={win.kind !== "attribute-editor"}
            onFocus={() => focusWindow(win.id)}
            onClose={() => closeWindow(win.id)}
            onRectChange={(rect) => updateWindowRect(win.id, rect)}
          >
            {win.kind === "item-form" && (
              <FormCanvas
                ownerId={win.ownerId}
                fetchForm={fetchCatalogForm}
                saveForm={saveCatalogForm}
                requisiteFields={requisiteFields}
              />
            )}
            {win.kind === "processor-form" && (
              <FormCanvas
                ownerId={win.ownerId}
                fetchForm={fetchProcessorForm}
                saveForm={saveProcessorForm}
              />
            )}
            {win.kind === "document-form" && (
              <FormCanvas
                ownerId={win.ownerId}
                fetchForm={fetchDocumentForm}
                saveForm={saveDocumentForm}
                requisiteFields={DOCUMENT_REQUISITE_FIELDS}
              />
            )}
            {win.kind === "chart-form" && (
              <FormCanvas
                ownerId={win.ownerId}
                fetchForm={fetchChartForm}
                saveForm={saveChartForm}
                requisiteFields={ACCOUNT_REQUISITE_FIELDS}
              />
            )}
            {win.kind === "catalog-editor" && (
              <CatalogEditor catalogId={win.ownerId} />
            )}
            {win.kind === "processor-editor" && (
              <ProcessorEditor processorId={win.ownerId} />
            )}
            {win.kind === "document-editor" && (
              <DocumentEditor documentId={win.ownerId} />
            )}
            {win.kind === "chart-editor" && (
              <ChartEditor chartId={win.ownerId} />
            )}
            {win.kind === "journal-editor" && (
              <DocumentJournalEditor journalId={win.ownerId} />
            )}
            {win.kind === "constant-editor" && (
              <ConstantEditor constantId={win.ownerId} />
            )}
            {win.kind === "attribute-editor" && attribute && (
              <AttributePropertiesDialog
                attribute={attribute}
                catalogs={catalogs}
                siblingIdentifiers={(catalogAttributes[attribute.catalogId] ?? [])
                  .filter((a) => a.id !== attribute.id)
                  .map((a) => a.name)}
                onSave={(patch) =>
                  updateCatalogAttribute(attribute.catalogId, attribute.id, patch)
                }
                onClose={() => closeWindow(win.id)}
              />
            )}
          </MdiWindow>
        );
      })}
    </>
  );
}

export default WindowsHost;
