import { useEffect, useRef, useState } from "react";
import { useMetadata } from "../state/metadataStore";
import type { ConstantValueType } from "../api/client";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import "./ConstantEditor.css";

type TabName = "Общие" | "Дополнительно" | "Права" | "Миграция";
const TABS: TabName[] = ["Общие", "Дополнительно", "Права", "Миграция"];
const ENABLED_TABS = new Set<TabName>(["Общие"]);

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

function ConstantEditor({ constantId }: { constantId: string }) {
  const { constants, catalogs, updateConstant } = useMetadata();
  const constant = constants.find((c) => c.id === constantId);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabName>("Общие");

  useEffect(() => {
    nameInputRef.current?.select();
  }, [constantId]);

  if (!constant) {
    return null;
  }

  const selectValue =
    constant.valueType === "reference"
      ? `reference:${constant.referenceCatalogId ?? ""}`
      : constant.valueType;

  const handleTypeChange = (value: string) => {
    if (value.startsWith("reference:")) {
      updateConstant(constant.id, {
        valueType: "reference",
        referenceCatalogId: value.slice("reference:".length),
      });
    } else {
      updateConstant(constant.id, {
        valueType: value as ConstantValueType,
        referenceCatalogId: null,
      });
    }
  };

  const lengthApplicable =
    constant.valueType === "string" || constant.valueType === "number";
  const precisionApplicable = constant.valueType === "number";
  const nameDuplicate = findDuplicateIdentifier(
    constant.name,
    constant.id,
    constants,
  );

  return (
    <div className="constant-editor">
      <div className="constant-editor-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={!ENABLED_TABS.has(t)}
            className={
              "constant-editor-tab" +
              (tab === t ? " constant-editor-tab-active" : "")
            }
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Общие" && (
        <div className="constant-editor-content">
          <div className="constant-editor-fields">
            <label>
              Идентификатор:
              <input
                ref={nameInputRef}
                value={constant.name}
                onChange={(e) =>
                  updateConstant(constant.id, {
                    name: sanitizeIdentifier(e.target.value),
                  })
                }
              />
            </label>
            {nameDuplicate && (
              <p className="constant-editor-warning">
                Такой идентификатор уже используется другой константой
              </p>
            )}
            <label>
              Синоним:
              <input
                value={constant.synonym}
                onChange={(e) =>
                  updateConstant(constant.id, { synonym: e.target.value })
                }
              />
            </label>
            <label>
              Комментарий:
              <input
                value={constant.comment}
                onChange={(e) =>
                  updateConstant(constant.id, { comment: e.target.value })
                }
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
                      <option
                        key={catalog.id}
                        value={`reference:${catalog.id}`}
                      >
                        {`Справочник.${catalog.synonym || catalog.name}`}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            {(lengthApplicable || precisionApplicable) && (
              <div className="constant-editor-row">
                {lengthApplicable && (
                  <label className="constant-editor-length">
                    Длина:
                    <input
                      type="number"
                      min={0}
                      max={250}
                      disabled={constant.valueUnbounded}
                      value={constant.valueLength}
                      onChange={(e) =>
                        updateConstant(constant.id, {
                          valueLength: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                )}
                {constant.valueType === "string" && (
                  <label className="constant-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={constant.valueUnbounded}
                      onChange={(e) =>
                        updateConstant(constant.id, {
                          valueUnbounded: e.target.checked,
                        })
                      }
                    />
                    Неогр.
                  </label>
                )}
                {precisionApplicable && (
                  <label className="constant-editor-length">
                    Точность:
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={constant.valuePrecision}
                      onChange={(e) =>
                        updateConstant(constant.id, {
                          valuePrecision: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConstantEditor;
