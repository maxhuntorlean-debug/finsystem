import { useState } from "react";
import type {
  CatalogFormDto,
  CatalogRecord,
  ConstantRecord,
  DocumentItem,
  DocumentRecord,
  FormControlDto,
} from "../api/client";
import {
  buildCatalogsAccess,
  formatLogArg,
  useConstantsAccess,
  useElementsOverrides,
} from "../utils/moduleContext";
import "./DynamicItemDialog.css";

function DynamicDocumentDialog({
  document,
  catalogs,
  constants,
  item,
  form,
  onCommit,
  onClose,
  onLog,
}: {
  document: DocumentRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  item: DocumentItem;
  form: CatalogFormDto;
  onCommit: (date: string) => void;
  onClose: () => void;
  onLog: (text: string) => void;
}) {
  const [date, setDate] = useState(item.date);
  const { overrides, elements } = useElementsOverrides(form.controls);
  const constantsContext = useConstantsAccess(constants);
  const catalogsContext = buildCatalogsAccess(catalogs);

  const runLegacyTokens = (formula: string) => {
    formula
      .split(/[\s;,]+/)
      .filter(Boolean)
      .forEach((token) => {
        const normalized = token.trim().toLowerCase().replace(/\(\)$/, "");
        if (normalized === "save") onCommit(date);
        else if (normalized === "close") onClose();
      });
  };

  const runFormula = (formula: string) => {
    const context = {
      save: () => onCommit(date),
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

    const normalized = control.caption.trim().toLowerCase();
    if (normalized === "ok" || normalized === "ок") {
      onCommit(date);
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
          Документ: {document.synonym || document.name}
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

              if (control.fieldId === "number") {
                return (
                  <input
                    key={control.id}
                    className="dynamic-form-input"
                    style={style}
                    value={item.number}
                    readOnly
                    disabled
                  />
                );
              }

              if (control.fieldId === "date") {
                return (
                  <input
                    key={control.id}
                    type="date"
                    className="dynamic-form-input"
                    style={style}
                    value={date}
                    readOnly={control.readOnly}
                    disabled={control.disabled}
                    onChange={(e) => setDate(e.target.value)}
                  />
                );
              }

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
            })}
        </div>
      </div>
    </div>
  );
}

export default DynamicDocumentDialog;
