import { useEffect, useRef } from "react";
import { useMetadata } from "../state/metadataStore";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import "./ChartEditor.css";

function ChartEditor({ chartId }: { chartId: string }) {
  const { charts, updateChart, openChartForm } = useMetadata();
  const chart = charts.find((c) => c.id === chartId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.select();
  }, [chartId]);

  if (!chart) {
    return null;
  }

  const nameDuplicate = findDuplicateIdentifier(chart.name, chart.id, charts);

  return (
    <div className="chart-editor">
      <label className="chart-editor-row">
        <span>Идентификатор:</span>
        <input
          ref={nameInputRef}
          value={chart.name}
          onChange={(e) =>
            updateChart(chart.id, {
              name: sanitizeIdentifier(e.target.value),
            })
          }
        />
      </label>
      {nameDuplicate && (
        <p className="chart-editor-warning">
          Такой идентификатор уже используется другим планом счетов
        </p>
      )}
      <label className="chart-editor-row">
        <span>Синоним:</span>
        <input
          value={chart.synonym}
          onChange={(e) =>
            updateChart(chart.id, { synonym: e.target.value })
          }
        />
      </label>
      <label className="chart-editor-row">
        <span>Комментарий:</span>
        <input
          value={chart.comment}
          onChange={(e) =>
            updateChart(chart.id, { comment: e.target.value })
          }
        />
      </label>
      <label className="chart-editor-row chart-editor-row-narrow">
        <span>Длина кода:</span>
        <input
          type="number"
          min={1}
          max={10}
          value={chart.codeLength}
          onChange={(e) =>
            updateChart(chart.id, { codeLength: Number(e.target.value) })
          }
        />
      </label>
      <label className="chart-editor-row chart-editor-row-narrow">
        <span>Кол-во субсчетов:</span>
        <input
          type="number"
          min={0}
          max={5}
          value={chart.levels}
          onChange={(e) =>
            updateChart(chart.id, { levels: Number(e.target.value) })
          }
        />
      </label>

      <div className="chart-editor-footer">
        <button type="button" onClick={() => openChartForm(chart.id)}>
          Форма счёта
        </button>
      </div>
    </div>
  );
}

export default ChartEditor;
