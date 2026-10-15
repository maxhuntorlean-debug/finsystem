import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { sanitizeIdentifier } from "../utils/identifiers";
import "./ControlPropertiesDialog.css";

type ControlType = "button" | "label" | "input";
type TabName = "Общие" | "Дополнительно" | "Команда" | "Картинка" | "Описание";

interface PropertiesControl {
  id: string;
  type: ControlType;
  caption: string;
  identifier?: string;
  disabled?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  formula?: string;
  skipOnInput?: boolean;
}

interface PropertiesPatch {
  caption?: string;
  identifier?: string;
  disabled?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  formula?: string;
  skipOnInput?: boolean;
}

const TYPE_TITLES: Record<ControlType, string> = {
  button: "Свойства Кнопки",
  label: "Свойства Надписи",
  input: "Свойства Поля",
};

const TABS: TabName[] = [
  "Общие",
  "Дополнительно",
  "Команда",
  "Картинка",
  "Описание",
];
const ENABLED_TABS = new Set<TabName>(["Общие", "Дополнительно"]);

function ControlPropertiesDialog({
  control,
  siblingIdentifiers,
  onChange,
  onClose,
}: {
  control: PropertiesControl;
  siblingIdentifiers: string[];
  onChange: (patch: PropertiesPatch) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabName>("Общие");
  const [pos, setPos] = useState({ x: 120, y: 90 });
  const [draft, setDraft] = useState<PropertiesControl>(control);
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const readOnlyApplicable = draft.type === "input";
  const identifierDuplicate =
    !!draft.identifier &&
    siblingIdentifiers.some(
      (id) => id.trim().toLowerCase() === draft.identifier!.trim().toLowerCase(),
    );

  const patchDraft = (patch: PropertiesPatch) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const handleOk = () => {
    onChange({
      caption: draft.caption,
      identifier: draft.identifier,
      disabled: draft.disabled,
      hidden: draft.hidden,
      readOnly: draft.readOnly,
      formula: draft.formula,
      skipOnInput: draft.skipOnInput,
    });
    onClose();
  };

  const handleTitleBarPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    const handleMove = (ev: PointerEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setPos({
        x: Math.max(0, dragState.current.originX + dx),
        y: Math.max(0, dragState.current.originY + dy),
      });
    };
    const handleUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      className="control-props-dialog"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="control-props-titlebar"
        onPointerDown={handleTitleBarPointerDown}
      >
        <span>{TYPE_TITLES[draft.type]}</span>
        <button
          type="button"
          className="control-props-close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
        >
          {"×"}
        </button>
      </div>

      <div className="control-props-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={!ENABLED_TABS.has(t)}
            className={
              "control-props-tab" +
              (tab === t ? " control-props-tab-active" : "")
            }
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="control-props-content">
          {tab === "Общие" && (
            <div className="control-props-fields">
              <label>
                Заголовок:
                <input
                  value={draft.caption}
                  onChange={(e) => patchDraft({ caption: e.target.value })}
                />
              </label>
              <label>
                Идентификатор:
                <input
                  value={draft.identifier ?? ""}
                  onChange={(e) =>
                    patchDraft({ identifier: sanitizeIdentifier(e.target.value) })
                  }
                />
              </label>
              {identifierDuplicate && (
                <p className="control-props-hint control-props-warning">
                  Такой идентификатор уже используется другим элементом формы
                </p>
              )}

              <label className="control-props-checkbox">
                <input
                  type="checkbox"
                  checked={draft.disabled ?? false}
                  onChange={(e) => patchDraft({ disabled: e.target.checked })}
                />
                Сделать недоступным
              </label>
              <label className="control-props-checkbox">
                <input
                  type="checkbox"
                  checked={draft.hidden ?? false}
                  onChange={(e) => patchDraft({ hidden: e.target.checked })}
                />
                Сделать невидимым
              </label>
              <label
                className={
                  "control-props-checkbox" +
                  (readOnlyApplicable
                    ? ""
                    : " control-props-checkbox-disabled")
                }
              >
                <input
                  type="checkbox"
                  disabled={!readOnlyApplicable}
                  checked={draft.readOnly ?? false}
                  onChange={(e) => patchDraft({ readOnly: e.target.checked })}
                />
                Запретить редактирование
              </label>
            </div>
          )}

          {tab === "Дополнительно" && (
            <div className="control-props-fields">
              <label>
                Формула:
                <input
                  value={draft.formula ?? ""}
                  placeholder="save(); close();"
                  onChange={(e) => patchDraft({ formula: e.target.value })}
                />
              </label>
              <p className="control-props-hint">
                JS-выражение. Встроено: save() — записать, close() — закрыть.
                Можно вызывать свои процедуры из «Модуля формы», например
                Sohr().
              </p>
              <label className="control-props-checkbox">
                <input
                  type="checkbox"
                  checked={draft.skipOnInput ?? false}
                  onChange={(e) =>
                    patchDraft({ skipOnInput: e.target.checked })
                  }
                />
                Пропускать при вводе
              </label>
            </div>
          )}

        <div className="control-props-actions">
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

export default ControlPropertiesDialog;
