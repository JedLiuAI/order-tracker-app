import type { CSSProperties } from "react";
import Link from "next/link";
import { DerivedOrder } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function OrderCard({ order }: { order: DerivedOrder }) {
  const isCompleted = order.is_completed;
  const isUrgent = order.is_urgent && !isCompleted;

  const reminders = [
    order.is_pinned ? "已置顶" : null,
    order.is_key_order ? "重点" : null,
    order.needs_raw_material_attention && order.current_stage !== "PENDING_RAW_MATERIAL" ? "待原料" : null,
    order.needs_shipment_attention && order.current_stage !== "PENDING_SHIPMENT" ? "待发货" : null,
    order.needs_final_payment_attention ? "待尾款" : null,
    order.needs_invoice_attention && order.current_stage !== "PENDING_INVOICE" ? "待开票" : null
  ].filter(Boolean) as string[];

  const stages = [
    { key: "PENDING_RAW_MATERIAL", label: "原料", minProgress: 5 },
    { key: "PENDING_PREPAYMENT", label: "前置", minProgress: 15 },
    { key: "PENDING_CONTACT_APPROVAL", label: "审批", minProgress: 30 },
    { key: "PENDING_PRODUCTION", label: "生产", minProgress: 45 },
    { key: "PENDING_SHIPMENT", label: "交付", minProgress: 75 },
    { key: "COMPLETED", label: "完成", minProgress: 100 }
  ] as const;

  let currentStageIndex = stages.findIndex((stage) => stage.key === order.current_stage);
  if (isCompleted) currentStageIndex = 5;
  if (currentStageIndex === -1 && order.current_stage === "IN_PRODUCTION") currentStageIndex = 3;
  if (currentStageIndex === -1 && (order.current_stage === "PENDING_FINAL_PAYMENT" || order.current_stage === "PENDING_INVOICE")) currentStageIndex = 4;
  if (currentStageIndex === -1 && order.current_stage === "PENDING_PACKAGE_CONFIRM") currentStageIndex = 1;

  const progressPercent = isCompleted ? 100 : order.progress_percent;
  const timelineStyle = { "--progress-width": `${progressPercent}%` } as CSSProperties;

  return (
    <Link
      href={`/orders/${order.contact_no}`}
      className={cn("card order-card", isUrgent && "urgent", isCompleted && "completed", order.is_pinned ? "pinned" : undefined)}
    >
      <div className="card-topline">
        <div className="order-id-group">
          <span className="order-id">{order.contact_no}</span>
        </div>
        <div className="card-badges">
          {isUrgent && <span className="badge red">紧急处理</span>}
          {order.risk_level === "HIGH" && !isCompleted && !isUrgent && <span className="badge orange">高风险</span>}
          {order.risk_level === "MEDIUM" && !isCompleted && !isUrgent && <span className="badge gray">需留意</span>}
          {isCompleted && <span className="badge green">已闭环</span>}
        </div>
      </div>

      <div className="card-header">
        <div className="order-product">
          {order.product_name || "未填写产品"}{order.spec ? ` / ${order.spec}` : ""}
        </div>
        <div className="order-meta-inline">
          {order.batch_no ? <span className="meta-chip batch">批号 {order.batch_no}</span> : null}
          {order.quantity ? <span className="meta-chip qty">{order.quantity}</span> : null}
        </div>
        <div className="order-customer">{order.customer_name || "未填写客户"}</div>
      </div>

      <div className={cn("action-block", isUrgent && "urgent-action", isCompleted && "completed-action")}>
        <span className="eyebrow">下一步动作</span>
        <strong>{isCompleted ? "订单已完成闭环" : order.next_action}</strong>
      </div>

      <div className={cn("timeline-track", isCompleted && "completed", isUrgent && "urgent")} style={timelineStyle}>
        {stages.map((stage, idx) => {
          const isActive = progressPercent >= stage.minProgress;
          const isCurrent = idx === currentStageIndex;
          return (
            <div key={stage.label} className={cn("timeline-node", isActive && "active", isCurrent && "current")}>
              <span className="timeline-label">{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div className="card-footer">
        {reminders.length > 0 ? (
          <div className="footer-section">
            <span className="eyebrow">关键提醒</span>
            <div className="reminder-list">
              {reminders.map((reminder) => <span key={reminder} className="badge blue">{reminder}</span>)}
            </div>
          </div>
        ) : <div />}

        <div className="footer-section right">
          <span className="eyebrow">交期</span>
          <span className="due-date">{formatDate(order.customer_extra_due_date || order.computed_due_date)}</span>
        </div>
      </div>

      {order.risk_reasons.length > 0 && !isCompleted ? (
        <div className="risk-box">提示：{order.risk_reasons[0]}</div>
      ) : null}
    </Link>
  );
}
