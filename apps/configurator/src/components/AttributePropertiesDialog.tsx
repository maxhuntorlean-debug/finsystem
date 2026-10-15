import { useState } from "react";
import type { CatalogAttribute, CatalogDef } from "../state/metadataStore";
import type { ConstantValueType } from "../api/client";
import { sanitizeIdentifier } from "../utils/identifiers";
import "./AttributePropertiesDialog.css";

const BASE_TYPE_LABELS: Record<
  Exclude<ConstantValueType, "reference">,
  string
> = {
  undefined: "Неопределенный",
  number: "Число",
  string: "Строка",
  boolean: "Булево",
  date: "Дата",
};

type AttributePatch = Partial<
  Omit<CatalogAttribute, "id" | "catalogId" | "sortOrder">
>;

function AttributePropertiesDialog({
  attribute,
  catalogs,
  siblingIdentifiers,
  onSave,
  onClose,
}: {
  attribute: CatalogAttribute;
  catalogs: CatalogDef[];
  siblingIdentifiers: string[];
  onSave: (patch: AttributePatch) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CatalogAttribute>(attribute);

  const patch = (fields: AttributePatch) =>
    setDraft((prev) => ({ ...prev, ...fields }));

  const identifierDuplicate = siblingIdentifiers.some(
    (id) => id.trim().toLowerCase() === draft.name.trim().toLowerCase(),
  );

  const selectValue =
    draft.valueType === "reference"
      ? `reference:${draft.referenceCatalogId ?? ""}`
      : draft.valueType;

  const handleTypeChange = (value: string) => {
    if (value.startsWith("reference:")) {
      patch({
        valueType: "reference",
        referenceCatalogId: value.slice("reference:".length),
      });
    } else {
      patch({
        valueType: value as ConstantValueType,
        referenceCatalogId: null,
      });
    }
  };

  const lengthApplicable =
    draft.valueType === "string" || draft.valueType === "number";
  const unboundedApplicable = draft.valueType === "string";
  const precisionApplicable = draft.valueType === "number";

  const handleOk = () => {
    onSave({
      name: draft.name,
      synonym: draft.synonym,
      comment: draft.comment,
      valueType: draft.valueType,
      referenceCatalogId: draft.referenceCatalogId,
      valueLength: draft.valueLength,
      valueUnbounded: draft.valueUnbounded,
      valuePrecision: draft.valuePrecision,
    });
    onClose();
  };

  return (
    <div className="attr-props">
      <div className="attr-props-content">
        <div className="attr-props-fields">
          <label>
            Идентификатор:
            <input
              value={draft.name}
              onChange={(e) =>
                patch({ name: sanitizeIdentifier(e.target.value) })
              }
            />
          </label>
          {identifierDuplicate && (
            <p className="attr-props-hint attr-props-warning">
              Такой идентификатор уже используется другим реквизитом
            </p>
          )}
          <label>
            Синоним:
            <input
              value={draft.synonym}
              onChange={(e) => patch({ synonym: e.target.value })}
            />
          </label>
          <label>
            Комментарий:
            <input
              value={draft.comment}
              onChange={(e) => patch({ comment: e.target.value })}
            />
          </label>
          <label>
            Тип значения:
            <select
              value={selectValue}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {(
                Object.keys(BASE_TYPE_LABELS) as Array<
                  keyof typeof BASE_TYPE_LABELS
                >
              ).map((type) => (
                <option key={type} value={type}>
                  {`<<${BASE_TYPE_LABELS[type]}>>`}
                </option>
              ))}
              {catalogs.length > 0 && (
                <optgroup label="Справочник">
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={`reference:${catalog.id}`}>
                      {`Справочник.${catalog.synonym || catalog.name}`}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <div className="attr-props-row">
            <label className="attr-props-length">
              Длина:
              <input
                type="number"
                min={0}
                max={250}
                disabled={!lengthApplicable || draft.valueUnbounded}
                value={draft.valueLength}
                onChange={(e) =>
                  patch({ valueLength: Number(e.target.value) })
                }
              />
            </label>
            <label
              className={
                "attr-props-checkbox" +
                (unboundedApplicable ? "" : " attr-props-checkbox-disabled")
              }
            >
              <input
                type="checkbox"
                disabled={!unboundedApplicable}
                checked={draft.valueUnbounded}
                onChange={(e) => patch({ valueUnbounded: e.target.checked })}
              />
              Неогр.
            </label>
            <label className="attr-props-length">
              Точность:
              <input
                type="number"
                min={0}
                max={10}
                disabled={!precisionApplicable}
                value={draft.valuePrecision}
                onChange={(e) =>
                  patch({ valuePrecision: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </div>

        <div className="attr-props-actions">
          <button type="button" onClick={handleOk}>
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

export default AttributePropertiesDialog;
