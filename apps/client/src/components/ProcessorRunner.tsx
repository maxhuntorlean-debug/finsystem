import { useEffect, useState } from "react";
import {
  fetchProcessorForm,
  type CatalogFormDto,
  type CatalogRecord,
  type ConstantRecord,
  type FormControlDto,
  type ProcessorRecord,
} from "../api/client";
import {
  buildCatalogsAccess,
  formatLogArg,
  useConstantsAccess,
  useElementsOverrides,
} from "../utils/moduleContext";
import "./DynamicItemDialog.css";
import "./ProcessorRunner.css";

function ProcessorRunner({
  processor,
  catalogs,
  constants,
  onClose,
  onLog,
}: {
  processor: ProcessorRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  onClose: () => void;
  onLog: (text: string) => void;
}) {
  const [form, setForm] = useState<CatalogFormDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { overrides, elements } = useElementsOverrides(form?.controls ?? []);
  const constantsContext = useConstantsAccess(constants);

  useEffect(() => {
    setLoaded(false);
    fetchProcessorForm(processor.id)
      .then(setForm)
      .catch((err) => console.error("Не удалось загрузить форму обработки", err))
      .finally(() => setLoaded(true));
  }, [processor.id]);

  if (!loaded) {
    return <div className="processor-runner-empty">Загрузка…</div>;
  }

  if (!form) {
    return <div className="processor-runner-empty">Форма не задана</div>;
  }

  const catalogsContext = buildCatalogsAccess(catalogs);

  const runFormula = (formula: string) => {
    const context = {
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
      handleError(err);
    }
  };

  const handleButtonClick = (control: FormControlDto) => {
    if (control.formula && control.formula.trim()) {
      runFormula(control.formula);
      return;
    }
    const normalized = control.caption.trim().toLowerCase();
    if (normalized === "закрыть" || normalized === "отмена") {
      onClose();
    }
  };

  return (
    <div className="dynamic-form-body processor-runner-body">
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
  );
}

export default ProcessorRunner;
