import { useEffect, useState } from "react";
import {
  createDocumentItem,
  deleteDocumentItem,
  fetchDocumentForm,
  fetchDocumentItems,
  updateDocumentItem,
  type CatalogFormDto,
  type CatalogRecord,
  type ConstantRecord,
  type DocumentItem,
  type DocumentRecord,
} from "../api/client";
import DocumentItemDialog from "./DocumentItemDialog";
import DynamicDocumentDialog from "./DynamicDocumentDialog";
import "./DocumentJournalForm.css";

function DocumentJournalForm({
  document,
  catalogs,
  constants,
  onLog,
}: {
  document: DocumentRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  onLog: (text: string) => void;
}) {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<CatalogFormDto | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDocumentItems(document.id)
      .then((data) => {
        setItems(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) => console.error("Не удалось загрузить документы", err))
      .finally(() => setLoading(false));
  }, [document.id]);

  const refreshCustomForm = () => {
    fetchDocumentForm(document.id)
      .then(setCustomForm)
      .catch((err) => console.error("Не удалось загрузить форму", err));
  };

  useEffect(() => {
    refreshCustomForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.id]);

  const addItem = () => {
    createDocumentItem(document.id)
      .then((item) => {
        setItems((prev) => [...prev, item]);
        setSelectedId(item.id);
        refreshCustomForm();
        setDialogItemId(item.id);
      })
      .catch((err) => console.error("Не удалось создать документ", err));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const id = selectedId;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
    deleteDocumentItem(id).catch((err) =>
      console.error("Не удалось удалить документ", err),
    );
  };

  const openDialog = (id: string) => {
    setSelectedId(id);
    refreshCustomForm();
    setDialogItemId(id);
  };

  const dialogItem = items.find((it) => it.id === dialogItemId) ?? null;

  return (
    <div className="document-journal-form">
      <div className="document-journal-toolbar">
        <button type="button" title="Новый" onClick={addItem}>
          {"➕"}
        </button>
        <button
          type="button"
          title="Изменить"
          disabled={!selectedId}
          onClick={() => selectedId && openDialog(selectedId)}
        >
          {"✎"}
        </button>
        <button
          type="button"
          title="Удалить"
          disabled={!selectedId}
          onClick={removeSelected}
        >
          {"✖"}
        </button>
      </div>

      {loading ? (
        <div className="document-journal-empty">Загрузка…</div>
      ) : (
        <div className="document-journal-grid">
          <div className="document-journal-grid-header">
            <div className="document-journal-col-handle" />
            <div className="document-journal-col-date">Дата</div>
            <div className="document-journal-col-number">Номер</div>
          </div>
          <div className="document-journal-grid-body">
            {items.map((item) => (
              <div
                key={item.id}
                className={
                  "document-journal-row" +
                  (selectedId === item.id
                    ? " document-journal-row-selected"
                    : "")
                }
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => openDialog(item.id)}
              >
                <div className="document-journal-col-handle">
                  {selectedId === item.id && (
                    <span className="document-journal-icon" />
                  )}
                </div>
                <div className="document-journal-col-date">{item.date}</div>
                <div className="document-journal-col-number">
                  {item.number}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="document-journal-empty">Документов нет</div>
            )}
          </div>
        </div>
      )}

      {dialogItem &&
        (() => {
          const handleCommit = (date: string) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === dialogItem.id ? { ...it, date } : it,
              ),
            );
            updateDocumentItem(dialogItem.id, { date }).catch((err) =>
              console.error("Не удалось сохранить документ", err),
            );
          };
          const handleClose = () => setDialogItemId(null);
          const handleSaveAndClose = (date: string) => {
            handleCommit(date);
            handleClose();
          };

          return customForm ? (
            <DynamicDocumentDialog
              document={document}
              catalogs={catalogs}
              constants={constants}
              item={dialogItem}
              form={customForm}
              onCommit={handleCommit}
              onClose={handleClose}
              onLog={onLog}
            />
          ) : (
            <DocumentItemDialog
              document={document}
              item={dialogItem}
              onSave={handleSaveAndClose}
              onClose={handleClose}
            />
          );
        })()}
    </div>
  );
}

export default DocumentJournalForm;
