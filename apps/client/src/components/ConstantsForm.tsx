import { useEffect, useRef, useState } from "react";
import {
  fetchConstants,
  updateConstantValue,
  type ConstantRecord,
} from "../api/client";
import "./ConstantsForm.css";

function ConstantsForm() {
  const [constants, setConstants] = useState<ConstantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const updateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    fetchConstants()
      .then(setConstants)
      .catch((err) => console.error("Не удалось загрузить константы", err))
      .finally(() => setLoading(false));
  }, []);

  const setValue = (id: string, value: string) => {
    setConstants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c)),
    );
    const existing = updateTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      updateTimers.current.delete(id);
      updateConstantValue(id, value).catch((err) =>
        console.error("Не удалось сохранить константу", err),
      );
    }, 500);
    updateTimers.current.set(id, timer);
  };

  if (loading) {
    return <div className="constants-form-empty">Загрузка…</div>;
  }

  if (constants.length === 0) {
    return <div className="constants-form-empty">Констант нет</div>;
  }

  return (
    <div className="constants-form">
      {constants.map((constant) => (
        <label key={constant.id} className="constants-form-row">
          <span>{constant.synonym || constant.name}</span>
          {constant.valueType === "undefined" ? (
            <input value="" disabled placeholder="Тип не определён" />
          ) : constant.valueType === "reference" ? (
            <input
              value=""
              disabled
              placeholder="Выбор из справочника — пока не реализовано"
            />
          ) : constant.valueType === "boolean" ? (
            <input
              type="checkbox"
              checked={constant.value === "true"}
              onChange={(e) =>
                setValue(constant.id, e.target.checked ? "true" : "false")
              }
            />
          ) : (
            <input
              type={
                constant.valueType === "number"
                  ? "number"
                  : constant.valueType === "date"
                    ? "date"
                    : "text"
              }
              step={
                constant.valueType === "number" && constant.valuePrecision > 0
                  ? 1 / 10 ** constant.valuePrecision
                  : undefined
              }
              maxLength={
                constant.valueType === "string" && !constant.valueUnbounded
                  ? constant.valueLength
                  : undefined
              }
              value={constant.value}
              onChange={(e) => setValue(constant.id, e.target.value)}
              onBlur={(e) => {
                if (
                  constant.valueType === "number" &&
                  constant.valuePrecision > 0 &&
                  e.target.value !== ""
                ) {
                  setValue(
                    constant.id,
                    Number(e.target.value).toFixed(constant.valuePrecision),
                  );
                }
              }}
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default ConstantsForm;
