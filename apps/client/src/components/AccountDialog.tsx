import { useState } from "react";
import type { AccountItem, AccountType, ChartRecord } from "../api/client";
import "./AccountDialog.css";

const TYPE_LABELS: Record<AccountType, string> = {
  active: "Активный",
  passive: "Пассивный",
  active_passive: "Активно-пассивный",
};

function AccountDialog({
  chart,
  account,
  onSave,
  onClose,
}: {
  chart: ChartRecord;
  account: AccountItem;
  onSave: (patch: Partial<Omit<AccountItem, "id">>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [accountType, setAccountType] = useState<AccountType>(
    account.accountType,
  );
  const [currency, setCurrency] = useState(account.currency);
  const [quantitative, setQuantitative] = useState(account.quantitative);
  const [offBalance, setOffBalance] = useState(account.offBalance);

  const save = () => {
    onSave({ name, accountType, currency, quantitative, offBalance });
  };

  return (
    <div className="account-dialog-overlay" onClick={onClose}>
      <div className="account-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="account-dialog-titlebar">
          План счетов: {chart.synonym || chart.name}
        </div>
        <div className="account-dialog-body">
          <label>
            Код
            <input value={account.code} readOnly disabled />
          </label>
          <label>
            Наименование
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <fieldset className="account-dialog-type">
            <legend>Тип счёта</legend>
            {(Object.keys(TYPE_LABELS) as AccountType[]).map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  name="account-type"
                  checked={accountType === type}
                  onChange={() => setAccountType(type)}
                />
                {TYPE_LABELS[type]}
              </label>
            ))}
          </fieldset>

          <label className="account-dialog-checkbox">
            <input
              type="checkbox"
              checked={currency}
              onChange={(e) => setCurrency(e.target.checked)}
            />
            Валютный
          </label>
          <label className="account-dialog-checkbox">
            <input
              type="checkbox"
              checked={quantitative}
              onChange={(e) => setQuantitative(e.target.checked)}
            />
            Количественный
          </label>
          <label className="account-dialog-checkbox">
            <input
              type="checkbox"
              checked={offBalance}
              onChange={(e) => setOffBalance(e.target.checked)}
            />
            Забалансовый
          </label>
        </div>
        <div className="account-dialog-actions">
          <button type="button" onClick={save}>
            ОК
          </button>
          <button type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountDialog;
