import { useEffect, useRef } from "react";
import { useMetadata } from "../state/metadataStore";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import "./DocumentEditor.css";

function DocumentEditor({ documentId }: { documentId: string }) {
  const { documents, updateDocument, openDocumentForm } = useMetadata();
  const document = documents.find((d) => d.id === documentId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.select();
  }, [documentId]);

  if (!document) {
    return null;
  }

  const nameDuplicate = findDuplicateIdentifier(
    document.name,
    document.id,
    documents,
  );

  return (
    <div className="document-editor">
      <label className="document-editor-row">
        <span>Идентификатор:</span>
        <input
          ref={nameInputRef}
          value={document.name}
          onChange={(e) =>
            updateDocument(document.id, {
              name: sanitizeIdentifier(e.target.value),
            })
          }
        />
      </label>
      {nameDuplicate && (
        <p className="document-editor-warning">
          Такой идентификатор уже используется другим документом
        </p>
      )}
      <label className="document-editor-row">
        <span>Синоним:</span>
        <input
          value={document.synonym}
          onChange={(e) =>
            updateDocument(document.id, { synonym: e.target.value })
          }
        />
      </label>
      <label className="document-editor-row">
        <span>Комментарий:</span>
        <input
          value={document.comment}
          onChange={(e) =>
            updateDocument(document.id, { comment: e.target.value })
          }
        />
      </label>
      <label className="document-editor-row document-editor-row-narrow">
        <span>Длина номера:</span>
        <input
          type="number"
          min={1}
          max={25}
          value={document.numberLength}
          onChange={(e) =>
            updateDocument(document.id, {
              numberLength: Number(e.target.value),
            })
          }
        />
      </label>

      <div className="document-editor-footer">
        <button type="button" onClick={() => openDocumentForm(document.id)}>
          Форма документа
        </button>
      </div>
    </div>
  );
}

export default DocumentEditor;
