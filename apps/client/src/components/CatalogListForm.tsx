import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalogAttributes,
  fetchCatalogForm,
  fetchCatalogItems,
  updateCatalogItem,
  type CatalogAttributeRecord,
  type CatalogFormDto,
  type CatalogItem,
  type CatalogRecord,
  type ConstantRecord,
} from "../api/client";
import ItemDialog from "./ItemDialog";
import DynamicItemDialog from "./DynamicItemDialog";
import "./CatalogListForm.css";

function CatalogListForm({
  catalog,
  catalogs,
  constants,
  onLog,
  onPick,
  onPickFromCatalog,
}: {
  catalog: CatalogRecord;
  catalogs: CatalogRecord[];
  constants: ConstantRecord[];
  onLog: (text: string) => void;
  onPick?: (item: CatalogItem) => void;
  onPickFromCatalog?: (
    catalogId: string,
    onPick: (item: CatalogItem) => void,
  ) => void;
}) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState<CatalogFormDto | null>(null);
  const [attributes, setAttributes] = useState<CatalogAttributeRecord[]>([]);
  const updateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const useDialog = catalog.editMode === "dialog";

  useEffect(() => {
    setLoading(true);
    fetchCatalogItems(catalog.id)
      .then((data) => {
        setItems(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) =>
        console.error("Не удалось загрузить элементы справочника", err),
      )
      .finally(() => setLoading(false));
  }, [catalog.id]);

  useEffect(() => {
    if (!useDialog) return;
    fetchCatalogForm(catalog.id)
      .then(setCustomForm)
      .catch((err) => console.error("Не удалось загрузить форму", err));
    fetchCatalogAttributes(catalog.id)
      .then(setAttributes)
      .catch((err) => console.error("Не удалось загрузить реквизиты", err));
  }, [catalog.id, useDialog]);

  const refreshCustomForm = () => {
    if (!useDialog) return;
    fetchCatalogForm(catalog.id)
      .then(setCustomForm)
      .catch((err) => console.error("Не удалось загрузить форму", err));
  };

  useEffect(() => {
    if (!pendingFocusId) return;
    const el = inputRefs.current.get(pendingFocusId);
    if (el) {
      el.focus();
      setPendingFocusId(null);
    }
  }, [items, pendingFocusId]);

  const addItem = () => {
    createCatalogItem(catalog.id, "")
      .then((item) => {
        setItems((prev) => [...prev, item]);
        setSelectedId(item.id);
        if (useDialog) {
          refreshCustomForm();
          setDialogItemId(item.id);
        } else {
          setPendingFocusId(item.id);
        }
      })
      .catch((err) => console.error("Не удалось создать элемент", err));
  };

  const removeSelected = () => {
    if (!selectedId) return;
    const id = selectedId;
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
    deleteCatalogItem(id).catch((err) =>
      console.error("Не удалось удалить элемент", err),
    );
  };

  const renameItem = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, name } : it)),
    );
    const existing = updateTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      updateTimers.current.delete(id);
      updateCatalogItem(id, { name }).catch((err) =>
        console.error("Не удалось сохранить элемент", err),
      );
    }, 500);
    updateTimers.current.set(id, timer);
  };

  const commitItemName = (id: string, name: string) => {
    const existing = updateTimers.current.get(id);
    if (!existing) return; // nothing unsaved — skip the network round trip
    clearTimeout(existing);
    updateTimers.current.delete(id);
    updateCatalogItem(id, { name }).catch((err) =>
      console.error("Не удалось сохранить элемент", err),
    );
  };

  const handleNameKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    item: CatalogItem,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commitItemName(item.id, item.name);

    if (onPick) {
      onPick(item);
      return;
    }

    const index = items.findIndex((it) => it.id === item.id);
    const next = items[index + 1];
    if (next) {
      setSelectedId(next.id);
      inputRefs.current.get(next.id)?.focus();
    } else {
      e.currentTarget.blur();
    }
  };

  const dialogItem = items.find((it) => it.id === dialogItemId) ?? null;

  return (
    <div className="catalog-list-form">
      <div className="catalog-list-toolbar">
        <button type="button" title="Новый" onClick={addItem}>
          {"➕"}
        </button>
        {useDialog && (
          <button
            type="button"
            title="Изменить"
            disabled={!selectedId}
            onClick={() => {
              if (!selectedId) return;
              refreshCustomForm();
              setDialogItemId(selectedId);
            }}
          >
            {"✎"}
          </button>
        )}
        <button
          type="button"
          title="Удалить"
          disabled={!selectedId}
          onClick={removeSelected}
        >
          {"✖"}
        </button>
        {onPick && (
          <button
            type="button"
            className="catalog-list-pick-button"
            disabled={!selectedId}
            onClick={() => {
              const item = items.find((it) => it.id === selectedId);
              if (item) onPick(item);
            }}
          >
            Выбрать
          </button>
        )}
      </div>

      {loading ? (
        <div className="catalog-list-form-empty">Загрузка…</div>
      ) : (
        <div className="catalog-grid">
          <div className="catalog-grid-header">
            <div className="catalog-grid-col-handle" />
            <div className="catalog-grid-col-code">Код</div>
            <div className="catalog-grid-col-name">Наименование</div>
          </div>
          <div className="catalog-grid-body">
            {items.map((item) => (
              <div
                key={item.id}
                className={
                  "catalog-grid-row" +
                  (selectedId === item.id ? " catalog-grid-row-selected" : "")
                }
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => {
                  setSelectedId(item.id);
                  if (onPick) {
                    onPick(item);
                  } else if (useDialog) {
                    refreshCustomForm();
                    setDialogItemId(item.id);
                  }
                }}
              >
                <div className="catalog-grid-col-handle">
                  {selectedId === item.id && (
                    <span className="catalog-grid-icon" />
                  )}
                </div>
                <div className="catalog-grid-col-code">{item.code}</div>
                <div className="catalog-grid-col-name">
                  {useDialog ? (
                    <span className="catalog-grid-name-text">
                      {item.name}
                    </span>
                  ) : (
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(item.id, el);
                        else inputRefs.current.delete(item.id);
                      }}
                      value={item.name}
                      maxLength={catalog.nameLength}
                      onChange={(e) => renameItem(item.id, e.target.value)}
                      onFocus={() => setSelectedId(item.id)}
                      onKeyDown={(e) => handleNameKeyDown(e, item)}
                    />
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="catalog-list-form-empty">Элементов нет</div>
            )}
          </div>
        </div>
      )}

      {dialogItem &&
        (() => {
          const handleCommit = (name: string) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === dialogItem.id ? { ...it, name } : it,
              ),
            );
            updateCatalogItem(dialogItem.id, { name }).catch((err) =>
              console.error("Не удалось сохранить элемент", err),
            );
          };
          const handleClose = () => setDialogItemId(null);
          const handleSaveAndClose = (name: string) => {
            handleCommit(name);
            handleClose();
          };

          return customForm ? (
            <DynamicItemDialog
              catalog={catalog}
              catalogs={catalogs}
              constants={constants}
              attributes={attributes}
              item={dialogItem}
              form={customForm}
              onCommit={handleCommit}
              onClose={handleClose}
              onLog={onLog}
              onPickFromCatalog={onPickFromCatalog}
            />
          ) : (
            <ItemDialog
              catalog={catalog}
              item={dialogItem}
              onSave={handleSaveAndClose}
              onClose={handleClose}
            />
          );
        })()}
    </div>
  );
}

export default CatalogListForm;
