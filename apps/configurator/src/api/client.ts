import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

const API_BASE = "https://finsystem.lateshoy.workers.dev";

// Lightweight guard shared with the Worker's .dev.vars / production secret.
// Not a real auth boundary — see project notes.
const API_KEY = "v5qDBisEYY_tqj26rRGrOLlEtYcGQ81j";

// Desktop build (Tauri) needs the plugin-http fetch to bypass the webview's
// CORS enforcement; the PWA build runs in a real browser where the Worker's
// own CORS headers already cover it, so plain fetch works there.
function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", API_KEY);
  const doFetch = isTauri() ? tauriFetch : fetch;
  return doFetch(`${API_BASE}${path}`, { ...init, headers });
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

export async function fetchCatalogs(): Promise<CatalogRecord[]> {
  const res = await apiFetch("/api/catalogs");
  if (!res.ok) {
    throw new Error(`Failed to load catalogs: ${res.status}`);
  }
  return res.json();
}

export async function createCatalogRequest(
  catalog: CatalogRecord,
): Promise<void> {
  const res = await apiFetch("/api/catalogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(catalog),
  });
  if (!res.ok) {
    throw new Error(`Failed to create catalog: ${res.status}`);
  }
}

export async function updateCatalogRequest(
  id: string,
  patch: Partial<Omit<CatalogRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/catalogs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update catalog: ${res.status}`);
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

export async function createCatalogAttributeRequest(
  catalogId: string,
  attribute: Omit<CatalogAttributeRecord, "catalogId" | "sortOrder">,
): Promise<void> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/attributes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attribute),
  });
  if (!res.ok) {
    throw new Error(`Failed to create catalog attribute: ${res.status}`);
  }
}

export async function updateCatalogAttributeRequest(
  id: string,
  patch: Partial<Omit<CatalogAttributeRecord, "id" | "catalogId" | "sortOrder">>,
): Promise<void> {
  const res = await apiFetch(`/api/catalog-attributes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update catalog attribute: ${res.status}`);
  }
}

export async function deleteCatalogAttributeRequest(id: string): Promise<void> {
  const res = await apiFetch(`/api/catalog-attributes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete catalog attribute: ${res.status}`);
  }
}

export async function reorderCatalogAttributesRequest(
  catalogId: string,
  ids: string[],
): Promise<void> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/attributes/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reorder catalog attributes: ${res.status}`);
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

export async function saveCatalogForm(
  catalogId: string,
  form: CatalogFormDto,
): Promise<void> {
  const res = await apiFetch(`/api/catalogs/${catalogId}/form`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    throw new Error(`Failed to save form: ${res.status}`);
  }
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

export async function createProcessorRequest(
  processor: ProcessorRecord,
): Promise<void> {
  const res = await apiFetch("/api/processors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processor),
  });
  if (!res.ok) {
    throw new Error(`Failed to create processor: ${res.status}`);
  }
}

export async function updateProcessorRequest(
  id: string,
  patch: Partial<Omit<ProcessorRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/processors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update processor: ${res.status}`);
  }
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

export async function saveProcessorForm(
  processorId: string,
  form: CatalogFormDto,
): Promise<void> {
  const res = await apiFetch(`/api/processors/${processorId}/form`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    throw new Error(`Failed to save form: ${res.status}`);
  }
}

export interface DocumentRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  numberLength: number;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await apiFetch("/api/documents");
  if (!res.ok) {
    throw new Error(`Failed to load documents: ${res.status}`);
  }
  return res.json();
}

export async function createDocumentRequest(
  document: DocumentRecord,
): Promise<void> {
  const res = await apiFetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(document),
  });
  if (!res.ok) {
    throw new Error(`Failed to create document: ${res.status}`);
  }
}

export async function updateDocumentRequest(
  id: string,
  patch: Partial<Omit<DocumentRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update document: ${res.status}`);
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

export async function saveDocumentForm(
  documentId: string,
  form: CatalogFormDto,
): Promise<void> {
  const res = await apiFetch(`/api/documents/${documentId}/form`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    throw new Error(`Failed to save form: ${res.status}`);
  }
}

export interface ChartRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  codeLength: number;
  levels: number;
}

export async function fetchCharts(): Promise<ChartRecord[]> {
  const res = await apiFetch("/api/charts");
  if (!res.ok) {
    throw new Error(`Failed to load charts: ${res.status}`);
  }
  return res.json();
}

export async function createChartRequest(chart: ChartRecord): Promise<void> {
  const res = await apiFetch("/api/charts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chart),
  });
  if (!res.ok) {
    throw new Error(`Failed to create chart: ${res.status}`);
  }
}

export async function updateChartRequest(
  id: string,
  patch: Partial<Omit<ChartRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/charts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update chart: ${res.status}`);
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

export async function saveChartForm(
  chartId: string,
  form: CatalogFormDto,
): Promise<void> {
  const res = await apiFetch(`/api/charts/${chartId}/form`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    throw new Error(`Failed to save form: ${res.status}`);
  }
}

export interface DocumentJournalRecord {
  id: string;
  name: string;
  synonym: string;
  comment: string;
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

export async function createDocumentJournalRequest(
  journal: DocumentJournalRecord,
): Promise<void> {
  const res = await apiFetch("/api/document-journals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(journal),
  });
  if (!res.ok) {
    throw new Error(`Failed to create document journal: ${res.status}`);
  }
}

export async function updateDocumentJournalRequest(
  id: string,
  patch: Partial<Omit<DocumentJournalRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/document-journals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update document journal: ${res.status}`);
  }
}

export async function fetchJournalMembers(
  journalId: string,
): Promise<string[]> {
  const res = await apiFetch(`/api/document-journals/${journalId}/members`);
  if (!res.ok) {
    throw new Error(`Failed to load journal members: ${res.status}`);
  }
  return res.json();
}

export async function saveJournalMembers(
  journalId: string,
  memberIds: string[],
): Promise<void> {
  const res = await apiFetch(`/api/document-journals/${journalId}/members`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save journal members: ${res.status}`);
  }
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

export async function createConstantRequest(
  constant: ConstantRecord,
): Promise<void> {
  const res = await apiFetch("/api/constants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(constant),
  });
  if (!res.ok) {
    throw new Error(`Failed to create constant: ${res.status}`);
  }
}

export async function updateConstantRequest(
  id: string,
  patch: Partial<Omit<ConstantRecord, "id">>,
): Promise<void> {
  const res = await apiFetch(`/api/constants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Failed to update constant: ${res.status}`);
  }
}
