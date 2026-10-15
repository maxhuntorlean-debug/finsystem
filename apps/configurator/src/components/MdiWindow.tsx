import {
  useCallback,
  useRef,
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
  resizable?: boolean;
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

const MIN_WIDTH = 220;
const MIN_HEIGHT = 140;

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function MdiWindow({
  title,
  x,
  y,
  width,
  height,
  zIndex,
  active,
  resizable = true,
  onFocus,
  onClose,
  onRectChange,
  children,
}: MdiWindowProps) {
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    dir: ResizeDir;
  } | null>(null);

  const handleTitleBarPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      onFocus();
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
    [onFocus, onRectChange, x, y],
  );

  const handleResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, dir: ResizeDir) => {
      e.stopPropagation();
      onFocus();
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: x,
        originY: y,
        originW: width,
        originH: height,
        dir,
      };
      const handleMove = (ev: PointerEvent) => {
        const s = resizeState.current;
        if (!s) return;
        const dx = ev.clientX - s.startX;
        const dy = ev.clientY - s.startY;
        const rect: {
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        } = {};

        if (s.dir.includes("e")) {
          rect.width = Math.max(MIN_WIDTH, s.originW + dx);
        }
        if (s.dir.includes("w")) {
          const newWidth = Math.max(MIN_WIDTH, s.originW - dx);
          rect.width = newWidth;
          rect.x = s.originX + (s.originW - newWidth);
        }
        if (s.dir.includes("s")) {
          rect.height = Math.max(MIN_HEIGHT, s.originH + dy);
        }
        if (s.dir.includes("n")) {
          const newHeight = Math.max(MIN_HEIGHT, s.originH - dy);
          rect.height = newHeight;
          rect.y = s.originY + (s.originH - newHeight);
        }

        onRectChange(rect);
      };
      const handleUp = () => {
        resizeState.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onFocus, onRectChange, x, y, width, height],
  );

  return (
    <div
      className={"mdi-window" + (active ? " mdi-window-active" : "")}
      style={{ left: x, top: y, width, height, zIndex }}
      onPointerDown={onFocus}
    >
      <div
        className="mdi-window-titlebar"
        onPointerDown={handleTitleBarPointerDown}
      >
        <span className="mdi-window-title">{title}</span>
        <button
          type="button"
          className="mdi-window-close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="mdi-window-body">{children}</div>
      {resizable && (
        <>
          <div
            className="mdi-window-resize mdi-window-resize-n"
            onPointerDown={(e) => handleResizePointerDown(e, "n")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-s"
            onPointerDown={(e) => handleResizePointerDown(e, "s")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-e"
            onPointerDown={(e) => handleResizePointerDown(e, "e")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-w"
            onPointerDown={(e) => handleResizePointerDown(e, "w")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-ne"
            onPointerDown={(e) => handleResizePointerDown(e, "ne")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-nw"
            onPointerDown={(e) => handleResizePointerDown(e, "nw")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-se"
            onPointerDown={(e) => handleResizePointerDown(e, "se")}
          />
          <div
            className="mdi-window-resize mdi-window-resize-sw"
            onPointerDown={(e) => handleResizePointerDown(e, "sw")}
          />
        </>
      )}
    </div>
  );
}

export default MdiWindow;
