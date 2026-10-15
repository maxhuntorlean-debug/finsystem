import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import "./MdiWindow.css";

interface MdiWindowProps {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onRectChange: (rect: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => void;
  children: ReactNode;
}

const MIN_WIDTH = 260;
const MIN_HEIGHT = 160;

function MdiWindow({
  title,
  x,
  y,
  width,
  height,
  zIndex,
  active,
  onFocus,
  onClose,
  onRectChange,
  children,
}: MdiWindowProps) {
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  const handleTitleBarPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      onFocus();
      if (maximized) return;
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: x,
        originY: y,
      };
      const handleMove = (ev: PointerEvent) => {
        if (!dragState.current) return;
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        onRectChange({
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
    },
    [onFocus, onRectChange, x, y, maximized],
  );

  const handleResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onFocus();
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originW: width,
        originH: height,
      };
      const handleMove = (ev: PointerEvent) => {
        if (!resizeState.current) return;
        const dx = ev.clientX - resizeState.current.startX;
        const dy = ev.clientY - resizeState.current.startY;
        onRectChange({
          width: Math.max(MIN_WIDTH, resizeState.current.originW + dx),
          height: Math.max(MIN_HEIGHT, resizeState.current.originH + dy),
        });
      };
      const handleUp = () => {
        resizeState.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onFocus, onRectChange, width, height],
  );

  const className =
    "mdi-window" +
    (active ? " mdi-window-active" : "") +
    (maximized ? " mdi-window-maximized" : "") +
    (minimized ? " mdi-window-minimized" : "");

  return (
    <div
      className={className}
      style={maximized ? { zIndex } : { left: x, top: y, width, height, zIndex }}
      onPointerDown={onFocus}
    >
      <div
        className="mdi-window-titlebar"
        onPointerDown={handleTitleBarPointerDown}
      >
        <span className="mdi-window-title">{title}</span>
        <span className="mdi-window-buttons">
          <button
            type="button"
            className="mdi-window-btn"
            title="Свернуть"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setMinimized((v) => !v);
              setMaximized(false);
            }}
          >
            _
          </button>
          <button
            type="button"
            className="mdi-window-btn"
            title={maximized ? "Восстановить" : "Развернуть"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setMaximized((v) => !v);
              setMinimized(false);
            }}
          >
            {maximized ? "❑" : "□"}
          </button>
          <button
            type="button"
            className="mdi-window-btn mdi-window-close"
            title="Закрыть"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
          >
            {"×"}
          </button>
        </span>
      </div>
      {!minimized && (
        <>
          <div className="mdi-window-body">{children}</div>
          {!maximized && (
            <div
              className="mdi-window-resize"
              onPointerDown={handleResizePointerDown}
            />
          )}
        </>
      )}
    </div>
  );
}

export default MdiWindow;
