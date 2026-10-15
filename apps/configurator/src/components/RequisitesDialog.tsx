import { useState } from "react";
import "./RequisitesDialog.css";

export interface RequisiteField {
  id: string;
  label: string;
}

function RequisitesDialog({
  fields,
  onInsert,
  onClose,
}: {
  fields: RequisiteField[];
  onInsert: (fieldIds: string[], insertName: boolean) => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(
    fields[0]?.id ?? null,
  );
  const [insertName, setInsertName] = useState(false);
  const [autoPlace, setAutoPlace] = useState(true);
  const [callForNewForms, setCallForNewForms] = useState(true);

  const toggle = (id: string) => {
    setSelectedId(id);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="requisites-dialog-overlay" onClick={onClose}>
      <div className="requisites-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="requisites-dialog-titlebar">
          <span>Размещение реквизитов Справочника</span>
          <button
            type="button"
            className="requisites-dialog-close"
            onClick={onClose}
          >
            {"×"}
          </button>
        </div>
        <div className="requisites-dialog-body">
          <div className="requisites-list-label">Реквизиты</div>
          <div className="requisites-list">
            {fields.map((f) => (
              <div
                key={f.id}
                className={
                  "requisites-row" +
                  (selectedId === f.id ? " requisites-row-selected" : "")
                }
                onClick={() => setSelectedId(f.id)}
              >
                <input
                  type="checkbox"
                  checked={checked.has(f.id)}
                  onChange={() => toggle(f.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                {f.label}
              </div>
            ))}
          </div>

          <label className="requisites-option">
            <input
              type="checkbox"
              checked={insertName}
              onChange={(e) => setInsertName(e.target.checked)}
            />
            Вставлять имя
          </label>
          <label className="requisites-option">
            <input
              type="checkbox"
              checked={autoPlace}
              onChange={(e) => setAutoPlace(e.target.checked)}
            />
            Разместить в диалоге автоматически
          </label>
          <label className="requisites-option">
            <input
              type="checkbox"
              checked={callForNewForms}
              onChange={(e) => setCallForNewForms(e.target.checked)}
            />
            Вызывать для новых форм
          </label>
        </div>
        <div className="requisites-dialog-actions">
          <button
            type="button"
            disabled={checked.size === 0}
            onClick={() => onInsert(Array.from(checked), insertName)}
          >
            Вставить
          </button>
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" disabled title="Справка недоступна">
            Помощь
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequisitesDialog;
