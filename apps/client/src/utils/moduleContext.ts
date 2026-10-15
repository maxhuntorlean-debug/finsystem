import { useState } from "react";
import {
  fetchCatalogItems,
  updateConstantValue,
  type CatalogItem,
  type CatalogRecord,
  type ConstantRecord,
  type FormControlDto,
} from "../api/client";

export interface ElementProxy {
  caption: string;
  color: string;
  background: string;
}

export type ElementOverrides = Record<
  string,
  { caption?: string; color?: string; background?: string }
>;

// Access to form controls by identifier, e.g. elements.Knopka1.caption = "...",
// elements.Knopka1.color = "red", elements.Knopka1.background = "yellow".
export function useElementsOverrides(controls: FormControlDto[]) {
  const [overrides, setOverrides] = useState<ElementOverrides>({});

  const setOverride = (
    id: string,
    patch: { caption?: string; color?: string; background?: string },
  ) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const elements: Record<string, ElementProxy> = {};
  controls.forEach((control) => {
    if (!control.identifier) return;
    elements[control.identifier] = {
      get caption() {
        return overrides[control.id]?.caption ?? control.caption;
      },
      set caption(value: string) {
        setOverride(control.id, { caption: value });
      },
      get color() {
        return overrides[control.id]?.color ?? "";
      },
      set color(value: string) {
        setOverride(control.id, { color: value });
      },
      get background() {
        return overrides[control.id]?.background ?? "";
      },
      set background(value: string) {
        setOverride(control.id, { background: value });
      },
    } as ElementProxy;
  });

  return { overrides, elements };
}

// Access to catalogs by identifier, e.g. const items = await catalogs.Клиенты.selectAll();
export function buildCatalogsAccess(
  catalogs: CatalogRecord[],
): Record<string, { selectAll: () => Promise<CatalogItem[]> }> {
  const catalogsContext: Record<
    string,
    { selectAll: () => Promise<CatalogItem[]> }
  > = {};
  catalogs.forEach((catalog) => {
    catalogsContext[catalog.name] = {
      selectAll: () => fetchCatalogItems(catalog.id),
    };
  });
  return catalogsContext;
}

// Access to constants by identifier, e.g. constants.СтавкаНДС.value / = "20".
export function useConstantsAccess(constants: ConstantRecord[]) {
  const [constantOverrides, setConstantOverrides] = useState<
    Record<string, string>
  >({});

  const constantsContext: Record<string, { value: string }> = {};
  constants.forEach((constant) => {
    constantsContext[constant.name] = {
      get value() {
        return constantOverrides[constant.id] ?? constant.value;
      },
      set value(v: string) {
        setConstantOverrides((prev) => ({ ...prev, [constant.id]: v }));
        updateConstantValue(constant.id, v).catch((err) =>
          console.error("Не удалось сохранить константу", err),
        );
      },
    };
  });

  return constantsContext;
}

export function formatLogArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}
