import { useState } from "react";
import type { DocumentDef } from "../state/metadataStore";
import "./JournalMembersDialog.css";

function JournalMembersDialog({
  documents,
  initialMemberIds,
  onSave,
  onClose,
}: {
  documents: DocumentDef[];
  initialMemberIds: string[];
  onSave: (memberIds: string[]) => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialMemberIds),
  );

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="journal-members-dialog-overlay" onClick={onClose}>
      <div
        className="journal-members-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="journal-members-dialog-titlebar">
          <span>Виды документов журнала</span>
          <button
            type="button"
            className="journal-members-dialog-close"
            onClick={onClose}
          >
            {"×"}
          </button>
        </div>
        <div className="journal-members-dialog-body">
          <div className="journal-members-list">
            {documents.length === 0 ? (
              <div className="journal-members-empty">Документов нет</div>
            ) : (
              documents.map((doc) => (
                <label key={doc.id} className="journal-members-row">
                  <input
                    type="checkbox"
                    checked={checked.has(doc.id)}
                    onChange={() => toggle(doc.id)}
                  />
                  {doc.synonym || doc.name}
                </label>
              ))
            )}
          </div>
        </div>
        <div className="journal-members-dialog-actions">
          <button type="button" onClick={() => onSave(Array.from(checked))}>
            ОК
          </button>
          <button type="button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export default JournalMembersDialog;
