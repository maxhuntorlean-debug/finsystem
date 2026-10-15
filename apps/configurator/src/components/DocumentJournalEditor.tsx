import { useEffect, useRef, useState } from "react";
import { useMetadata } from "../state/metadataStore";
import {
  fetchJournalMembers,
  saveJournalMembers,
} from "../api/client";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import JournalMembersDialog from "./JournalMembersDialog";
import "./DocumentJournalEditor.css";

function DocumentJournalEditor({ journalId }: { journalId: string }) {
  const { journals, documents, updateJournal } = useMetadata();
  const journal = journals.find((j) => j.id === journalId);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    nameInputRef.current?.select();
  }, [journalId]);

  useEffect(() => {
    fetchJournalMembers(journalId)
      .then(setMemberIds)
      .catch((err) =>
        console.error("Не удалось загрузить состав журнала", err),
      );
  }, [journalId]);

  if (!journal) {
    return null;
  }

  const memberNames = documents
    .filter((d) => memberIds.includes(d.id))
    .map((d) => d.synonym || d.name);

  const nameDuplicate = findDuplicateIdentifier(
    journal.name,
    journal.id,
    journals,
  );

  return (
    <div className="document-journal-editor">
      <label className="document-journal-editor-row">
        <span>Идентификатор:</span>
        <input
          ref={nameInputRef}
          value={journal.name}
          onChange={(e) =>
            updateJournal(journal.id, {
              name: sanitizeIdentifier(e.target.value),
            })
          }
        />
      </label>
      {nameDuplicate && (
        <p className="document-journal-editor-warning">
          Такой идентификатор уже используется другим журналом
        </p>
      )}
      <label className="document-journal-editor-row">
        <span>Синоним:</span>
        <input
          value={journal.synonym}
          onChange={(e) =>
            updateJournal(journal.id, { synonym: e.target.value })
          }
        />
      </label>
      <label className="document-journal-editor-row">
        <span>Комментарий:</span>
        <input
          value={journal.comment}
          onChange={(e) =>
            updateJournal(journal.id, { comment: e.target.value })
          }
        />
      </label>

      <div className="document-journal-editor-members">
        <div className="document-journal-editor-members-label">
          Виды документов:
        </div>
        <div className="document-journal-editor-members-list">
          {memberNames.length === 0 ? (
            <span className="document-journal-editor-members-empty">
              не выбраны
            </span>
          ) : (
            memberNames.join(", ")
          )}
        </div>
      </div>

      <div className="document-journal-editor-footer">
        <button type="button" onClick={() => setMembersOpen(true)}>
          Виды документов ...
        </button>
      </div>

      {membersOpen && (
        <JournalMembersDialog
          documents={documents}
          initialMemberIds={memberIds}
          onSave={(ids) => {
            setMemberIds(ids);
            setMembersOpen(false);
            saveJournalMembers(journal.id, ids).catch((err) =>
              console.error("Не удалось сохранить состав журнала", err),
            );
          }}
          onClose={() => setMembersOpen(false)}
        />
      )}
    </div>
  );
}

export default DocumentJournalEditor;
