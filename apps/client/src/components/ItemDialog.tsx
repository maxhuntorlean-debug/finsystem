import { useState, type KeyboardEvent } from "react";
import type { CatalogItem, CatalogRecord } from "../api/client";
import "./ItemDialog.css";

function ItemDialog({
  catalog,
  item,
  onSave,
  onClose,
}: {
  catalog: CatalogRecord;
  item: CatalogItem;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(name);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="item-dialog-overlay" onClick={onClose}>
      <div className="item-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="item-dialog-titlebar">
          <span className="item-dialog-icon" />
          <span className="item-dialog-title">
            Справочник: {catalog.synonym || catalog.name}
          </span>
          <span className="item-dialog-controls">
            <span className="item-dialog-btn">_</span>
            <span className="item-dialog-btn">□</span>
            <button
              type="button"
              className="item-dialog-btn item-dialog-btn-close"
              onClick={onClose}
            >
              {"×"}
            </button>
          </span>
        </div>
        <div className="item-dialog-body">
          <label>
            Код
            <input value={item.code} readOnly disabled />
          </label>
          <label>
            Наименование
            <input
              autoFocus
              value={name}
              maxLength={catalog.nameLength}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
        </div>
        <div className="item-dialog-actions">
          <button type="button" onClick={() => onSave(name)}>
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

export default ItemDialog;
