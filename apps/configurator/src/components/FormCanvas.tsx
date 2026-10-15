import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { CatalogFormDto, FormControlDto } from "../api/client";
import RequisitesDialog, { type RequisiteField } from "./RequisitesDialog";
import ControlPropertiesDialog from "./ControlPropertiesDialog";
import ConfirmDialog from "./ConfirmDialog";
import "./FormCanvas.css";

function ButtonToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="7"
        rx="1.5"
        fill="#dfe6f2"
        stroke="#3d5a99"
      />
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="3"
        rx="1.5"
        fill="#ffffff"
        opacity="0.75"
      />
    </svg>
  );
}

function LabelToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <text
        x="8"
        y="12"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="11"
        fill="#2a5fc9"
        textAnchor="middle"
      >
        A
      </text>
    </svg>
  );
}

function FieldToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="7"
        rx="1"
        fill="#ffffff"
        stroke="#3d5a99"
      />
      <line x1="4" y1="6" x2="4" y2="10" stroke="#3d5a99" strokeWidth="1" />
    </svg>
  );
}

function RequisitesToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect
        x="2"
        y="1.5"
        width="12"
        height="13"
        rx="1"
        fill="#ffffff"
        stroke="#8a8060"
      />
      <rect x="4" y="3.5" width="8" height="2" fill="#ffd76b" stroke="#8a6d1f" />
      <line x1="4" y1="8" x2="12" y2="8" stroke="#3d5a99" strokeWidth="1" />
      <line x1="4" y1="10.5" x2="12" y2="10.5" stroke="#3d5a99" strokeWidth="1" />
      <line x1="4" y1="13" x2="9" y2="13" stroke="#3d5a99" strokeWidth="1" />
    </svg>
  );
}

type ControlType = "button" | "label" | "input";
type DesignerTab = "dialog" | "module";

interface FormControl {
  id: string;
  type: ControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
  fieldId?: string;
  identifier?: string;
  disabled?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  formula?: string;
  skipOnInput?: boolean;
}

const DEFAULT_CONTROLS: FormControl[] = [
  {
    id: "ok",
    type: "button",
    x: 14,
    y: 16,
    width: 90,
    height: 24,
    caption: "OK",
    formula: "save(); close();",
  },
  {
    id: "close",
    type: "button",
    x: 114,
    y: 16,
    width: 90,
    height: 24,
    caption: "Закрыть",
    formula: "close();",
  },
];

const DEFAULT_SIZES: Record<ControlType, { width: number; height: number }> = {
  button: { width: 90, height: 24 },
  label: { width: 80, height: 18 },
  input: { width: 120, height: 22 },
};

const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  button: "Кнопка",
  label: "Надпись",
  input: "Поле",
};

const MIN_CANVAS_WIDTH = 200;
const MIN_CANVAS_HEIGHT = 140;
const MIN_CONTROL_WIDTH = 24;
const MIN_CONTROL_HEIGHT = 16;

function generateControlId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ctrl${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function FormCanvas({
  ownerId,
  fetchForm,
  saveForm,
  requisiteFields,
}: {
  ownerId: string;
  fetchForm: (id: string) => Promise<CatalogFormDto | null>;
  saveForm: (id: string, form: CatalogFormDto) => Promise<void>;
  requisiteFields?: RequisiteField[];
}) {
  const [requisitesOpen, setRequisitesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DesignerTab>("dialog");
  const [size, setSize] = useState({ width: 340, height: 240 });
  const [controls, setControls] = useState<FormControl[]>(DEFAULT_CONTROLS);
  const [formModule, setFormModule] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    controlId: string;
    x: number;
    y: number;
  } | null>(null);
  const [propertiesControlId, setPropertiesControlId] = useState<
    string | null
  >(null);

  const canvasResizeState = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  useEffect(() => {
    setLoaded(false);
    fetchForm(ownerId)
      .then((form) => {
        if (form) {
          setSize({ width: form.width, height: form.height });
          setControls(form.controls as FormControl[]);
          setFormModule(form.module ?? "");
        } else {
          setSize({ width: 340, height: 240 });
          setControls(DEFAULT_CONTROLS);
          setFormModule("");
        }
      })
      .catch((err) => console.error("Не удалось загрузить форму", err))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      saveForm(ownerId, {
        width: size.width,
        height: size.height,
        controls: controls as FormControlDto[],
        module: formModule,
      }).catch((err) => console.error("Не удалось сохранить форму", err));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, loaded, size, controls, formModule]);

  const updateControl = useCallback(
    (id: string, patch: Partial<Omit<FormControl, "id" | "type">>) => {
      setControls((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
    },
    [],
  );

  const addControl = useCallback(
    (type: ControlType, caption?: string, fieldId?: string) => {
      const id = generateControlId();
      setControls((prev) => {
        const offset = (prev.length % 6) * 16;
        const { width, height } = DEFAULT_SIZES[type];
        return [
          ...prev,
          {
            id,
            type,
            x: 14 + offset,
            y: 56 + offset,
            width,
            height,
            caption: caption ?? CONTROL_TYPE_LABELS[type],
            fieldId,
          },
        ];
      });
      setSelectedId(id);
    },
    [],
  );

  const insertRequisites = useCallback(
    (fields: RequisiteField[], fieldIds: string[], insertName: boolean) => {
      fieldIds.forEach((fieldId) => {
        const field = fields.find((f) => f.id === fieldId);
        if (!field) return;
        if (insertName) {
          addControl("label", field.label);
        }
        addControl("input", field.label, field.id);
      });
      setRequisitesOpen(false);
    },
    [addControl],
  );

  const removeControl = useCallback((id: string) => {
    setControls((prev) => prev.filter((c) => c.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const confirmAndRemoveControl = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      confirmAndRemoveControl(selectedId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, confirmAndRemoveControl]);

  const handleControlPointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    control: FormControl,
  ) => {
    e.stopPropagation();
    setSelectedId(control.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = control.x;
    const originY = control.y;
    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      updateControl(control.id, {
        x: Math.max(0, originX + dx),
        y: Math.max(0, originY + dy),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleControlResizePointerDown = (
    e: ReactPointerEvent<HTMLSpanElement>,
    control: FormControl,
  ) => {
    e.stopPropagation();
    setSelectedId(control.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const originW = control.width;
    const originH = control.height;
    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      updateControl(control.id, {
        width: Math.max(MIN_CONTROL_WIDTH, originW + dx),
        height: Math.max(MIN_CONTROL_HEIGHT, originH + dy),
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleCanvasResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      canvasResizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originW: size.width,
        originH: size.height,
      };
      const handleMove = (ev: PointerEvent) => {
        if (!canvasResizeState.current) return;
        const dx = ev.clientX - canvasResizeState.current.startX;
        const dy = ev.clientY - canvasResizeState.current.startY;
        setSize({
          width: Math.max(
            MIN_CANVAS_WIDTH,
            canvasResizeState.current.originW + dx,
          ),
          height: Math.max(
            MIN_CANVAS_HEIGHT,
            canvasResizeState.current.originH + dy,
          ),
        });
      };
      const handleUp = () => {
        canvasResizeState.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [size.width, size.height],
  );

  const handleControlContextMenu = (
    e: ReactMouseEvent<HTMLDivElement>,
    control: FormControl,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(control.id);
    setContextMenu({ controlId: control.id, x: e.clientX, y: e.clientY });
  };

  const propertiesControl =
    controls.find((c) => c.id === propertiesControlId) ?? null;

  const hasRequisites = requisiteFields !== undefined;

  return (
    <div className="form-designer-area">
      {activeTab === "dialog" && (
        <div className="form-toolbar">
          <div className="form-toolbar-group">
            <button
              type="button"
              className="form-toolbar-icon-btn"
              title="Добавить кнопку"
              onClick={() => addControl("button")}
            >
              <ButtonToolIcon />
            </button>
            <button
              type="button"
              className="form-toolbar-icon-btn"
              title="Добавить надпись"
              onClick={() => addControl("label")}
            >
              <LabelToolIcon />
            </button>
            <button
              type="button"
              className="form-toolbar-icon-btn"
              title="Добавить поле"
              onClick={() => addControl("input")}
            >
              <FieldToolIcon />
            </button>
            {hasRequisites && (
              <button
                type="button"
                className="form-toolbar-icon-btn"
                title="Реквизиты"
                onClick={() => setRequisitesOpen(true)}
              >
                <RequisitesToolIcon />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="form-designer-content">
        {activeTab === "dialog" ? (
          <div
            className="form-canvas"
            style={{ width: size.width, height: size.height }}
            onPointerDown={() => setSelectedId(null)}
          >
            <div className="form-canvas-titlebar">
              <span className="form-canvas-icon" />
              <span className="form-canvas-controls">
                <span className="form-canvas-btn">_</span>
                <span className="form-canvas-btn">□</span>
                <span className="form-canvas-btn">×</span>
              </span>
            </div>
            <div className="form-canvas-body">
              {controls.map((control) => (
                <div
                  key={control.id}
                  className={
                    "form-control" +
                    (selectedId === control.id
                      ? " form-control-selected"
                      : "") +
                    (control.hidden ? " form-control-hidden" : "")
                  }
                  style={{
                    left: control.x,
                    top: control.y,
                    width: control.width,
                    height: control.height,
                  }}
                  onPointerDown={(e) => handleControlPointerDown(e, control)}
                  onContextMenu={(e) => handleControlContextMenu(e, control)}
                  onDoubleClick={() => setPropertiesControlId(control.id)}
                >
                  {control.type === "button" && (
                    <button
                      type="button"
                      className="form-control-button"
                      tabIndex={-1}
                      disabled={control.disabled}
                    >
                      {control.caption}
                    </button>
                  )}
                  {control.type === "label" && (
                    <span className="form-control-label">
                      {control.caption}
                    </span>
                  )}
                  {control.type === "input" && (
                    <input
                      className="form-control-input"
                      readOnly
                      value={control.caption}
                      tabIndex={-1}
                    />
                  )}
                  {selectedId === control.id && (
                    <span
                      className="form-control-resize"
                      onPointerDown={(e) =>
                        handleControlResizePointerDown(e, control)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <span className="form-canvas-handle form-canvas-handle-top" />
            <span className="form-canvas-handle form-canvas-handle-right" />
            <span className="form-canvas-handle form-canvas-handle-bottom" />
            <span
              className="form-canvas-handle form-canvas-handle-corner"
              onPointerDown={handleCanvasResizePointerDown}
            />
          </div>
        ) : (
          <div className="form-module-editor">
            <textarea
              className="form-module-textarea"
              spellCheck={false}
              value={formModule}
              onChange={(e) => setFormModule(e.target.value)}
              placeholder={"function Sohr() {\n  save();\n  close();\n}"}
            />
            <p className="form-module-hint">
              Встроенные функции: save() — записать, close() — закрыть.
              Опишите здесь свои процедуры и вызывайте их из поля «Формула»
              на кнопке, например Sohr().
            </p>
          </div>
        )}
      </div>

      <div className="form-designer-tabs">
        <button
          type="button"
          className={
            "form-designer-tab" +
            (activeTab === "dialog" ? " form-designer-tab-active" : "")
          }
          onClick={() => setActiveTab("dialog")}
        >
          Диалог
        </button>
        <button
          type="button"
          className={
            "form-designer-tab" +
            (activeTab === "module" ? " form-designer-tab-active" : "")
          }
          onClick={() => setActiveTab("module")}
        >
          Модуль
        </button>
      </div>

      {requisitesOpen && requisiteFields && (
        <RequisitesDialog
          fields={requisiteFields}
          onInsert={(fieldIds, insertName) =>
            insertRequisites(requisiteFields, fieldIds, insertName)
          }
          onClose={() => setRequisitesOpen(false)}
        />
      )}

      {contextMenu && (
        <>
          <div
            className="form-context-menu-overlay"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="form-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setPropertiesControlId(contextMenu.controlId);
                setContextMenu(null);
              }}
            >
              Свойства ...
            </button>
            <button
              type="button"
              onClick={() => {
                confirmAndRemoveControl(contextMenu.controlId);
                setContextMenu(null);
              }}
            >
              Удалить
            </button>
          </div>
        </>
      )}

      {propertiesControl && (
        <ControlPropertiesDialog
          control={propertiesControl}
          siblingIdentifiers={controls
            .filter((c) => c.id !== propertiesControl.id)
            .map((c) => c.identifier)
            .filter((id): id is string => !!id)}
          onChange={(patch) => updateControl(propertiesControl.id, patch)}
          onClose={() => setPropertiesControlId(null)}
        />
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this element?"
          onConfirm={() => {
            removeControl(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}

export default FormCanvas;
