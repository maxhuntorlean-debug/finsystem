import { useEffect, useRef, useState } from "react";
import {
  fetchCatalogItemValues,
  fetchCatalogItems,
  updateCatalogItemValue,
  type CatalogAttributeRecord,
  type CatalogFormDto,
  type CatalogItem,
  type CatalogRecord,
  type ConstantRecord,
  type FormControlDto,
} from "../api/client";
import {
  buildCatalogsAccess,
  formatLogArg,
  useConstantsAccess,
  useElementsOverrides,
} from "../utils/moduleContext";
import "./DynamicItemDialog.css";

function DynamicItemDialog({
  catalog,
  catalogs,
  constants,
  attributes,
  item,
  form,
  onCommit,
  onClose,
  onLog,
  onPickFromCatalog,
}: {
  catalog: CatalogRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  attributes: CatalogAttributeRecord[];
  item: CatalogItem;
  form: CatalogFormDto;
  onCommit: (name: string) => void;
  onClose: () => void;
  onLog: (text: string) => void;
  onPickFromCatalog?: (
    catalogId: string,
    onPick: (item: CatalogItem) => void,
  ) => void;
}) {
  const [name, setName] = useState(item.name);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [refNames, setRefNames] = useState<Record<string, string>>({});
  const attrUpdateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const loadedRefCatalogs = useRef<Set<string>>(new Set());
  const { overrides, elements } = useElementsOverrides(form.controls);
  const constantsContext = useConstantsAccess(constants);
  const catalogsContext = buildCatalogsAccess(catalogs);

  useEffect(() => {
    fetchCatalogItemValues(item.id)
      .then(setAttrValues)
      .catch((err) =>
        console.error("Не удалось загрузить значения реквизитов", err),
      );
  }, [item.id]);

  const ensureRefCatalogLoaded = (catalogId: string) => {
    if (loadedRefCatalogs.current.has(catalogId)) return;
    loadedRefCatalogs.current.add(catalogId);
    fetchCatalogItems(catalogId)
      .then((refItems) => {
        setRefNames((prev) => {
          const next = { ...prev };
          for (const it of refItems) next[it.id] = it.name;
          return next;
        });
      })
      .catch((err) => {
        loadedRefCatalogs.current.delete(catalogId);
        console.error("Не удалось загрузить справочник", err);
      });
  };

  useEffect(() => {
    attributes.forEach((attr) => {
      if (
        attr.valueType === "reference" &&
        attr.referenceCatalogId &&
        attrValues[attr.id]
      ) {
        ensureRefCatalogLoaded(attr.referenceCatalogId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, attrValues]);

  const setAttrValue = (attributeId: string, value: string) => {
    setAttrValues((prev) => ({ ...prev, [attributeId]: value }));
    const existing = attrUpdateTimers.current.get(attributeId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      attrUpdateTimers.current.delete(attributeId);
      updateCatalogItemValue(item.id, attributeId, value).catch((err) =>
        console.error("Не удалось сохранить реквизит", err),
      );
    }, 500);
    attrUpdateTimers.current.set(attributeId, timer);
  };

  // Legacy formulas were a bare token list ("save close"), not valid JS.
  // Buttons saved before the switch to JS-style formulas still use this.
  const runLegacyTokens = (formula: string) => {
    formula
      .split(/[\s;,]+/)
      .filter(Boolean)
      .forEach((token) => {
        const normalized = token.trim().toLowerCase().replace(/\(\)$/, "");
        if (normalized === "save") onCommit(name);
        else if (normalized === "close") onClose();
      });
  };

  const runFormula = (formula: string) => {
    const context = {
      save: () => onCommit(name),
      close: () => onClose(),
      log: (...args: unknown[]) => onLog(args.map(formatLogArg).join(" ")),
      elements,
      catalogs: catalogsContext,
      constants: constantsContext,
    };
    const handleError = (err: unknown) => {
      console.error("Ошибка выполнения формулы", err);
      const message = err instanceof Error ? err.message : String(err);
      onLog(`Ошибка в формуле «${formula}»: ${message}`);
      window.alert(`Ошибка в формуле «${formula}»: ${message}`);
    };
    try {
      const fn = new Function(
        ...Object.keys(context),
        `${form.module || ""}\n;return (async function(){ ${formula} })();`,
      );
      Promise.resolve(fn(...Object.values(context))).catch(handleError);
    } catch (err) {
      if (err instanceof SyntaxError) {
        runLegacyTokens(formula);
      } else {
        handleError(err);
      }
    }
  };

  const handleButtonClick = (control: FormControlDto) => {
    if (control.formula && control.formula.trim()) {
      runFormula(control.formula);
      return;
    }

    // Legacy buttons saved before the formula field existed: infer the
    // action from the caption text ("OK"/"Закрыть").
    const normalized = control.caption.trim().toLowerCase();
    if (normalized === "ok" || normalized === "ок") {
      onCommit(name);
      onClose();
    } else if (normalized === "закрыть" || normalized === "отмена") {
      onClose();
    }
  };

  return (
    <div className="dynamic-dialog-overlay" onClick={onClose}>
      <div
        className="dynamic-form"
        style={{ width: form.width, height: form.height }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dynamic-form-titlebar">
          <span className="dynamic-form-icon" />
          <span className="dynamic-form-title">
            Справочник: {catalog.synonym || catalog.name}
          </span>
          <span className="dynamic-form-controls">
            <span className="dynamic-form-titlebtn">_</span>
            <span className="dynamic-form-titlebtn">□</span>
            <button
              type="button"
              className="dynamic-form-titlebtn dynamic-form-titlebtn-close"
              onClick={onClose}
            >
              {"×"}
            </button>
          </span>
        </div>
        <div className="dynamic-form-body">
          {form.controls
            .filter((control) => !control.hidden)
            .map((control) => {
              const style = {
                left: control.x,
                top: control.y,
                width: control.width,
                height: control.height,
              };

              const caption = overrides[control.id]?.caption ?? control.caption;
              const color = overrides[control.id]?.color;
              const background = overrides[control.id]?.background;
              const coloredStyle = {
                ...style,
                ...(color ? { color } : {}),
                ...(background ? { backgroundColor: background } : {}),
              };

              if (control.type === "label") {
                return (
                  <span
                    key={control.id}
                    className="dynamic-form-label"
                    style={coloredStyle}
                  >
                    {caption}
                  </span>
                );
              }

              if (control.type === "button") {
                return (
                  <button
                    key={control.id}
                    type="button"
                    className="dynamic-form-button"
                    style={coloredStyle}
                    disabled={control.disabled}
                    onClick={() => handleButtonClick(control)}
                  >
                    {caption}
                  </button>
                );
              }

              if (control.fieldId === "code") {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-input"
                    style={style}
                    value={item.code}
                    readOnly
                    disabled
                  />
                );
              }

              if (control.fieldId === "name") {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-input"
                    style={style}
                    value={name}
                    maxLength={catalog.nameLength}
                    readOnly={control.readOnly}
                    disabled={control.disabled}
                    onChange={(e) => setName(e.target.value)}
                  />
                );
              }

              const attribute = attributes.find(
                (a) => a.id === control.fieldId,
              );
              if (!attribute) {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-input"
                    style={style}
                    value=""
                    disabled
                    placeholder={caption}
                  />
                );
              }

              const attrValue = attrValues[attribute.id] ?? "";

              if (attribute.valueType === "undefined") {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-input"
                    style={style}
                    value=""
                    disabled
                    placeholder="Тип не определён"
                  />
                );
              }

              if (attribute.valueType === "reference") {
                const displayName = attrValue
                  ? (refNames[attrValue] ?? "…")
                  : "";
                const pickable =
                  !control.disabled &&
                  !!attribute.referenceCatalogId &&
                  !!onPickFromCatalog;
                const openPicker = () => {
                  if (!pickable || !attribute.referenceCatalogId) return;
                  onPickFromCatalog!(
                    attribute.referenceCatalogId,
                    (pickedItem) => {
                      setAttrValue(attribute.id, pickedItem.id);
                      setRefNames((prev) => ({
                        ...prev,
                        [pickedItem.id]: pickedItem.name,
                      }));
                    },
                  );
                };
                return (
                  <div
                    key={control.id}
                    className={
                      "dynamic-form-refinput" +
                      (control.disabled ? " dynamic-form-refinput-disabled" : "")
                    }
                    style={style}
                  >
                    <input
                      className="dynamic-form-refinput-text"
                      value={displayName}
                      readOnly
                      disabled={control.disabled}
                      onClick={openPicker}
                    />
                    <button
                      type="button"
                      className="dynamic-form-refinput-btn"
                      disabled={!pickable}
                      onClick={openPicker}
                    >
                      {"…"}
                    </button>
                  </div>
                );
              }

              if (attribute.valueType === "boolean") {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-checkbox"
                    style={style}
                    type="checkbox"
                    checked={attrValue === "true"}
                    readOnly={control.readOnly}
                    disabled={control.disabled}
                    onChange={(e) =>
                      setAttrValue(
                        attribute.id,
                        e.target.checked ? "true" : "false",
                      )
                    }
                  />
                );
              }

              return (
                <input
                  key={control.id}
                  className="dynamic-form-input"
                  style={style}
                  type={
                    attribute.valueType === "number"
                      ? "number"
                      : attribute.valueType === "date"
                        ? "date"
                        : "text"
                  }
                  step={
                    attribute.valueType === "number" &&
                    attribute.valuePrecision > 0
                      ? 1 / 10 ** attribute.valuePrecision
                      : undefined
                  }
                  maxLength={
                    attribute.valueType === "string" &&
                    !attribute.valueUnbounded
                      ? attribute.valueLength
                      : undefined
                  }
                  value={attrValue}
                  readOnly={control.readOnly}
                  disabled={control.disabled}
                  onChange={(e) => setAttrValue(attribute.id, e.target.value)}
                  onBlur={(e) => {
                    if (
                      attribute.valueType === "number" &&
                      attribute.valuePrecision > 0 &&
                      e.target.value !== ""
                    ) {
                      setAttrValue(
                        attribute.id,
                        Number(e.target.value).toFixed(
                          attribute.valuePrecision,
                        ),
                      );
                    }
                  }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default DynamicItemDialog;
