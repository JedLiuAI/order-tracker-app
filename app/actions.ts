'use server';

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { listOrders, normalizeBoolean, normalizeNullableNumber, saveOrderRecord, upsertOrdersBulk } from "@/lib/db";
import { deriveOrder } from "@/lib/order-logic";
import { ExportableField, FinalPaymentRule, OrderRecord } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  contract_date: "合同日期",
  contract_no: "合同号",
  customer_name: "客户名称",
  country: "国家",
  contact_no: "联系单号",
  material_no: "物料号",
  product_name: "产品名称",
  spec: "规格",
  batch_no: "批号",
  package_form: "包装形式",
  quality_standard: "质量标准",
  unit_price: "单价",
  quantity: "数量",
  contract_amount: "合同金额",
  export_type: "出口类型",
  region: "区域",
  internal_contract_no: "内部合同号",
  raw_material_request_date: "原料采购申请日期",
  package_confirm_date: "客户确认包装日期",
  prepayment_received_date: "收到客户预付款日期",
  contact_approval_done_date: "联系单审批完成日期",
  customer_extra_due_date: "客户额外交货期",
  computed_due_date: "按合同计算交货期",
  planned_production_date: "计划排产日期",
  actual_production_done_date: "实际生产完成日期",
  shipped_date: "发货日期",
  invoice_done_date: "开票完成日期",
  contract_remit_date: "合同汇款日期",
  final_payment_received_date: "尾款收到日期",
  need_prepayment: "是否需要预付款",
  final_payment_rule: "尾款条件类型",
  completed_requires_final_payment: "完成条件是否要求尾款",
  notes: "备注",
  last_follow_up_date: "最后跟进日期",
  is_key_order: "是否重点关注",
  is_pinned: "首页置顶",
  custom_tags: "手动标签",
  current_stage: "当前阶段",
  stage_label: "阶段名称",
  progress_percent: "流程进度",
  risk_level: "风险等级",
  is_urgent: "是否紧急",
  is_completed: "是否已完成",
  next_action: "下一步动作"
};

const ALIAS_MAP: Record<string, string> = {
  合同日期: "contract_date",
  合同号: "contract_no",
  客户名称: "customer_name",
  出口产品国家: "country",
  国家: "country",
  联系单号: "contact_no",
  物料号: "material_no",
  产品名称: "product_name",
  规格: "spec",
  批号: "batch_no",
  包装形式: "package_form",
  质量标准: "quality_standard",
  单价: "unit_price",
  数量: "quantity",
  合同金额: "contract_amount",
  出口类型: "export_type",
  区域: "region",
  内部合同号: "internal_contract_no",
  原料采购申请日期: "raw_material_request_date",
  客户确认包装日期: "package_confirm_date",
  收到客户预付款日期: "prepayment_received_date",
  联系单审批完成日期: "contact_approval_done_date",
  客户额外交货期: "customer_extra_due_date",
  按合同计算交货期: "computed_due_date",
  计划排产日期: "planned_production_date",
  实际生产完成日期: "actual_production_done_date",
  发货日期: "shipped_date",
  开票完成日期: "invoice_done_date",
  合同汇款日期: "contract_remit_date",
  尾款收到日期: "final_payment_received_date",
  是否需要预付款: "need_prepayment",
  尾款条件类型: "final_payment_rule",
  完成条件是否要求尾款: "completed_requires_final_payment",
  备注: "notes",
  最后跟进日期: "last_follow_up_date",
  是否重点关注: "is_key_order",
  首页置顶: "is_pinned",
  手动标签: "custom_tags"
};

function pickText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseFinalPaymentRule(value: string): FinalPaymentRule {
  const normalized = value.trim();
  if (normalized === "BEFORE_SHIPMENT" || normalized === "AFTER_SHIPMENT" || normalized === "AFTER_INVOICE" || normalized === "NONE") {
    return normalized;
  }
  return "AFTER_SHIPMENT";
}

export async function saveOrderAction(formData: FormData) {
  const contact_no = pickText(formData, "contact_no").trim();
  const originalContactNo = pickText(formData, "original_contact_no").trim();
  if (!contact_no) throw new Error("联系单号不能为空");

  const payload: Partial<OrderRecord> & { contact_no: string } = {
    contact_no,
    contract_date: pickText(formData, "contract_date"),
    contract_no: pickText(formData, "contract_no"),
    customer_name: pickText(formData, "customer_name"),
    country: pickText(formData, "country"),
    material_no: pickText(formData, "material_no"),
    product_name: pickText(formData, "product_name"),
    spec: pickText(formData, "spec"),
    batch_no: pickText(formData, "batch_no"),
    package_form: pickText(formData, "package_form"),
    quality_standard: pickText(formData, "quality_standard"),
    unit_price: normalizeNullableNumber(pickText(formData, "unit_price")),
    quantity: normalizeNullableNumber(pickText(formData, "quantity")),
    contract_amount: normalizeNullableNumber(pickText(formData, "contract_amount")),
    export_type: pickText(formData, "export_type"),
    region: pickText(formData, "region"),
    internal_contract_no: pickText(formData, "internal_contract_no"),
    raw_material_request_date: pickText(formData, "raw_material_request_date"),
    package_confirm_date: pickText(formData, "package_confirm_date"),
    prepayment_received_date: pickText(formData, "prepayment_received_date"),
    contact_approval_done_date: pickText(formData, "contact_approval_done_date"),
    customer_extra_due_date: pickText(formData, "customer_extra_due_date"),
    computed_due_date: pickText(formData, "computed_due_date"),
    planned_production_date: pickText(formData, "planned_production_date"),
    actual_production_done_date: pickText(formData, "actual_production_done_date"),
    shipped_date: pickText(formData, "shipped_date"),
    invoice_done_date: pickText(formData, "invoice_done_date"),
    contract_remit_date: pickText(formData, "contract_remit_date"),
    final_payment_received_date: pickText(formData, "final_payment_received_date"),
    need_prepayment: normalizeBoolean(pickText(formData, "need_prepayment"), 1),
    final_payment_rule: parseFinalPaymentRule(pickText(formData, "final_payment_rule")),
    completed_requires_final_payment: normalizeBoolean(pickText(formData, "completed_requires_final_payment"), 0),
    notes: pickText(formData, "notes"),
    last_follow_up_date: pickText(formData, "last_follow_up_date"),
    is_key_order: normalizeBoolean(pickText(formData, "is_key_order"), 0),
    is_pinned: normalizeBoolean(pickText(formData, "is_pinned"), 0),
    custom_tags: pickText(formData, "custom_tags")
  };

  saveOrderRecord(payload, originalContactNo || undefined);
  revalidatePath("/");
  revalidatePath("/orders");
  if (originalContactNo && originalContactNo !== contact_no) revalidatePath(`/orders/${originalContactNo}`);
  revalidatePath(`/orders/${contact_no}`);
}

export async function deleteOrderAction(contactNo: string) {
  if (!contactNo) throw new Error("联系单号不能为空");
  const { deleteOrder } = await import("@/lib/db");
  deleteOrder(contactNo);
  revalidatePath("/");
  revalidatePath("/orders");
}

export async function importOrdersAction(formData: FormData): Promise<void> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("请选择 xlsx / csv 文件");

  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const toImport: Array<Partial<OrderRecord> & { contact_no: string }> = [];
  for (const row of rows) {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [ALIAS_MAP[key.trim()] || key.trim(), value]);
    const mapped = Object.fromEntries(normalizedEntries) as Record<string, unknown>;
    const contactNo = String(mapped.contact_no || "").trim();
    if (!contactNo) continue;
    toImport.push({ ...(mapped as Partial<OrderRecord>), contact_no: contactNo, final_payment_rule: parseFinalPaymentRule(String(mapped.final_payment_rule || "AFTER_SHIPMENT")) });
  }

  upsertOrdersBulk(toImport);

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/import-export");
  console.log(`Imported ${toImport.length} orders from ${lowerName}`);
}

export async function exportOrdersAction(formData: FormData) {
  const selected = formData.getAll("fields").map(String) as ExportableField[];
  const includeCompleted = pickText(formData, "include_completed") === "1";
  const urgentOnly = pickText(formData, "urgent_only") === "1";
  const orders = listOrders().map((order) => deriveOrder(order)).filter((order) => (includeCompleted ? true : !order.is_completed)).filter((order) => (urgentOnly ? order.is_urgent : true));
  const fields = selected.length ? selected : ["contact_no", "customer_name", "product_name", "stage_label", "progress_percent", "risk_level", "next_action"];
  const data = orders.map((order) => Object.fromEntries(fields.map((field) => [FIELD_LABELS[field] || field, String((order as Record<string, unknown>)[field] ?? "")])));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "orders");
  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  return { base64, fileName: `order-export-${Date.now()}.xlsx` };
}
