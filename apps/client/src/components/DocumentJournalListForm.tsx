import { useEffect, useState } from "react";
import {
  deleteDocumentItem,
  fetchDocumentForm,
  fetchJournalItems,
  updateDocumentItem,
  type CatalogFormDto,
  type CatalogRecord,
  type ConstantRecord,
  type DocumentJournalRecord,
  type DocumentRecord,
  type JournalItem,
} from "../api/client";
import DocumentItemDialog from "./DocumentItemDialog";
import DynamicDocumentDialog from "./DynamicDocumentDialog";
import "./DocumentJournalListForm.css";

function DocumentJournalListForm({
  journal,
  documents,
  catalogs,
  constants,
  onLog,
}: {
  journal: DocumentJournalRecord;
  documents: DocumentRecord[];
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  onLog: (text: string) => void;
}) {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<CatalogFormDto | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJournalItems(journal.id)
      .then((data) => {
        setItems(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) =>
        console.error("Не удалось загрузить журнал документов", err),
      )
      .finally(() => setLoading(false));
  }, [journal.id]);

  const removeSelected = () => {
    if (!selectedId) return;
    const id = selectedId;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
    deleteDocumentItem(id).catch((err) =>
      console.error("Не удалось удалить документ", err),
    );
  };

  const openDialog = (item: JournalItem) => {
    setSelectedId(item.id);
    setCustomForm(null);
    fetchDocumentForm(item.documentMetaId)
      .then(setCustomForm)
      .catch((err) => console.error("Не удалось загрузить форму", err));
    setDialogItemId(item.id);
  };

  const dialogItem = items.find((it) => it.id === dialogItemId) ?? null;
  const dialogDocument = dialogItem
    ? documents.find((d) => d.id === dialogItem.documentMetaId)
    : undefined;

  return (
    <div className="document-journal-list-form">
      <div className="document-journal-list-toolbar">
        <button
          type="button"
          title="Изменить"
          disabled={!selectedId}
          onClick={() => {
            const item = items.find((it) => it.id === selectedId);
            if (item) openDialog(item);
          }}
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
        <div className="document-journal-list-empty">Загрузка…</div>
      ) : (
        <div className="document-journal-list-grid">
          <div className="document-journal-list-grid-header">
            <div className="document-journal-list-col-handle" />
            <div className="document-journal-list-col-date">Дата</div>
            <div className="document-journal-list-col-number">Номер</div>
            <div className="document-journal-list-col-type">
              Вид документа
            </div>
          </div>
          <div className="document-journal-list-grid-body">
            {items.map((item) => (
              <div
                key={item.id}
                className={
                  "document-journal-list-row" +
                  (selectedId === item.id
                    ? " document-journal-list-row-selected"
                    : "")
                }
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => openDialog(item)}
              >
                <div className="document-journal-list-col-handle">
                  {selectedId === item.id && (
                    <span className="document-journal-list-icon" />
                  )}
                </div>
                <div className="document-journal-list-col-date">
                  {item.date}
                </div>
                <div className="document-journal-list-col-number">
                  {item.number}
                </div>
                <div className="document-journal-list-col-type">
                  {item.documentName}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="document-journal-list-empty">
                Документов нет
              </div>
            )}
          </div>
        </div>
      )}

      {dialogItem &&
        dialogDocument &&
        (() => {
          const handleClose = () => setDialogItemId(null);

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
          const handleSaveAndClose = (date: string) => {
            handleCommit(date);
            handleClose();
          };

          return customForm ? (
            <DynamicDocumentDialog
              document={dialogDocument}
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
              document={dialogDocument}
              item={dialogItem}
              onSave={handleSaveAndClose}
              onClose={handleClose}
            />
          );
        })()}
    </div>
  );
}

export default DocumentJournalListForm;
