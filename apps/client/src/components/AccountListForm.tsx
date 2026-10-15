import { useEffect, useState } from "react";
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  fetchChartForm,
  updateAccount,
  type AccountItem,
  type CatalogFormDto,
  type CatalogRecord,
  type ChartRecord,
  type ConstantRecord,
} from "../api/client";
import AccountDialog from "./AccountDialog";
import DynamicAccountDialog from "./DynamicAccountDialog";
import "./AccountListForm.css";

const TYPE_LABELS: Record<AccountItem["accountType"], string> = {
  active: "Активный",
  passive: "Пассивный",
  active_passive: "Акт-пасс.",
};

function AccountListForm({
  chart,
  catalogs,
  constants,
  onLog,
}: {
  chart: ChartRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  onLog: (text: string) => void;
}) {
  const [items, setItems] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<CatalogFormDto | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAccounts(chart.id)
      .then((data) => {
        setItems(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) => console.error("Не удалось загрузить счета", err))
      .finally(() => setLoading(false));
  }, [chart.id]);

  const refreshCustomForm = () => {
    fetchChartForm(chart.id)
      .then(setCustomForm)
      .catch((err) => console.error("Не удалось загрузить форму", err));
  };

  useEffect(() => {
    refreshCustomForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.id]);

  const addItem = () => {
    createAccount(chart.id, "")
      .then((item) => {
        setItems((prev) => [...prev, item]);
        setSelectedId(item.id);
        refreshCustomForm();
        setDialogItemId(item.id);
      })
      .catch((err) => console.error("Не удалось создать счёт", err));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const id = selectedId;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
    deleteAccount(id).catch((err) =>
      console.error("Не удалось удалить счёт", err),
    );
  };

  const openDialog = (id: string) => {
    setSelectedId(id);
    refreshCustomForm();
    setDialogItemId(id);
  };

  const dialogItem = items.find((it) => it.id === dialogItemId) ?? null;

  return (
    <div className="account-list-form">
      <div className="account-list-toolbar">
        <button type="button" title="Новый" onClick={addItem}>
          {"➕"}
        </button>
        <button
          type="button"
          title="Изменить"
          disabled={!selectedId}
          onClick={() => selectedId && openDialog(selectedId)}
        >
          {"✎"}
        </button>
        <button
          type="button"
          title="Удалить"
          disabled={!selectedId}
          onClick={removeSelected}
        >
          {"✖"}
        </button>
      </div>

      {loading ? (
        <div className="account-list-form-empty">Загрузка…</div>
      ) : (
        <div className="account-grid">
          <div className="account-grid-header">
            <div className="account-grid-col-handle" />
            <div className="account-grid-col-code">Код</div>
            <div className="account-grid-col-name">Наименование</div>
            <div className="account-grid-col-type">Тип</div>
          </div>
          <div className="account-grid-body">
            {items.map((item) => (
              <div
                key={item.id}
                className={
                  "account-grid-row" +
                  (selectedId === item.id ? " account-grid-row-selected" : "")
                }
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => openDialog(item.id)}
              >
                <div className="account-grid-col-handle">
                  {selectedId === item.id && (
                    <span className="account-grid-icon" />
                  )}
                </div>
                <div className="account-grid-col-code">{item.code}</div>
                <div className="account-grid-col-name">{item.name}</div>
                <div className="account-grid-col-type">
                  {TYPE_LABELS[item.accountType]}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="account-list-form-empty">Счетов нет</div>
            )}
          </div>
        </div>
      )}

      {dialogItem &&
        (() => {
          const handleClose = () => setDialogItemId(null);

          const handleCommit = (patch: Partial<Omit<AccountItem, "id">>) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === dialogItem.id ? { ...it, ...patch } : it,
              ),
            );
            updateAccount(dialogItem.id, patch).catch((err) =>
              console.error("Не удалось сохранить счёт", err),
            );
          };

          return customForm ? (
            <DynamicAccountDialog
              chart={chart}
              catalogs={catalogs}
              constants={constants}
              account={dialogItem}
              form={customForm}
              onCommit={(name) => handleCommit({ name })}
              onClose={handleClose}
              onLog={onLog}
            />
          ) : (
            <AccountDialog
              chart={chart}
              account={dialogItem}
              onSave={(patch) => {
                handleCommit(patch);
                handleClose();
              }}
              onClose={handleClose}
            />
          );
        })()}
    </div>
  );
}

export default AccountListForm;
