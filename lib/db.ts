import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { OrderRecord } from "@/lib/types";

const dbPath = process.env.ORDER_TRACKER_DB_PATH || path.join(process.cwd(), "data", "orders.db");
const dataDir = path.dirname(dbPath);
const backupDir = path.join(dataDir, "backups");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    contact_no TEXT PRIMARY KEY,
    contract_date TEXT,
    contract_no TEXT,
    customer_name TEXT,
    country TEXT,
    material_no TEXT,
    product_name TEXT,
    spec TEXT,
    batch_no TEXT,
    package_form TEXT,
    quality_standard TEXT,
    unit_price REAL,
    quantity REAL,
    contract_amount REAL,
    export_type TEXT,
    region TEXT,
    internal_contract_no TEXT,
    raw_material_request_date TEXT,
    package_confirm_date TEXT,
    prepayment_received_date TEXT,
    contact_approval_done_date TEXT,
    customer_extra_due_date TEXT,
    computed_due_date TEXT,
    planned_production_date TEXT,
    actual_production_done_date TEXT,
    shipped_date TEXT,
    invoice_done_date TEXT,
    contract_remit_date TEXT,
    final_payment_received_date TEXT,
    need_prepayment INTEGER DEFAULT 1,
    final_payment_rule TEXT DEFAULT 'AFTER_SHIPMENT',
    completed_requires_final_payment INTEGER DEFAULT 0,
    notes TEXT,
    last_follow_up_date TEXT,
    is_key_order INTEGER DEFAULT 0,
    is_pinned INTEGER DEFAULT 0,
    custom_tags TEXT,
    stage_override TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_no TEXT NOT NULL,
    batch_index INTEGER,
    batch_code TEXT,
    batch_quantity REAL,
    batch_production_done_date TEXT,
    batch_shipped_date TEXT,
    notes TEXT,
    FOREIGN KEY(contact_no) REFERENCES orders(contact_no) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
if (!orderColumns.some((column) => column.name === "is_pinned")) {
  db.exec("ALTER TABLE orders ADD COLUMN is_pinned INTEGER DEFAULT 0");
}

const nowText = () => new Date().toISOString();
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
let autoBackupCheckedAt = 0;

export const ORDER_FIELDS: Array<keyof OrderRecord> = ["contract_date", "contract_no", "customer_name", "country", "contact_no", "material_no", "product_name", "spec", "batch_no", "package_form", "quality_standard", "unit_price", "quantity", "contract_amount", "export_type", "region", "internal_contract_no", "raw_material_request_date", "package_confirm_date", "prepayment_received_date", "contact_approval_done_date", "customer_extra_due_date", "computed_due_date", "planned_production_date", "actual_production_done_date", "shipped_date", "invoice_done_date", "contract_remit_date", "final_payment_received_date", "need_prepayment", "final_payment_rule", "completed_requires_final_payment", "notes", "last_follow_up_date", "is_key_order", "is_pinned", "custom_tags", "stage_override", "created_at", "updated_at"];

export function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeBoolean(value: unknown, defaultValue = 0) {
  if (value === null || value === undefined || value === "") return defaultValue;
  if (typeof value === "number") return value ? 1 : 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "是"].includes(text)) return 1;
  if (["0", "false", "no", "n", "否"].includes(text)) return 0;
  return defaultValue;
}

export function normalizeDateInput(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  const excelSerial = Number(text);
  if (Number.isFinite(excelSerial) && /^\d+(\.\d+)?$/.test(text)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(epoch.getTime() + excelSerial * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const normalized = text.replace(/[./]/g, "-");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString().slice(0, 10);
}

export function getAppSetting(key: string) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppSetting(key: string, value: string) {
  db.prepare(`
    INSERT INTO app_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function formatBackupTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function sanitizeBackupReason(reason: string) {
  return reason.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "manual";
}

export function listBackups() {
  if (!fs.existsSync(backupDir)) return [] as Array<{ fileName: string; size: number; modifiedAt: string }>;
  return fs.readdirSync(backupDir)
    .filter((fileName) => fileName.endsWith(".db"))
    .map((fileName) => {
      const fullPath = path.join(backupDir, fileName);
      const stat = fs.statSync(fullPath);
      return { fileName, size: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

function cleanupOldBackups() {
  const keepCount = Math.max(1, Number(getAppSetting("backup_keep_count") || "20") || 20);
  const backups = listBackups();
  for (const backup of backups.slice(keepCount)) {
    fs.rmSync(path.join(backupDir, backup.fileName), { force: true });
  }
}

export function createBackup(reason = "manual") {
  const fileBase = path.basename(dbPath, path.extname(dbPath));
  const backupName = `${fileBase}-${sanitizeBackupReason(reason)}-${formatBackupTimestamp()}.db`;
  const backupPath = path.join(backupDir, backupName);

  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    db.pragma("wal_checkpoint(PASSIVE)");
  }

  fs.copyFileSync(dbPath, backupPath);
  cleanupOldBackups();
  setAppSetting("backup_last_run_at", nowText());
  setAppSetting("backup_last_file", backupName);
  return { fileName: backupName, fullPath: backupPath };
}

function maybeRunScheduledBackup() {
  if (IS_BUILD_PHASE) return;

  const now = Date.now();
  if (now - autoBackupCheckedAt < 60_000) return;
  autoBackupCheckedAt = now;

  const enabled = getAppSetting("backup_auto_enabled") === "1";
  if (!enabled) return;

  const intervalHours = Math.max(1, Number(getAppSetting("backup_interval_hours") || "24") || 24);
  const lastRunAt = getAppSetting("backup_last_run_at");
  const lastRunMs = lastRunAt ? new Date(lastRunAt).getTime() : 0;
  if (lastRunMs && now - lastRunMs < intervalHours * 3600_000) return;

  createBackup("auto");
}

export function listOrders(): OrderRecord[] {
  maybeRunScheduledBackup();
  return db.prepare("SELECT * FROM orders ORDER BY updated_at DESC").all() as OrderRecord[];
}

export function getOrder(contactNo: string): OrderRecord | undefined {
  maybeRunScheduledBackup();
  return db.prepare("SELECT * FROM orders WHERE contact_no = ?").get(contactNo) as OrderRecord | undefined;
}

export function deleteOrder(contactNo: string): boolean {
  maybeRunScheduledBackup();
  const removeOrder = db.transaction((targetContactNo: string) => {
    db.prepare("DELETE FROM order_batches WHERE contact_no = ?").run(targetContactNo);
    return db.prepare("DELETE FROM orders WHERE contact_no = ?").run(targetContactNo);
  });
  const info = removeOrder(contactNo);
  return info.changes > 0;
}

function buildOrderPayload(input: Partial<OrderRecord> & { contact_no: string }) {
  const timestamp = nowText();
  const existing = getOrder(input.contact_no);
  return {
    contract_date: normalizeDateInput(input.contract_date),
    contract_no: normalizeNullableText(input.contract_no),
    customer_name: normalizeNullableText(input.customer_name),
    country: normalizeNullableText(input.country),
    contact_no: normalizeNullableText(input.contact_no),
    material_no: normalizeNullableText(input.material_no),
    product_name: normalizeNullableText(input.product_name),
    spec: normalizeNullableText(input.spec),
    batch_no: normalizeNullableText(input.batch_no),
    package_form: normalizeNullableText(input.package_form),
    quality_standard: normalizeNullableText(input.quality_standard),
    unit_price: normalizeNullableNumber(input.unit_price),
    quantity: normalizeNullableNumber(input.quantity),
    contract_amount: normalizeNullableNumber(input.contract_amount),
    export_type: normalizeNullableText(input.export_type),
    region: normalizeNullableText(input.region),
    internal_contract_no: normalizeNullableText(input.internal_contract_no),
    raw_material_request_date: normalizeDateInput(input.raw_material_request_date),
    package_confirm_date: normalizeDateInput(input.package_confirm_date),
    prepayment_received_date: normalizeDateInput(input.prepayment_received_date),
    contact_approval_done_date: normalizeDateInput(input.contact_approval_done_date),
    customer_extra_due_date: normalizeDateInput(input.customer_extra_due_date),
    computed_due_date: normalizeDateInput(input.computed_due_date),
    planned_production_date: normalizeDateInput(input.planned_production_date),
    actual_production_done_date: normalizeDateInput(input.actual_production_done_date),
    shipped_date: normalizeDateInput(input.shipped_date),
    invoice_done_date: normalizeDateInput(input.invoice_done_date),
    contract_remit_date: normalizeDateInput(input.contract_remit_date),
    final_payment_received_date: normalizeDateInput(input.final_payment_received_date),
    need_prepayment: normalizeBoolean(input.need_prepayment, 1),
    final_payment_rule: normalizeNullableText(input.final_payment_rule) || "AFTER_SHIPMENT",
    completed_requires_final_payment: normalizeBoolean(input.completed_requires_final_payment, 0),
    notes: normalizeNullableText(input.notes),
    last_follow_up_date: normalizeDateInput(input.last_follow_up_date),
    is_key_order: normalizeBoolean(input.is_key_order, 0),
    is_pinned: normalizeBoolean(input.is_pinned, 0),
    custom_tags: normalizeNullableText(input.custom_tags),
    stage_override: normalizeNullableText(input.stage_override),
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp
  };
}

const upsertStatement = db.prepare(`
  INSERT INTO orders (
    contract_date, contract_no, customer_name, country, contact_no, material_no, product_name, spec, batch_no, package_form,
    quality_standard, unit_price, quantity, contract_amount, export_type, region, internal_contract_no, raw_material_request_date,
    package_confirm_date, prepayment_received_date, contact_approval_done_date, customer_extra_due_date, computed_due_date,
    planned_production_date, actual_production_done_date, shipped_date, invoice_done_date, contract_remit_date,
    final_payment_received_date, need_prepayment, final_payment_rule, completed_requires_final_payment, notes,
    last_follow_up_date, is_key_order, is_pinned, custom_tags, stage_override, created_at, updated_at
  ) VALUES (
    @contract_date, @contract_no, @customer_name, @country, @contact_no, @material_no, @product_name, @spec, @batch_no, @package_form,
    @quality_standard, @unit_price, @quantity, @contract_amount, @export_type, @region, @internal_contract_no, @raw_material_request_date,
    @package_confirm_date, @prepayment_received_date, @contact_approval_done_date, @customer_extra_due_date, @computed_due_date,
    @planned_production_date, @actual_production_done_date, @shipped_date, @invoice_done_date, @contract_remit_date,
    @final_payment_received_date, @need_prepayment, @final_payment_rule, @completed_requires_final_payment, @notes,
    @last_follow_up_date, @is_key_order, @is_pinned, @custom_tags, @stage_override, @created_at, @updated_at
  )
  ON CONFLICT(contact_no) DO UPDATE SET
    contract_date=excluded.contract_date,
    contract_no=excluded.contract_no,
    customer_name=excluded.customer_name,
    country=excluded.country,
    material_no=excluded.material_no,
    product_name=excluded.product_name,
    spec=excluded.spec,
    batch_no=excluded.batch_no,
    package_form=excluded.package_form,
    quality_standard=excluded.quality_standard,
    unit_price=excluded.unit_price,
    quantity=excluded.quantity,
    contract_amount=excluded.contract_amount,
    export_type=excluded.export_type,
    region=excluded.region,
    internal_contract_no=excluded.internal_contract_no,
    raw_material_request_date=excluded.raw_material_request_date,
    package_confirm_date=excluded.package_confirm_date,
    prepayment_received_date=excluded.prepayment_received_date,
    contact_approval_done_date=excluded.contact_approval_done_date,
    customer_extra_due_date=excluded.customer_extra_due_date,
    computed_due_date=excluded.computed_due_date,
    planned_production_date=excluded.planned_production_date,
    actual_production_done_date=excluded.actual_production_done_date,
    shipped_date=excluded.shipped_date,
    invoice_done_date=excluded.invoice_done_date,
    contract_remit_date=excluded.contract_remit_date,
    final_payment_received_date=excluded.final_payment_received_date,
    need_prepayment=excluded.need_prepayment,
    final_payment_rule=excluded.final_payment_rule,
    completed_requires_final_payment=excluded.completed_requires_final_payment,
    notes=excluded.notes,
    last_follow_up_date=excluded.last_follow_up_date,
    is_key_order=excluded.is_key_order,
    is_pinned=excluded.is_pinned,
    custom_tags=excluded.custom_tags,
    stage_override=excluded.stage_override,
    updated_at=excluded.updated_at
`);

export function upsertOrder(input: Partial<OrderRecord> & { contact_no: string }) {
  maybeRunScheduledBackup();
  upsertStatement.run(buildOrderPayload(input));
}

export function saveOrderRecord(input: Partial<OrderRecord> & { contact_no: string }, originalContactNo?: string) {
  maybeRunScheduledBackup();
  const save = db.transaction((nextInput: Partial<OrderRecord> & { contact_no: string }, previousContactNo?: string) => {
    const nextContactNo = nextInput.contact_no.trim();
    const sourceContactNo = previousContactNo?.trim();

    if (sourceContactNo && sourceContactNo !== nextContactNo) {
      db.prepare("UPDATE order_batches SET contact_no = ? WHERE contact_no = ?").run(nextContactNo, sourceContactNo);
      db.prepare("DELETE FROM orders WHERE contact_no = ?").run(sourceContactNo);
    }

    upsertStatement.run(buildOrderPayload({ ...nextInput, contact_no: nextContactNo }));
  });

  save(input, originalContactNo);
}

export function upsertOrdersBulk(inputs: Array<Partial<OrderRecord> & { contact_no: string }>) {
  maybeRunScheduledBackup();
  const bulkInsert = db.transaction((rows: Array<Partial<OrderRecord> & { contact_no: string }>) => {
    for (const row of rows) upsertStatement.run(buildOrderPayload(row));
  });

  bulkInsert(inputs);
}

export function seedDemoData() {
  const count = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
  if (count.count > 0) return;

  [
    { contact_no: "LX-1001", customer_name: "青禾制药", product_name: "维生素C", spec: "25kg/桶", quantity: 1200, contract_no: "HT-2026-001", country: "越南", computed_due_date: "2026-03-28", contact_approval_done_date: "2026-03-12", planned_production_date: null, need_prepayment: 1, prepayment_received_date: "2026-03-10", package_confirm_date: "2026-03-09", is_key_order: 1, notes: "示例：待排产风险单" },
    { contact_no: "LX-1002", customer_name: "南洋贸易", product_name: "乳糖", spec: "20kg/袋", quantity: 3000, contract_no: "HT-2026-002", country: "泰国", computed_due_date: "2026-03-25", contact_approval_done_date: "2026-03-05", planned_production_date: "2026-03-10", actual_production_done_date: "2026-03-15", final_payment_rule: "AFTER_SHIPMENT", completed_requires_final_payment: 0, package_confirm_date: "2026-03-04", prepayment_received_date: "2026-03-03" },
    { contact_no: "LX-1003", customer_name: "欧陆营养", product_name: "辅酶Q10", spec: "10kg/箱", quantity: 500, contract_no: "HT-2026-003", country: "德国", computed_due_date: "2026-03-20", raw_material_request_date: "2026-03-01", package_confirm_date: "2026-03-02", prepayment_received_date: "2026-03-03", contact_approval_done_date: "2026-03-04", planned_production_date: "2026-03-05", actual_production_done_date: "2026-03-07", shipped_date: "2026-03-08", invoice_done_date: "2026-03-12", final_payment_rule: "AFTER_SHIPMENT", final_payment_received_date: "2026-03-13", completed_requires_final_payment: 1 }
  ].forEach((item) => upsertOrder(item as Partial<OrderRecord> & { contact_no: string }));
}

if (process.env.NODE_ENV !== "production") seedDemoData();

export { backupDir, dbPath };
export default db;
