import { useState, type KeyboardEvent } from "react";
import type { DocumentItem, DocumentRecord } from "../api/client";
import "./DocumentItemDialog.css";

function DocumentItemDialog({
  document,
  item,
  onSave,
  onClose,
}: {
  document: DocumentRecord;
  item: DocumentItem;
  onSave: (date: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(item.date);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(date);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="document-item-dialog-overlay" onClick={onClose}>
      <div
        className="document-item-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="document-item-dialog-titlebar">
          Документ: {document.synonym || document.name}
        </div>
        <div className="document-item-dialog-body">
          <label>
            Номер
            <input value={item.number} readOnly disabled />
          </label>
          <label>
            Дата
            <input
              autoFocus
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
        </div>
        <div className="document-item-dialog-actions">
          <button type="button" onClick={() => onSave(date)}>
            ОК
          </button>
          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentItemDialog;
