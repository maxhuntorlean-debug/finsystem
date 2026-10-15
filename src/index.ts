import { Hono } from "hono";
import { cors } from "hono/cors";

interface CatalogDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  levels: number;
  code_length: number;
  name_length: number;
  edit_mode: string;
  code_type: string;
}

interface CatalogApi {
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

function toApi(row: CatalogDbRow): CatalogApi {
  return {
    id: row.id,
    name: row.name,
    synonym: row.synonym,
    comment: row.comment,
    levels: row.levels,
    codeLength: row.code_length,
    nameLength: row.name_length,
    editMode: row.edit_mode === "dialog" ? "dialog" : "list",
    codeType: row.code_type === "text" ? "text" : "numeric",
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") {
    return next();
  }
  const key = c.req.header("X-API-Key");
  if (!key || key !== c.env.API_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/catalogs", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, synonym, comment, levels, code_length, name_length, edit_mode, code_type FROM catalogs ORDER BY created_at",
  ).all<CatalogDbRow>();
  return c.json(results.map(toApi));
});

app.post("/api/catalogs", async (c) => {
  const body = await c.req.json<Partial<CatalogApi>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO catalogs (id, name, synonym, comment, levels, code_length, name_length, edit_mode, code_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      body.name,
      body.synonym ?? "",
      body.comment ?? "",
      body.levels ?? 1,
      body.codeLength ?? 9,
      body.nameLength ?? 25,
      body.editMode ?? "list",
      body.codeType ?? "numeric",
    )
    .run();
  return c.json({ ok: true }, 201);
});

const PATCHABLE_FIELDS: Record<keyof Omit<CatalogApi, "id">, string> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
  levels: "levels",
  codeLength: "code_length",
  nameLength: "name_length",
  editMode: "edit_mode",
  codeType: "code_type",
};

app.patch("/api/catalogs/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<CatalogApi, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    PATCHABLE_FIELDS,
  ) as (keyof typeof PATCHABLE_FIELDS)[]) {
    if (patch[key] !== undefined) {
      fields.push(`${PATCHABLE_FIELDS[key]} = ?`);
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE catalogs SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

interface CatalogItemRow {
  id: string;
  code: string;
  name: string;
}

app.get("/api/catalogs/:catalogId/items", async (c) => {
  const catalogId = c.req.param("catalogId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, code, name FROM catalog_items WHERE catalog_id = ? ORDER BY code",
  )
    .bind(catalogId)
    .all<CatalogItemRow>();
  return c.json(results);
});

app.post("/api/catalogs/:catalogId/items", async (c) => {
  const catalogId = c.req.param("catalogId");
  const catalogRow = await c.env.DB.prepare(
    "SELECT code_length FROM catalogs WHERE id = ?",
  )
    .bind(catalogId)
    .first<{ code_length: number }>();
  if (!catalogRow) {
    return c.json({ error: "catalog not found" }, 404);
  }

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM catalog_items WHERE catalog_id = ?",
  )
    .bind(catalogId)
    .first<{ cnt: number }>();
  const nextNumber = (countRow?.cnt ?? 0) + 1;
  const code = String(nextNumber).padStart(catalogRow.code_length, "0");

  const body = await c.req.json<Partial<{ name: string }>>();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO catalog_items (id, catalog_id, code, name) VALUES (?, ?, ?, ?)",
  )
    .bind(id, catalogId, code, body.name ?? "")
    .run();

  return c.json({ id, code, name: body.name ?? "" }, 201);
});

app.patch("/api/catalog-items/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<{ name: string; code: string }>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.code !== undefined) {
    fields.push("code = ?");
    values.push(patch.code);
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE catalog_items SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/catalog-items/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM catalog_items WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ ok: true });
});

interface CatalogItemValueRow {
  attribute_id: string;
  value: string | number | null;
  value_type: string;
}

function toDisplayValue(valueType: string, stored: string | number | null): string {
  if (valueType === "boolean") {
    return stored === 1 || stored === "1" ? "true" : "false";
  }
  if (stored === null || stored === undefined) return "";
  return String(stored);
}

function toStoredValue(valueType: string, raw: string): string | number {
  if (valueType === "boolean") {
    return raw === "true" ? 1 : 0;
  }
  if (valueType === "number" && raw !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

app.get("/api/catalog-items/:id/values", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare(
    `SELECT v.attribute_id as attribute_id, v.value as value, a.value_type as value_type
     FROM catalog_item_values v
     JOIN catalog_attributes a ON a.id = v.attribute_id
     WHERE v.item_id = ?`,
  )
    .bind(id)
    .all<CatalogItemValueRow>();
  const values: Record<string, string> = {};
  for (const row of results) {
    values[row.attribute_id] = toDisplayValue(row.value_type, row.value);
  }
  return c.json(values);
});

app.put("/api/catalog-items/:id/values/:attributeId", async (c) => {
  const id = c.req.param("id");
  const attributeId = c.req.param("attributeId");
  const body = await c.req.json<{ value?: string }>();

  const attributeRow = await c.env.DB.prepare(
    "SELECT value_type FROM catalog_attributes WHERE id = ?",
  )
    .bind(attributeId)
    .first<{ value_type: string }>();
  const storedValue = toStoredValue(
    attributeRow?.value_type ?? "string",
    body.value ?? "",
  );

  await c.env.DB.prepare(
    `INSERT INTO catalog_item_values (item_id, attribute_id, value)
     VALUES (?, ?, ?)
     ON CONFLICT (item_id, attribute_id) DO UPDATE SET value = excluded.value`,
  )
    .bind(id, attributeId, storedValue)
    .run();
  return c.json({ ok: true });
});

type AttributeValueType =
  | "undefined"
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "reference";

const ATTRIBUTE_VALUE_TYPES: AttributeValueType[] = [
  "undefined",
  "string",
  "number",
  "boolean",
  "date",
  "reference",
];

interface CatalogAttributeDbRow {
  id: string;
  catalog_id: string;
  name: string;
  synonym: string;
  comment: string;
  value_type: string;
  reference_catalog_id: string | null;
  value_length: number;
  value_unbounded: number;
  value_precision: number;
  sort_order: number;
}

interface CatalogAttributeApi {
  id: string;
  catalogId: string;
  name: string;
  synonym: string;
  comment: string;
  valueType: AttributeValueType;
  referenceCatalogId: string | null;
  valueLength: number;
  valueUnbounded: boolean;
  valuePrecision: number;
  sortOrder: number;
}

function toCatalogAttributeApi(row: CatalogAttributeDbRow): CatalogAttributeApi {
  const valueType = ATTRIBUTE_VALUE_TYPES.includes(
    row.value_type as AttributeValueType,
  )
    ? (row.value_type as AttributeValueType)
    : "string";
  return {
    id: row.id,
    catalogId: row.catalog_id,
    name: row.name,
    synonym: row.synonym,
    comment: row.comment,
    valueType,
    referenceCatalogId: row.reference_catalog_id,
    valueLength: row.value_length,
    valueUnbounded: row.value_unbounded === 1,
    valuePrecision: row.value_precision,
    sortOrder: row.sort_order,
  };
}

app.get("/api/catalogs/:catalogId/attributes", async (c) => {
  const catalogId = c.req.param("catalogId");
  const { results } = await c.env.DB.prepare(
    `SELECT id, catalog_id, name, synonym, comment, value_type,
            reference_catalog_id, value_length, value_unbounded, value_precision, sort_order
     FROM catalog_attributes WHERE catalog_id = ? ORDER BY sort_order, created_at`,
  )
    .bind(catalogId)
    .all<CatalogAttributeDbRow>();
  return c.json(results.map(toCatalogAttributeApi));
});

app.post("/api/catalogs/:catalogId/attributes", async (c) => {
  const catalogId = c.req.param("catalogId");
  const body = await c.req.json<Partial<CatalogAttributeApi>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM catalog_attributes WHERE catalog_id = ?",
  )
    .bind(catalogId)
    .first<{ cnt: number }>();
  const sortOrder = countRow?.cnt ?? 0;

  await c.env.DB.prepare(
    `INSERT INTO catalog_attributes
       (id, catalog_id, name, synonym, comment, value_type, reference_catalog_id, value_length, value_unbounded, value_precision, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      catalogId,
      body.name,
      body.synonym ?? "",
      body.comment ?? "",
      body.valueType ?? "string",
      body.referenceCatalogId ?? null,
      body.valueLength ?? 10,
      body.valueUnbounded ? 1 : 0,
      body.valuePrecision ?? 0,
      sortOrder,
    )
    .run();
  return c.json({ ok: true }, 201);
});

app.put("/api/catalogs/:catalogId/attributes/order", async (c) => {
  const catalogId = c.req.param("catalogId");
  const body = await c.req.json<{ ids: string[] }>();

  for (let i = 0; i < body.ids.length; i++) {
    await c.env.DB.prepare(
      "UPDATE catalog_attributes SET sort_order = ? WHERE id = ? AND catalog_id = ?",
    )
      .bind(i, body.ids[i], catalogId)
      .run();
  }
  return c.json({ ok: true });
});

const CATALOG_ATTRIBUTE_PATCHABLE_FIELDS: Record<
  keyof Omit<CatalogAttributeApi, "id" | "catalogId" | "sortOrder">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
  valueType: "value_type",
  referenceCatalogId: "reference_catalog_id",
  valueLength: "value_length",
  valueUnbounded: "value_unbounded",
  valuePrecision: "value_precision",
};

app.patch("/api/catalog-attributes/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<
    Partial<Omit<CatalogAttributeApi, "id" | "catalogId" | "sortOrder">>
  >();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    CATALOG_ATTRIBUTE_PATCHABLE_FIELDS,
  ) as (keyof typeof CATALOG_ATTRIBUTE_PATCHABLE_FIELDS)[]) {
    if (patch[key] === undefined) continue;
    fields.push(`${CATALOG_ATTRIBUTE_PATCHABLE_FIELDS[key]} = ?`);
    values.push(key === "valueUnbounded" ? (patch[key] ? 1 : 0) : patch[key]);
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE catalog_attributes SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/catalog-attributes/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM catalog_attributes WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ ok: true });
});

interface ProcessorDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

app.get("/api/processors", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, synonym, comment FROM processors ORDER BY created_at",
  ).all<ProcessorDbRow>();
  return c.json(results);
});

app.post("/api/processors", async (c) => {
  const body = await c.req.json<Partial<ProcessorDbRow>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    "INSERT INTO processors (id, name, synonym, comment) VALUES (?, ?, ?, ?)",
  )
    .bind(body.id, body.name, body.synonym ?? "", body.comment ?? "")
    .run();
  return c.json({ ok: true }, 201);
});

const PROCESSOR_PATCHABLE_FIELDS: Record<
  keyof Omit<ProcessorDbRow, "id">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
};

app.patch("/api/processors/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<ProcessorDbRow, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    PROCESSOR_PATCHABLE_FIELDS,
  ) as (keyof typeof PROCESSOR_PATCHABLE_FIELDS)[]) {
    if (patch[key] !== undefined) {
      fields.push(`${PROCESSOR_PATCHABLE_FIELDS[key]} = ?`);
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE processors SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

interface DocumentMetaDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  number_length: number;
}

interface DocumentMetaApi {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  numberLength: number;
}

function toDocumentMetaApi(row: DocumentMetaDbRow): DocumentMetaApi {
  return {
    id: row.id,
    name: row.name,
    synonym: row.synonym,
    comment: row.comment,
    numberLength: row.number_length,
  };
}

app.get("/api/documents", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, synonym, comment, number_length FROM documents_meta ORDER BY created_at",
  ).all<DocumentMetaDbRow>();
  return c.json(results.map(toDocumentMetaApi));
});

app.post("/api/documents", async (c) => {
  const body = await c.req.json<Partial<DocumentMetaApi>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO documents_meta (id, name, synonym, comment, number_length)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      body.name,
      body.synonym ?? "",
      body.comment ?? "",
      body.numberLength ?? 9,
    )
    .run();
  return c.json({ ok: true }, 201);
});

const DOCUMENT_META_PATCHABLE_FIELDS: Record<
  keyof Omit<DocumentMetaApi, "id">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
  numberLength: "number_length",
};

app.patch("/api/documents/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<DocumentMetaApi, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    DOCUMENT_META_PATCHABLE_FIELDS,
  ) as (keyof typeof DOCUMENT_META_PATCHABLE_FIELDS)[]) {
    if (patch[key] !== undefined) {
      fields.push(`${DOCUMENT_META_PATCHABLE_FIELDS[key]} = ?`);
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE documents_meta SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

interface DocumentItemRow {
  id: string;
  number: string;
  date: string;
}

app.get("/api/documents/:documentId/items", async (c) => {
  const documentId = c.req.param("documentId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, number, date FROM document_items WHERE document_meta_id = ? ORDER BY date, number",
  )
    .bind(documentId)
    .all<DocumentItemRow>();
  return c.json(results);
});

app.post("/api/documents/:documentId/items", async (c) => {
  const documentId = c.req.param("documentId");
  const docRow = await c.env.DB.prepare(
    "SELECT number_length FROM documents_meta WHERE id = ?",
  )
    .bind(documentId)
    .first<{ number_length: number }>();
  if (!docRow) {
    return c.json({ error: "document not found" }, 404);
  }

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM document_items WHERE document_meta_id = ?",
  )
    .bind(documentId)
    .first<{ cnt: number }>();
  const nextNumber = (countRow?.cnt ?? 0) + 1;
  const number = String(nextNumber).padStart(docRow.number_length, "0");

  const body = await c.req.json<Partial<{ date: string }>>();
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO document_items (id, document_meta_id, number, date) VALUES (?, ?, ?, ?)",
  )
    .bind(id, documentId, number, date)
    .run();

  return c.json({ id, number, date }, 201);
});

app.patch("/api/document-items/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<{ number: string; date: string }>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.number !== undefined) {
    fields.push("number = ?");
    values.push(patch.number);
  }
  if (patch.date !== undefined) {
    fields.push("date = ?");
    values.push(patch.date);
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE document_items SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/document-items/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM document_items WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ ok: true });
});

interface ChartMetaDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  code_length: number;
  levels: number;
}

interface ChartMetaApi {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  codeLength: number;
  levels: number;
}

function toChartMetaApi(row: ChartMetaDbRow): ChartMetaApi {
  return {
    id: row.id,
    name: row.name,
    synonym: row.synonym,
    comment: row.comment,
    codeLength: row.code_length,
    levels: row.levels,
  };
}

app.get("/api/charts", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, synonym, comment, code_length, levels FROM chart_of_accounts_meta ORDER BY created_at",
  ).all<ChartMetaDbRow>();
  return c.json(results.map(toChartMetaApi));
});

app.post("/api/charts", async (c) => {
  const body = await c.req.json<Partial<ChartMetaApi>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO chart_of_accounts_meta (id, name, synonym, comment, code_length, levels)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      body.name,
      body.synonym ?? "",
      body.comment ?? "",
      body.codeLength ?? 2,
      body.levels ?? 1,
    )
    .run();
  return c.json({ ok: true }, 201);
});

const CHART_META_PATCHABLE_FIELDS: Record<
  keyof Omit<ChartMetaApi, "id">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
  codeLength: "code_length",
  levels: "levels",
};

app.patch("/api/charts/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<ChartMetaApi, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    CHART_META_PATCHABLE_FIELDS,
  ) as (keyof typeof CHART_META_PATCHABLE_FIELDS)[]) {
    if (patch[key] !== undefined) {
      fields.push(`${CHART_META_PATCHABLE_FIELDS[key]} = ?`);
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE chart_of_accounts_meta SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

interface AccountDbRow {
  id: string;
  code: string;
  name: string;
  account_type: string;
  currency: number;
  quantitative: number;
  off_balance: number;
}

interface AccountApi {
  id: string;
  code: string;
  name: string;
  accountType: "active" | "passive" | "active_passive";
  currency: boolean;
  quantitative: boolean;
  offBalance: boolean;
}

function toAccountApi(row: AccountDbRow): AccountApi {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    accountType:
      row.account_type === "passive"
        ? "passive"
        : row.account_type === "active_passive"
          ? "active_passive"
          : "active",
    currency: row.currency === 1,
    quantitative: row.quantitative === 1,
    offBalance: row.off_balance === 1,
  };
}

app.get("/api/charts/:chartId/accounts", async (c) => {
  const chartId = c.req.param("chartId");
  const { results } = await c.env.DB.prepare(
    "SELECT id, code, name, account_type, currency, quantitative, off_balance FROM chart_of_accounts_items WHERE chart_meta_id = ? ORDER BY code",
  )
    .bind(chartId)
    .all<AccountDbRow>();
  return c.json(results.map(toAccountApi));
});

app.post("/api/charts/:chartId/accounts", async (c) => {
  const chartId = c.req.param("chartId");
  const chartRow = await c.env.DB.prepare(
    "SELECT code_length FROM chart_of_accounts_meta WHERE id = ?",
  )
    .bind(chartId)
    .first<{ code_length: number }>();
  if (!chartRow) {
    return c.json({ error: "chart not found" }, 404);
  }

  const countRow = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM chart_of_accounts_items WHERE chart_meta_id = ?",
  )
    .bind(chartId)
    .first<{ cnt: number }>();
  const nextNumber = (countRow?.cnt ?? 0) + 1;
  const code = String(nextNumber).padStart(chartRow.code_length, "0");

  const body = await c.req.json<Partial<{ name: string }>>();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO chart_of_accounts_items (id, chart_meta_id, code, name) VALUES (?, ?, ?, ?)",
  )
    .bind(id, chartId, code, body.name ?? "")
    .run();

  return c.json({
    id,
    code,
    name: body.name ?? "",
    accountType: "active",
    currency: false,
    quantitative: false,
    offBalance: false,
  } satisfies AccountApi);
});

const ACCOUNT_PATCHABLE_FIELDS: Record<keyof Omit<AccountApi, "id">, string> =
  {
    code: "code",
    name: "name",
    accountType: "account_type",
    currency: "currency",
    quantitative: "quantitative",
    offBalance: "off_balance",
  };

app.patch("/api/accounts/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<AccountApi, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    ACCOUNT_PATCHABLE_FIELDS,
  ) as (keyof typeof ACCOUNT_PATCHABLE_FIELDS)[]) {
    if (patch[key] === undefined) continue;
    const column = ACCOUNT_PATCHABLE_FIELDS[key];
    fields.push(`${column} = ?`);
    if (key === "currency" || key === "quantitative" || key === "offBalance") {
      values.push(patch[key] ? 1 : 0);
    } else {
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE chart_of_accounts_items SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/accounts/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM chart_of_accounts_items WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ ok: true });
});

interface JournalMetaDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
}

app.get("/api/document-journals", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, synonym, comment FROM document_journals_meta ORDER BY created_at",
  ).all<JournalMetaDbRow>();
  return c.json(results);
});

app.post("/api/document-journals", async (c) => {
  const body = await c.req.json<Partial<JournalMetaDbRow>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    "INSERT INTO document_journals_meta (id, name, synonym, comment) VALUES (?, ?, ?, ?)",
  )
    .bind(body.id, body.name, body.synonym ?? "", body.comment ?? "")
    .run();
  return c.json({ ok: true }, 201);
});

const JOURNAL_META_PATCHABLE_FIELDS: Record<
  keyof Omit<JournalMetaDbRow, "id">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
};

app.patch("/api/document-journals/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<JournalMetaDbRow, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    JOURNAL_META_PATCHABLE_FIELDS,
  ) as (keyof typeof JOURNAL_META_PATCHABLE_FIELDS)[]) {
    if (patch[key] !== undefined) {
      fields.push(`${JOURNAL_META_PATCHABLE_FIELDS[key]} = ?`);
      values.push(patch[key]);
    }
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE document_journals_meta SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.get("/api/document-journals/:id/members", async (c) => {
  const journalId = c.req.param("id");
  const { results } = await c.env.DB.prepare(
    "SELECT document_meta_id FROM document_journal_members WHERE journal_id = ?",
  )
    .bind(journalId)
    .all<{ document_meta_id: string }>();
  return c.json(results.map((r) => r.document_meta_id));
});

app.put("/api/document-journals/:id/members", async (c) => {
  const journalId = c.req.param("id");
  const body = await c.req.json<{ memberIds: string[] }>();

  await c.env.DB.prepare(
    "DELETE FROM document_journal_members WHERE journal_id = ?",
  )
    .bind(journalId)
    .run();

  for (const documentMetaId of body.memberIds) {
    await c.env.DB.prepare(
      "INSERT INTO document_journal_members (journal_id, document_meta_id) VALUES (?, ?)",
    )
      .bind(journalId, documentMetaId)
      .run();
  }

  return c.json({ ok: true });
});

interface JournalItemRow {
  id: string;
  number: string;
  date: string;
  document_meta_id: string;
  document_name: string;
  document_synonym: string;
}

app.get("/api/document-journals/:id/items", async (c) => {
  const journalId = c.req.param("id");
  const { results } = await c.env.DB.prepare(
    `SELECT di.id, di.number, di.date, di.document_meta_id,
            dm.name as document_name, dm.synonym as document_synonym
     FROM document_items di
     JOIN documents_meta dm ON dm.id = di.document_meta_id
     WHERE di.document_meta_id IN (
       SELECT document_meta_id FROM document_journal_members WHERE journal_id = ?
     )
     ORDER BY di.date, di.number`,
  )
    .bind(journalId)
    .all<JournalItemRow>();
  return c.json(
    results.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date,
      documentMetaId: r.document_meta_id,
      documentName: r.document_synonym || r.document_name,
    })),
  );
});

interface ConstantDbRow {
  id: string;
  name: string;
  synonym: string;
  comment: string;
  value_type: string;
  value: string;
  reference_catalog_id: string | null;
  value_length: number;
  value_unbounded: number;
  value_precision: number;
}

type ConstantValueType =
  | "undefined"
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "reference";

interface ConstantApi {
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

const CONSTANT_VALUE_TYPES: ConstantValueType[] = [
  "undefined",
  "string",
  "number",
  "boolean",
  "date",
  "reference",
];

function toConstantApi(row: ConstantDbRow): ConstantApi {
  const valueType = CONSTANT_VALUE_TYPES.includes(
    row.value_type as ConstantValueType,
  )
    ? (row.value_type as ConstantValueType)
    : "string";
  return {
    id: row.id,
    name: row.name,
    synonym: row.synonym,
    comment: row.comment,
    valueType,
    value: row.value,
    referenceCatalogId: row.reference_catalog_id,
    valueLength: row.value_length,
    valueUnbounded: row.value_unbounded === 1,
    valuePrecision: row.value_precision,
  };
}

app.get("/api/constants", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, synonym, comment, value_type, value,
            reference_catalog_id, value_length, value_unbounded, value_precision
     FROM constants_meta ORDER BY created_at`,
  ).all<ConstantDbRow>();
  return c.json(results.map(toConstantApi));
});

app.post("/api/constants", async (c) => {
  const body = await c.req.json<Partial<ConstantApi>>();
  if (!body.id || !body.name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  await c.env.DB.prepare(
    `INSERT INTO constants_meta (id, name, synonym, comment, value_type, value, value_length)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      body.name,
      body.synonym ?? "",
      body.comment ?? "",
      body.valueType ?? "string",
      body.value ?? "",
      body.valueLength ?? 10,
    )
    .run();
  return c.json({ ok: true }, 201);
});

const CONSTANT_PATCHABLE_FIELDS: Record<
  keyof Omit<ConstantApi, "id">,
  string
> = {
  name: "name",
  synonym: "synonym",
  comment: "comment",
  valueType: "value_type",
  value: "value",
  referenceCatalogId: "reference_catalog_id",
  valueLength: "value_length",
  valueUnbounded: "value_unbounded",
  valuePrecision: "value_precision",
};

app.patch("/api/constants/:id", async (c) => {
  const id = c.req.param("id");
  const patch = await c.req.json<Partial<Omit<ConstantApi, "id">>>();

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(
    CONSTANT_PATCHABLE_FIELDS,
  ) as (keyof typeof CONSTANT_PATCHABLE_FIELDS)[]) {
    if (patch[key] === undefined) continue;
    fields.push(`${CONSTANT_PATCHABLE_FIELDS[key]} = ?`);
    values.push(key === "valueUnbounded" ? (patch[key] ? 1 : 0) : patch[key]);
  }
  if (fields.length === 0) {
    return c.json({ error: "no fields to update" }, 400);
  }
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE constants_meta SET ${fields.join(", ")} WHERE id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

app.delete("/api/constants/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM constants_meta WHERE id = ?")
    .bind(id)
    .run();
  return c.json({ ok: true });
});

interface FormControlDto {
  id: string;
  type: "button" | "label" | "input";
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
  fieldId?: string;
}

interface CatalogFormRow {
  canvas_width: number;
  canvas_height: number;
  controls: string;
  module: string;
}

app.get("/api/catalogs/:catalogId/form", async (c) => {
  const catalogId = c.req.param("catalogId");
  const row = await c.env.DB.prepare(
    "SELECT canvas_width, canvas_height, controls, module FROM catalog_forms WHERE catalog_id = ?",
  )
    .bind(catalogId)
    .first<CatalogFormRow>();
  if (!row) {
    return c.json(null);
  }
  return c.json({
    width: row.canvas_width,
    height: row.canvas_height,
    controls: JSON.parse(row.controls) as FormControlDto[],
    module: row.module ?? "",
  });
});

app.put("/api/catalogs/:catalogId/form", async (c) => {
  const catalogId = c.req.param("catalogId");
  const body = await c.req.json<{
    width: number;
    height: number;
    controls: FormControlDto[];
    module?: string;
  }>();

  await c.env.DB.prepare(
    `INSERT INTO catalog_forms (catalog_id, canvas_width, canvas_height, controls, module, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(catalog_id) DO UPDATE SET
       canvas_width = excluded.canvas_width,
       canvas_height = excluded.canvas_height,
       controls = excluded.controls,
       module = excluded.module,
       updated_at = excluded.updated_at`,
  )
    .bind(
      catalogId,
      body.width,
      body.height,
      JSON.stringify(body.controls),
      body.module ?? "",
    )
    .run();

  return c.json({ ok: true });
});

interface ProcessorFormRow {
  canvas_width: number;
  canvas_height: number;
  controls: string;
  module: string;
}

app.get("/api/processors/:processorId/form", async (c) => {
  const processorId = c.req.param("processorId");
  const row = await c.env.DB.prepare(
    "SELECT canvas_width, canvas_height, controls, module FROM processor_forms WHERE processor_id = ?",
  )
    .bind(processorId)
    .first<ProcessorFormRow>();
  if (!row) {
    return c.json(null);
  }
  return c.json({
    width: row.canvas_width,
    height: row.canvas_height,
    controls: JSON.parse(row.controls) as FormControlDto[],
    module: row.module ?? "",
  });
});

app.put("/api/processors/:processorId/form", async (c) => {
  const processorId = c.req.param("processorId");
  const body = await c.req.json<{
    width: number;
    height: number;
    controls: FormControlDto[];
    module?: string;
  }>();

  await c.env.DB.prepare(
    `INSERT INTO processor_forms (processor_id, canvas_width, canvas_height, controls, module, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(processor_id) DO UPDATE SET
       canvas_width = excluded.canvas_width,
       canvas_height = excluded.canvas_height,
       controls = excluded.controls,
       module = excluded.module,
       updated_at = excluded.updated_at`,
  )
    .bind(
      processorId,
      body.width,
      body.height,
      JSON.stringify(body.controls),
      body.module ?? "",
    )
    .run();

  return c.json({ ok: true });
});

interface DocumentFormRow {
  canvas_width: number;
  canvas_height: number;
  controls: string;
  module: string;
}

app.get("/api/documents/:documentId/form", async (c) => {
  const documentId = c.req.param("documentId");
  const row = await c.env.DB.prepare(
    "SELECT canvas_width, canvas_height, controls, module FROM document_forms WHERE document_meta_id = ?",
  )
    .bind(documentId)
    .first<DocumentFormRow>();
  if (!row) {
    return c.json(null);
  }
  return c.json({
    width: row.canvas_width,
    height: row.canvas_height,
    controls: JSON.parse(row.controls) as FormControlDto[],
    module: row.module ?? "",
  });
});

app.put("/api/documents/:documentId/form", async (c) => {
  const documentId = c.req.param("documentId");
  const body = await c.req.json<{
    width: number;
    height: number;
    controls: FormControlDto[];
    module?: string;
  }>();

  await c.env.DB.prepare(
    `INSERT INTO document_forms (document_meta_id, canvas_width, canvas_height, controls, module, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(document_meta_id) DO UPDATE SET
       canvas_width = excluded.canvas_width,
       canvas_height = excluded.canvas_height,
       controls = excluded.controls,
       module = excluded.module,
       updated_at = excluded.updated_at`,
  )
    .bind(
      documentId,
      body.width,
      body.height,
      JSON.stringify(body.controls),
      body.module ?? "",
    )
    .run();

  return c.json({ ok: true });
});

interface ChartFormRow {
  canvas_width: number;
  canvas_height: number;
  controls: string;
  module: string;
}

app.get("/api/charts/:chartId/form", async (c) => {
  const chartId = c.req.param("chartId");
  const row = await c.env.DB.prepare(
    "SELECT canvas_width, canvas_height, controls, module FROM chart_of_accounts_forms WHERE chart_meta_id = ?",
  )
    .bind(chartId)
    .first<ChartFormRow>();
  if (!row) {
    return c.json(null);
  }
  return c.json({
    width: row.canvas_width,
    height: row.canvas_height,
    controls: JSON.parse(row.controls) as FormControlDto[],
    module: row.module ?? "",
  });
});

app.put("/api/charts/:chartId/form", async (c) => {
  const chartId = c.req.param("chartId");
  const body = await c.req.json<{
    width: number;
    height: number;
    controls: FormControlDto[];
    module?: string;
  }>();

  await c.env.DB.prepare(
    `INSERT INTO chart_of_accounts_forms (chart_meta_id, canvas_width, canvas_height, controls, module, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(chart_meta_id) DO UPDATE SET
       canvas_width = excluded.canvas_width,
       canvas_height = excluded.canvas_height,
       controls = excluded.controls,
       module = excluded.module,
       updated_at = excluded.updated_at`,
  )
    .bind(
      chartId,
      body.width,
      body.height,
      JSON.stringify(body.controls),
      body.module ?? "",
    )
    .run();

  return c.json({ ok: true });
});

export default app;
