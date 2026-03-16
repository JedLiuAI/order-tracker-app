export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { ProgressBar } from "@/components/ProgressBar";
import { getOrder } from "@/lib/db";
import { deriveOrder } from "@/lib/order-logic";
import { formatDate, formatNumber } from "@/lib/utils";

export default function OrderDetailPage({ params }: { params: { contactNo: string } }) {
  const raw = getOrder(decodeURIComponent(params.contactNo));
  if (!raw) return notFound();

  const order = deriveOrder(raw);
  const timeline = [["合同日期", order.contract_date], ["原料采购申请日期", order.raw_material_request_date], ["客户确认包装日期", order.package_confirm_date], ["收到客户预付款日期", order.prepayment_received_date], ["联系单审批完成日期", order.contact_approval_done_date], ["计划排产日期", order.planned_production_date], ["实际生产完成日期", order.actual_production_done_date], ["发货日期", order.shipped_date], ["开票完成日期", order.invoice_done_date], ["尾款收到日期", order.final_payment_received_date]] as const;

  return (
    <main className="detail-grid">
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="small">联系单号</div>
            <div className="kpi">{order.contact_no}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <span className={`badge ${order.is_completed ? "green" : order.is_urgent ? "red" : "gray"}`}>{order.stage_label}</span>
              <span className={`badge ${order.risk_level === "HIGH" ? "red" : order.risk_level === "MEDIUM" ? "orange" : "gray"}`}>风险 {order.risk_level}</span>
              {order.is_pinned ? <span className="badge blue">首页置顶</span> : null}
              {order.is_key_order ? <span className="badge orange">重点关注</span> : null}
              {order.needs_raw_material_attention ? <span className="badge orange">原料待登记</span> : null}
              {order.needs_final_payment_attention ? <span className="badge red">待尾款</span> : null}
              {order.needs_invoice_attention ? <span className="badge orange">待开票</span> : null}
              {order.needs_shipment_attention ? <span className="badge orange">待发货</span> : null}
            </div>
          </div>
          <div className="actions"><Link href="/orders" className="btn secondary">返回列表</Link></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="small">流程进度</div>
          <ProgressBar value={order.progress_percent} completed={order.is_completed} urgent={order.is_urgent} />
          <div className="small">下一步动作：{order.next_action}</div>
        </div>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>基础信息</h3>
        <div className="grid-4">
          <div><div className="small">客户名称</div><strong>{order.customer_name || "--"}</strong></div>
          <div><div className="small">产品名称</div><strong>{order.product_name || "--"}</strong></div>
          <div><div className="small">规格</div><strong>{order.spec || "--"}</strong></div>
          <div><div className="small">国家</div><strong>{order.country || "--"}</strong></div>
          <div><div className="small">合同号</div><strong>{order.contract_no || "--"}</strong></div>
          <div><div className="small">数量</div><strong>{formatNumber(order.quantity)}</strong></div>
          <div><div className="small">单价</div><strong>{formatNumber(order.unit_price)}</strong></div>
          <div><div className="small">合同金额</div><strong>{formatNumber(order.contract_amount)}</strong></div>
        </div>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>流程时间线</h3>
        <div className="grid-2">{timeline.map(([label, value]) => <div key={label}><div className="small">{label}</div><strong>{formatDate(value)}</strong></div>)}</div>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>自动分析</h3>
        <div className="grid-2">
          <div><div className="small">当前主阶段</div><strong>{order.stage_label}</strong></div>
          <div><div className="small">下一步动作</div><strong>{order.next_action}</strong></div>
          <div><div className="small">是否紧急</div><strong>{order.is_urgent ? "是" : "否"}</strong></div>
          <div><div className="small">是否已完成</div><strong>{order.is_completed ? "是" : "否"}</strong></div>
          <div><div className="small">原料采购申请提醒</div><strong>{order.needs_raw_material_attention ? "是" : "否"}</strong></div>
          <div><div className="small">待尾款提示</div><strong>{order.needs_final_payment_attention ? "是" : "否"}</strong></div>
          <div><div className="small">待开票提示</div><strong>{order.needs_invoice_attention ? "是" : "否"}</strong></div>
          <div><div className="small">首页置顶</div><strong>{order.is_pinned ? "是" : "否"}</strong></div>
        </div>
        {order.risk_reasons.length ? <ul>{order.risk_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <div className="small">当前未命中风险规则。</div>}
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>业务规则与批次预留</h3>
        <div className="grid-2">
          <div><div className="small">是否需要预付款</div><strong>{order.need_prepayment ? "是" : "否"}</strong></div>
          <div><div className="small">尾款条件类型</div><strong>{order.final_payment_rule}</strong></div>
          <div><div className="small">完成是否要求尾款</div><strong>{order.completed_requires_final_payment ? "是" : "否"}</strong></div>
          <div><div className="small">批次子记录</div><strong>v1 预留，数据库已建 `order_batches`</strong></div>
        </div>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>编辑订单</h3>
        <OrderForm order={order} />
      </section>
    </main>
  );
}

