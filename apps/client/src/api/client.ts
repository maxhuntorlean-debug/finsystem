// Lightweight guard shared with the Worker's .dev.vars / production secret.
// This ships inside the client bundle, so it is not a real auth boundary —
// see project notes.
const API_KEY = "v5qDBisEYY_tqj26rRGrOLlEtYcGQ81j";

function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", API_KEY);
  return fetch(path, { ...init, headers });
}

export interface CatalogRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  levels: number;
  codeLength: number;
  nameLength: number;
  editMode: "list" | "dialog";
  codeType: "numeric" | "text";
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
}

export async function fetchCatalogs(): Promise<CatalogRecord[]> {
  const res = await apiFetch("/api/catalogs");
  if (!res.ok) {
    throw new Error(`Failed to load catalogs: ${res.status}`);
  }
  return res.json();
}

export async function fetchCatalogItems(
  catalogId: string,
): Promise<CatalogItem[]> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/items`);
  if (!res.ok) {
    throw new Error(`Failed to load catalog items: ${res.status}`);
  }
  return res.json();
}

export async function createCatalogItem(
  catalogId: string,
  name: string,
): Promise<CatalogItem> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create catalog item: ${res.status}`);
  }
  return res.json();
}

export async function updateCatalogItem(
  id: string,
  patch: Partial<Omit<CatalogItem, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/catalog-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update catalog item: ${res.status}`);
  }
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/catalog-items/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete catalog item: ${res.status}`);
  }
}

export interface CatalogAttributeRecord {
  id: string;
  catalogId: string;
  name: string;
  synonym: string;
  comment: string;
  valueType: ConstantValueType;
  referenceCatalogId: string | null;
  valueLength: number;
  valueUnbounded: boolean;
  valuePrecision: number;
  sortOrder: number;
}

export async function fetchCatalogAttributes(
  catalogId: string,
): Promise<CatalogAttributeRecord[]> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/attributes`);
  if (!res.ok) {
    throw new Error(`Failed to load catalog attributes: ${res.status}`);
  }
  return res.json();
}

export async function fetchCatalogItemValues(
  itemId: string,
): Promise<Record<string, string>> {
  const res = await apiFetch(`/api/catalog-items/${itemId}/values`);
  if (!res.ok) {
    throw new Error(`Failed to load catalog item values: ${res.status}`);
  }
  return res.json();
}

export async function updateCatalogItemValue(
  itemId: string,
  attributeId: string,
  value: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/catalog-items/${itemId}/values/${attributeId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to update catalog item value: ${res.status}`);
  }
}

export interface FormControlDto {
  id: string;
  type: "button" | "label" | "input";
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
  fieldId?: string;
  identifier?: string;
  disabled?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  formula?: string;
  skipOnInput?: boolean;
}

export interface CatalogFormDto {
  width: number;
  height: number;
  controls: FormControlDto[];
  module: string;
}

export async function fetchCatalogForm(
  catalogId: string,
): Promise<CatalogFormDto | null> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/form`);
  if (!res.ok) {
    throw new Error(`Failed to load form: ${res.status}`);
  }
  return res.json();
}

export interface ProcessorRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

export async function fetchProcessors(): Promise<ProcessorRecord[]> {
  const res = await apiFetch("/api/processors");
  if (!res.ok) {
    throw new Error(`Failed to load processors: ${res.status}`);
  }
  return res.json();
}

export async function fetchProcessorForm(
  processorId: string,
): Promise<CatalogFormDto | null> {
  const res = await apiFetch(`/api/processors/${processorId}/form`);
  if (!res.ok) {
    throw new Error(`Failed to load form: ${res.status}`);
  }
  return res.json();
}

export interface DocumentRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  numberLength: number;
}

export interface DocumentItem {
  id: string;
  number: string;
  date: string;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await apiFetch("/api/documents");
  if (!res.ok) {
    throw new Error(`Failed to load documents: ${res.status}`);
  }
  return res.json();
}

export async function fetchDocumentItems(
  documentId: string,
): Promise<DocumentItem[]> {
  const res = await apiFetch(`/api/documents/${documentId}/items`);
  if (!res.ok) {
    throw new Error(`Failed to load document items: ${res.status}`);
  }
  return res.json();
}

export async function createDocumentItem(
  documentId: string,
  date?: string,
): Promise<DocumentItem> {
  const res = await apiFetch(`/api/documents/${documentId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create document item: ${res.status}`);
  }
  return res.json();
}

export async function updateDocumentItem(
  id: string,
  patch: Partial<Omit<DocumentItem, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/document-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update document item: ${res.status}`);
  }
}

export async function deleteDocumentItem(id: string): Promise<void> {
  const res = await apiFetch(`/api/document-items/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete document item: ${res.status}`);
  }
}

export async function fetchDocumentForm(
  documentId: string,
): Promise<CatalogFormDto | null> {
  const res = await apiFetch(`/api/documents/${documentId}/form`);
  if (!res.ok) {
    throw new Error(`Failed to load form: ${res.status}`);
  }
  return res.json();
}

export interface ChartRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  codeLength: number;
  levels: number;
}

export type AccountType = "active" | "passive" | "active_passive";

export interface AccountItem {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  currency: boolean;
  quantitative: boolean;
  offBalance: boolean;
}

export async function fetchCharts(): Promise<ChartRecord[]> {
  const res = await apiFetch("/api/charts");
  if (!res.ok) {
    throw new Error(`Failed to load charts: ${res.status}`);
  }
  return res.json();
}

export async function fetchAccounts(
  chartId: string,
): Promise<AccountItem[]> {
  const res = await apiFetch(`/api/charts/${chartId}/accounts`);
  if (!res.ok) {
    throw new Error(`Failed to load accounts: ${res.status}`);
  }
  return res.json();
}

export async function createAccount(
  chartId: string,
  name: string,
): Promise<AccountItem> {
  const res = await apiFetch(`/api/charts/${chartId}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create account: ${res.status}`);
  }
  return res.json();
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<AccountItem, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update account: ${res.status}`);
  }
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await apiFetch(`/api/accounts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete account: ${res.status}`);
  }
}

export async function fetchChartForm(
  chartId: string,
): Promise<CatalogFormDto | null> {
  const res = await apiFetch(`/api/charts/${chartId}/form`);
  if (!res.ok) {
    throw new Error(`Failed to load form: ${res.status}`);
  }
  return res.json();
}

export interface DocumentJournalRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

export interface JournalItem {
  id: string;
  number: string;
  date: string;
  documentMetaId: string;
  documentName: string;
}

export async function fetchDocumentJournals(): Promise<
  DocumentJournalRecord[]
> {
  const res = await apiFetch("/api/document-journals");
  if (!res.ok) {
    throw new Error(`Failed to load document journals: ${res.status}`);
  }
  return res.json();
}

export async function fetchJournalItems(
  journalId: string,
): Promise<JournalItem[]> {
  const res = await apiFetch(`/api/document-journals/${journalId}/items`);
  if (!res.ok) {
    throw new Error(`Failed to load journal items: ${res.status}`);
  }
  return res.json();
}

export type ConstantValueType =
  | "undefined"
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "reference";

export interface ConstantRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  valueType: ConstantValueType;
  value: string;
  referenceCatalogId: string | null;
  valueLength: number;
  valueUnbounded: boolean;
  valuePrecision: number;
}

export async function fetchConstants(): Promise<ConstantRecord[]> {
  const res = await apiFetch("/api/constants");
  if (!res.ok) {
    throw new Error(`Failed to load constants: ${res.status}`);
  }
  return res.json();
}

export async function updateConstantValue(
  id: string,
  value: string,
): Promise<void> {
  const res = await apiFetch(`/api/constants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update constant: ${res.status}`);
  }
}
