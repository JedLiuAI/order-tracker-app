import { DerivedOrder, FinalPaymentRule, OrderRecord, StageKey } from "@/lib/types";

export const STAGE_META: Record<StageKey, { label: string; progress: number }> = {
  PENDING_RAW_MATERIAL: { label: "待原料采购申请", progress: 5 },
  PENDING_PREPAYMENT: { label: "待预付款", progress: 15 },
  PENDING_PACKAGE_CONFIRM: { label: "待包装确认", progress: 15 },
  PENDING_CONTACT_APPROVAL: { label: "待联系单审批", progress: 30 },
  PENDING_PRODUCTION: { label: "待生产", progress: 45 },
  IN_PRODUCTION: { label: "生产中", progress: 60 },
  PENDING_SHIPMENT: { label: "待发货", progress: 75 },
  PENDING_FINAL_PAYMENT: { label: "待尾款", progress: 85 },
  PENDING_INVOICE: { label: "待开票", progress: 90 },
  COMPLETED: { label: "已完成", progress: 100 }
};

const DEFAULT_WARNING_DAYS = 7;

function asDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasValue(value: string | null) {
  return Boolean(value && String(value).trim());
}

function requiresFinalPayment(rule: FinalPaymentRule, shippedDate: string | null, invoiceDoneDate: string | null) {
  if (rule === "NONE") return false;
  if (rule === "BEFORE_SHIPMENT") return !hasValue(shippedDate);
  if (rule === "AFTER_SHIPMENT") return hasValue(shippedDate);
  if (rule === "AFTER_INVOICE") return hasValue(invoiceDoneDate);
  return false;
}

export function deriveOrder(order: OrderRecord, now = new Date()): DerivedOrder {
  const needPrepayment = Boolean(order.need_prepayment);
  const completedRequiresFinalPayment = Boolean(order.completed_requires_final_payment);
  const finalPaymentTriggered = requiresFinalPayment(order.final_payment_rule, order.shipped_date, order.invoice_done_date);
  const finalPaymentMissing = finalPaymentTriggered && !hasValue(order.final_payment_received_date);
  const rawMaterialMissing = !hasValue(order.raw_material_request_date);

  const hasPackageConfirmed = hasValue(order.package_confirm_date);
  const hasPrepayment = !needPrepayment || hasValue(order.prepayment_received_date);
  const hasContactApproval = hasValue(order.contact_approval_done_date);
  const hasProductionPlan = hasValue(order.planned_production_date);
  const hasProductionDone = hasValue(order.actual_production_done_date);
  const hasShipment = hasValue(order.shipped_date);
  const hasInvoice = hasValue(order.invoice_done_date);

  const operationalFlowDone = hasShipment && hasInvoice;
  const finalPaymentIsOnlyBlockingCompletion = finalPaymentMissing && operationalFlowDone && completedRequiresFinalPayment;
  const finalPaymentBlocksShipment = finalPaymentMissing && order.final_payment_rule === "BEFORE_SHIPMENT" && hasProductionDone && !hasShipment;

  let currentStage: StageKey = "PENDING_RAW_MATERIAL";
  if (hasShipment && hasInvoice && (!completedRequiresFinalPayment || hasValue(order.final_payment_received_date))) {
    currentStage = "COMPLETED";
  } else if (finalPaymentIsOnlyBlockingCompletion || finalPaymentBlocksShipment) {
    currentStage = "PENDING_FINAL_PAYMENT";
  } else if (hasShipment && !hasInvoice) {
    currentStage = "PENDING_INVOICE";
  } else if (hasProductionDone && !hasShipment) {
    currentStage = "PENDING_SHIPMENT";
  } else if (hasContactApproval && hasProductionPlan && !hasProductionDone) {
    const planned = asDate(order.planned_production_date);
    currentStage = planned && now >= planned ? "IN_PRODUCTION" : "PENDING_PRODUCTION";
  } else if (hasPackageConfirmed && hasPrepayment && !hasContactApproval) {
    currentStage = "PENDING_CONTACT_APPROVAL";
  } else if (needPrepayment && !hasValue(order.prepayment_received_date)) {
    currentStage = "PENDING_PREPAYMENT";
  } else if (!hasPackageConfirmed) {
    currentStage = "PENDING_PACKAGE_CONFIRM";
  } else if (rawMaterialMissing) {
    currentStage = "PENDING_RAW_MATERIAL";
  }

  const dueDate = order.customer_extra_due_date || order.computed_due_date;
  const due = asDate(dueDate);
  const riskReasons: string[] = [];

  if (hasContactApproval && !hasProductionPlan) {
    if (!due || (due.getTime() - now.getTime()) / (1000 * 3600 * 24) <= DEFAULT_WARNING_DAYS) {
      riskReasons.push("联系单已审批，但尚未计划排产，且已接近交期");
    }
  }

  const planned = asDate(order.planned_production_date);
  const computedDue = asDate(order.computed_due_date);
  const extraDue = asDate(order.customer_extra_due_date);
  if (planned && ((computedDue && planned > computedDue) || (extraDue && planned > extraDue))) {
    riskReasons.push("计划排产日期晚于交期");
  }
  if (hasContactApproval && rawMaterialMissing) {
    riskReasons.push("流程已推进，但原料采购申请日期仍未登记");
  }
  if (hasProductionDone && !hasShipment) {
    riskReasons.push("已生产完成但尚未发货");
  }
  if (hasShipment && !hasInvoice) {
    riskReasons.push("已发货但尚未开票");
  }
  if (finalPaymentMissing) {
    riskReasons.push("尾款条件已触发但尾款未到账");
  }

  const needsShipmentAttention = hasProductionDone && !hasShipment;
  const needsInvoiceAttention = hasShipment && !hasInvoice;
  const needsFinalPaymentAttention = finalPaymentMissing;
  const needsRawMaterialAttention = rawMaterialMissing;

  const isCompleted = currentStage === "COMPLETED";
  const isUrgent = riskReasons.length > 0 && !isCompleted;
  const riskLevel = isCompleted ? "LOW" : riskReasons.length >= 2 ? "HIGH" : riskReasons.length === 1 ? "MEDIUM" : "LOW";

  const nextActionMap: Record<StageKey, string> = {
    PENDING_RAW_MATERIAL: "补录原料采购申请日期，并确认采购已发起",
    PENDING_PREPAYMENT: "跟进客户预付款到账",
    PENDING_PACKAGE_CONFIRM: "推动客户确认包装信息",
    PENDING_CONTACT_APPROVAL: "完成联系单审批并下单",
    PENDING_PRODUCTION: "补充计划排产日期",
    IN_PRODUCTION: rawMaterialMissing ? "跟进生产进度，同时补录原料采购申请日期" : "跟进生产进度并确认完工时间",
    PENDING_SHIPMENT: finalPaymentMissing && order.final_payment_rule === "BEFORE_SHIPMENT" ? "尾款未到账，先催收尾款后安排发货" : "安排发货并登记发货日期",
    PENDING_FINAL_PAYMENT: "根据尾款规则催收尾款",
    PENDING_INVOICE: finalPaymentMissing ? "完成开票并持续催收尾款" : "完成开票并登记开票日期",
    COMPLETED: "订单已闭环，可归档复盘"
  };

  return {
    ...order,
    current_stage: currentStage,
    stage_label: STAGE_META[currentStage].label,
    progress_percent: STAGE_META[currentStage].progress,
    risk_level: riskLevel,
    is_urgent: isUrgent,
    is_completed: isCompleted,
    next_action: nextActionMap[currentStage],
    risk_reasons: riskReasons,
    due_date_for_risk: dueDate,
    needs_final_payment_attention: needsFinalPaymentAttention,
    needs_invoice_attention: needsInvoiceAttention,
    needs_shipment_attention: needsShipmentAttention,
    needs_raw_material_attention: needsRawMaterialAttention
  };
}

export function sortOrdersForWorkQueue(orders: DerivedOrder[]) {
  return [...orders].sort((a, b) => {
    if (Number(b.is_urgent) !== Number(a.is_urgent)) return Number(b.is_urgent) - Number(a.is_urgent);
    if (Number(b.is_pinned) !== Number(a.is_pinned)) return Number(b.is_pinned) - Number(a.is_pinned);
    if (Number(b.is_key_order) !== Number(a.is_key_order)) return Number(b.is_key_order) - Number(a.is_key_order);

    const dueA = asDate(a.customer_extra_due_date || a.computed_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dueB = asDate(b.customer_extra_due_date || b.computed_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (dueA !== dueB) return dueA - dueB;

    return b.updated_at.localeCompare(a.updated_at);
  });
}

export const ORDER_STAGE_COLUMNS: StageKey[] = [
  "PENDING_RAW_MATERIAL",
  "PENDING_PREPAYMENT",
  "PENDING_PACKAGE_CONFIRM",
  "PENDING_CONTACT_APPROVAL",
  "PENDING_PRODUCTION",
  "IN_PRODUCTION",
  "PENDING_SHIPMENT",
  "PENDING_FINAL_PAYMENT",
  "PENDING_INVOICE",
  "COMPLETED"
];
