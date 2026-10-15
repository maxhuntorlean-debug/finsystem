import { useEffect, useRef } from "react";
import "./LogPanel.css";

export interface LogEntry {
  id: string;
  time: string;
  text: string;
}

function LogPanel({
  entries,
  onClear,
}: {
  entries: LogEntry[];
  onClear: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <span>Сообщения</span>
        <button
          type="button"
          disabled={entries.length === 0}
          onClick={onClear}
        >
          Очистить
        </button>
      </div>
      <div className="log-panel-body" ref={bodyRef}>
        {entries.length === 0 ? (
          <div className="log-panel-empty">Нет сообщений</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="log-panel-entry">
              <span className="log-panel-time">{entry.time}</span>
              <span className="log-panel-text">{entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LogPanel;
