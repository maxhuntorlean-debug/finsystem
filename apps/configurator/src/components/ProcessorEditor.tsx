import { useEffect, useRef } from "react";
import { useMetadata } from "../state/metadataStore";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import "./ProcessorEditor.css";

function ProcessorEditor({ processorId }: { processorId: string }) {
  const { processors, updateProcessor, openProcessorForm } = useMetadata();
  const processor = processors.find((p) => p.id === processorId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.select();
  }, [processorId]);

  if (!processor) {
    return null;
  }

  const nameDuplicate = findDuplicateIdentifier(
    processor.name,
    processor.id,
    processors,
  );

  return (
    <div className="processor-editor">
      <label className="processor-editor-row">
        <span>Идентификатор:</span>
        <input
          ref={nameInputRef}
          value={processor.name}
          onChange={(e) =>
            updateProcessor(processor.id, {
              name: sanitizeIdentifier(e.target.value),
            })
          }
        />
      </label>
      {nameDuplicate && (
        <p className="processor-editor-warning">
          Такой идентификатор уже используется другой обработкой
        </p>
      )}
      <label className="processor-editor-row">
        <span>Синоним:</span>
        <input
          value={processor.synonym}
          onChange={(e) =>
            updateProcessor(processor.id, { synonym: e.target.value })
          }
        />
      </label>
      <label className="processor-editor-row">
        <span>Комментарий:</span>
        <input
          value={processor.comment}
          onChange={(e) =>
            updateProcessor(processor.id, { comment: e.target.value })
          }
        />
      </label>

      <div className="processor-editor-footer">
        <button
          type="button"
          onClick={() => openProcessorForm(processor.id)}
        >
          Форма
        </button>
      </div>
    </div>
  );
}

export default ProcessorEditor;
