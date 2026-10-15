import { useEffect, useRef, useState } from "react";
import { useMetadata } from "../state/metadataStore";
import { findDuplicateIdentifier, sanitizeIdentifier } from "../utils/identifiers";
import "./CatalogEditor.css";

function CatalogEditor({ catalogId }: { catalogId: string }) {
  const {
    catalogs,
    updateCatalog,
    openItemForm,
    catalogAttributes,
    ensureCatalogAttributes,
    addCatalogAttribute,
    removeCatalogAttribute,
    reorderCatalogAttributes,
    openAttributeEditor,
  } = useMetadata();
  const catalog = catalogs.find((c) => c.id === catalogId);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedAttributeId, setSelectedAttributeId] = useState<
    string | null
  >(null);

  useEffect(() => {
    nameInputRef.current?.select();
  }, [catalogId]);

  useEffect(() => {
    ensureCatalogAttributes(catalogId);
  }, [catalogId, ensureCatalogAttributes]);

  if (!catalog) {
    return null;
  }

  const attributes = catalogAttributes[catalogId] ?? [];
  const selectedAttribute =
    attributes.find((a) => a.id === selectedAttributeId) ?? null;

  const nameDuplicate = findDuplicateIdentifier(
    catalog.name,
    catalog.id,
    catalogs,
  );

  const addAttribute = () => {
    const id = addCatalogAttribute(catalogId);
    setSelectedAttributeId(id);
    openAttributeEditor(catalogId, id);
  };

  const removeAttribute = (id: string) => {
    const attr = attributes.find((a) => a.id === id);
    const label = attr?.synonym || attr?.name || "";
    if (!window.confirm(`Удалить реквизит «${label}»?`)) return;
    removeCatalogAttribute(catalogId, id);
    setSelectedAttributeId((current) => (current === id ? null : current));
  };

  const moveAttribute = (id: string, direction: -1 | 1) => {
    const index = attributes.findIndex((a) => a.id === id);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= attributes.length) return;
    const next = [...attributes];
    const [item] = next.splice(index, 1);
    next.splice(newIndex, 0, item);
    reorderCatalogAttributes(
      catalogId,
      next.map((a) => a.id),
    );
  };

  const sortAttributes = () => {
    const sorted = [...attributes].sort((a, b) =>
      a.name.localeCompare(b.name, "ru"),
    );
    reorderCatalogAttributes(
      catalogId,
      sorted.map((a) => a.id),
    );
  };

  return (
    <div className="catalog-editor">
      <div className="catalog-editor-columns">
        <div className="catalog-editor-col">
          <label className="catalog-editor-row">
            <span>Идентификатор:</span>
            <input
              ref={nameInputRef}
              value={catalog.name}
              onChange={(e) =>
                updateCatalog(catalog.id, {
                  name: sanitizeIdentifier(e.target.value),
                })
              }
            />
          </label>
          {nameDuplicate && (
            <p className="catalog-editor-warning">
              Такой идентификатор уже используется другим справочником
            </p>
          )}
          <label className="catalog-editor-row">
            <span>Комментарий:</span>
            <input
              value={catalog.comment}
              onChange={(e) =>
                updateCatalog(catalog.id, { comment: e.target.value })
              }
            />
          </label>

          <div className="catalog-editor-numbers">
            <label className="catalog-editor-row catalog-editor-row-narrow">
              <span>Кол-во. уровней:</span>
              <input
                type="number"
                min={0}
                max={10}
                value={catalog.levels}
                onChange={(e) =>
                  updateCatalog(catalog.id, {
                    levels: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="catalog-editor-row catalog-editor-row-narrow">
              <span>Длина кода:</span>
              <input
                type="number"
                min={1}
                max={25}
                value={catalog.codeLength}
                onChange={(e) =>
                  updateCatalog(catalog.id, {
                    codeLength: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="catalog-editor-row catalog-editor-row-narrow">
              <span>Длина наименования:</span>
              <input
                type="number"
                min={1}
                max={150}
                value={catalog.nameLength}
                onChange={(e) =>
                  updateCatalog(catalog.id, {
                    nameLength: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>

          <fieldset className="catalog-editor-code-type">
            <legend>Тип кода</legend>
            <label>
              <input
                type="radio"
                name={`code-type-${catalog.id}`}
                checked={catalog.codeType === "numeric"}
                onChange={() =>
                  updateCatalog(catalog.id, { codeType: "numeric" })
                }
              />
              Числовой
            </label>
            <label>
              <input
                type="radio"
                name={`code-type-${catalog.id}`}
                checked={catalog.codeType === "text"}
                onChange={() =>
                  updateCatalog(catalog.id, { codeType: "text" })
                }
              />
              Текстовой
            </label>
          </fieldset>
        </div>

        <div className="catalog-editor-col">
          <label className="catalog-editor-row">
            <span>Синоним:</span>
            <input
              value={catalog.synonym}
              onChange={(e) =>
                updateCatalog(catalog.id, { synonym: e.target.value })
              }
            />
          </label>

          <label className="catalog-editor-row">
            <span>Редактировать:</span>
            <select
              value={catalog.editMode}
              onChange={(e) =>
                updateCatalog(catalog.id, {
                  editMode: e.target.value as "list" | "dialog",
                })
              }
            >
              <option value="list">В списке</option>
              <option value="dialog">В диалоге</option>
            </select>
          </label>

          <fieldset className="catalog-attributes">
            <legend>Реквизиты</legend>
            <div className="catalog-attributes-body">
              <div className="catalog-attributes-list">
                {attributes.length === 0 ? (
                  <div className="catalog-attributes-empty">
                    Реквизитов нет
                  </div>
                ) : (
                  attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className={
                        "catalog-attributes-row" +
                        (selectedAttributeId === attr.id
                          ? " catalog-attributes-row-selected"
                          : "")
                      }
                      onClick={() => setSelectedAttributeId(attr.id)}
                      onDoubleClick={() =>
                        openAttributeEditor(catalogId, attr.id)
                      }
                    >
                      {attr.name}
                    </div>
                  ))
                )}
              </div>
              <div className="catalog-attributes-side">
                <button
                  type="button"
                  disabled={!selectedAttribute}
                  title="Переместить вверх"
                  onClick={() =>
                    selectedAttribute &&
                    moveAttribute(selectedAttribute.id, -1)
                  }
                >
                  {"↑"}
                </button>
                <button
                  type="button"
                  disabled={!selectedAttribute}
                  title="Переместить вниз"
                  onClick={() =>
                    selectedAttribute &&
                    moveAttribute(selectedAttribute.id, 1)
                  }
                >
                  {"↓"}
                </button>
                <button
                  type="button"
                  title="Сортировать по алфавиту"
                  onClick={sortAttributes}
                >
                  {"A→Z"}
                </button>
              </div>
            </div>

            <div className="catalog-attributes-actions">
              <button type="button" onClick={addAttribute}>
                Новый
              </button>
              <button
                type="button"
                disabled={!selectedAttribute}
                onClick={() =>
                  selectedAttribute &&
                  openAttributeEditor(catalogId, selectedAttribute.id)
                }
              >
                Изменить
              </button>
              <button
                type="button"
                disabled={!selectedAttribute}
                onClick={() =>
                  selectedAttribute && removeAttribute(selectedAttribute.id)
                }
              >
                Удалить
              </button>
            </div>
          </fieldset>
        </div>
      </div>

      <div className="catalog-editor-footer">
        <button type="button" onClick={() => openItemForm(catalog.id)}>
          Форма элемента
        </button>
      </div>
    </div>
  );
}

export default CatalogEditor;
