export const dynamic = "force-dynamic";
import Link from "next/link";
import { listOrders } from "@/lib/db";
import { deriveOrder, sortOrdersForWorkQueue } from "@/lib/order-logic";
import { formatDate } from "@/lib/utils";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";

export default function OrdersPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const q = typeof searchParams?.q === "string" ? searchParams.q.toLowerCase() : "";
  const stage = typeof searchParams?.stage === "string" ? searchParams.stage : "";
  const urgentOnly = searchParams?.urgent === "1";
  const completed = searchParams?.completed;
  const customer = typeof searchParams?.customer === "string" ? searchParams.customer : "";
  const contractNo = typeof searchParams?.contract_no === "string" ? searchParams.contract_no.toLowerCase() : "";
  const hasPlannedProductionDate = typeof searchParams?.has_planned_production_date === "string" ? searchParams.has_planned_production_date : "";
  const hasShipmentDate = typeof searchParams?.has_shipment_date === "string" ? searchParams.has_shipment_date : "";
  const hasInvoiceDate = typeof searchParams?.has_invoice_date === "string" ? searchParams.has_invoice_date : "";

  const allOrders = sortOrdersForWorkQueue(listOrders().map((order) => deriveOrder(order)));
  const customers = Array.from(new Set(allOrders.map((order) => order.customer_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const orders = allOrders.filter((order) => {
    const matchesQuery = !q || [order.contact_no, order.contract_no, order.customer_name, order.product_name].some((item) => String(item || "").toLowerCase().includes(q));
    const matchesStage = !stage || order.current_stage === stage;
    const matchesUrgent = !urgentOnly || order.is_urgent;
    const matchesCompleted = completed === "1" ? order.is_completed : completed === "0" ? !order.is_completed : true;
    const matchesCustomer = !customer || order.customer_name === customer;
    const matchesContractNo = !contractNo || String(order.contract_no || "").toLowerCase().includes(contractNo);
    const matchesPlannedDate = hasPlannedProductionDate === "1" ? Boolean(order.planned_production_date) : hasPlannedProductionDate === "0" ? !order.planned_production_date : true;
    const matchesShipmentDate = hasShipmentDate === "1" ? Boolean(order.shipped_date) : hasShipmentDate === "0" ? !order.shipped_date : true;
    const matchesInvoiceDate = hasInvoiceDate === "1" ? Boolean(order.invoice_done_date) : hasInvoiceDate === "0" ? !order.invoice_done_date : true;
    return matchesQuery && matchesStage && matchesUrgent && matchesCompleted && matchesCustomer && matchesContractNo && matchesPlannedDate && matchesShipmentDate && matchesInvoiceDate;
  });

  return (
    <main>
      <form className="filter-bar" method="get">
        <div className="grid-4">
          <label className="field"><span>搜索</span><input name="q" defaultValue={q} placeholder="联系单号 / 合同号 / 客户 / 产品" /></label>
          <label className="field"><span>客户</span><select name="customer" defaultValue={customer}><option value="">全部</option>{customers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field"><span>合同号</span><input name="contract_no" defaultValue={contractNo} placeholder="支持模糊匹配" /></label>
          <label className="field"><span>阶段</span><select name="stage" defaultValue={stage}><option value="">全部</option><option value="PENDING_RAW_MATERIAL">待原料采购申请</option><option value="PENDING_PREPAYMENT">待预付款</option><option value="PENDING_PACKAGE_CONFIRM">待包装确认</option><option value="PENDING_CONTACT_APPROVAL">待联系单审批</option><option value="PENDING_PRODUCTION">待生产</option><option value="IN_PRODUCTION">生产中</option><option value="PENDING_SHIPMENT">待发货</option><option value="PENDING_FINAL_PAYMENT">待尾款</option><option value="PENDING_INVOICE">待开票</option><option value="COMPLETED">已完成</option></select></label>
          <label className="field"><span>仅紧急</span><select name="urgent" defaultValue={urgentOnly ? "1" : "0"}><option value="0">否</option><option value="1">是</option></select></label>
          <label className="field"><span>完成状态</span><select name="completed" defaultValue={typeof completed === "string" ? completed : ""}><option value="">全部</option><option value="0">未完成</option><option value="1">已完成</option></select></label>
          <label className="field"><span>有计划排产日期</span><select name="has_planned_production_date" defaultValue={hasPlannedProductionDate}><option value="">全部</option><option value="1">有</option><option value="0">无</option></select></label>
          <label className="field"><span>有发货日期</span><select name="has_shipment_date" defaultValue={hasShipmentDate}><option value="">全部</option><option value="1">有</option><option value="0">无</option></select></label>
          <label className="field"><span>有开票日期</span><select name="has_invoice_date" defaultValue={hasInvoiceDate}><option value="">全部</option><option value="1">有</option><option value="0">无</option></select></label>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="small" style={{ marginBottom: 8 }}>客户快捷筛选</div>
          <div className="actions">
            <Link className={`btn secondary ${!customer ? "active-chip" : ""}`} href="/orders">全部客户</Link>
            {customers.slice(0, 12).map((item) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (stage) params.set("stage", stage);
              if (urgentOnly) params.set("urgent", "1");
              if (typeof completed === "string" && completed) params.set("completed", completed);
              if (contractNo) params.set("contract_no", contractNo);
              if (hasPlannedProductionDate) params.set("has_planned_production_date", hasPlannedProductionDate);
              if (hasShipmentDate) params.set("has_shipment_date", hasShipmentDate);
              if (hasInvoiceDate) params.set("has_invoice_date", hasInvoiceDate);
              params.set("customer", item);
              return <Link key={item} className={`btn secondary ${customer === item ? "active-chip" : ""}`} href={`/orders?${params.toString()}`}>{item}</Link>;
            })}
          </div>
        </div>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn" type="submit">筛选</button><Link className="btn secondary" href="/orders">重置</Link></div>
      </form>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>联系单号</th><th>合同号</th><th>客户</th><th>产品</th><th>规格</th><th>当前阶段</th><th>状态提示</th><th>流程进度</th><th>计划排产</th><th>应交货期</th><th>发货日期</th><th>风险等级</th><th>下一步动作</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.contact_no} className={order.is_completed ? "completed" : order.is_urgent ? "urgent" : ""}>
                <td><Link href={`/orders/${order.contact_no}`}><strong>{order.contact_no}</strong></Link></td>
                <td>{order.contract_no || "--"}</td>
                <td>{order.customer_name || "--"}</td>
                <td>{order.product_name || "--"}</td>
                <td>{order.spec || "--"}</td>
                <td>{order.stage_label}</td>
                <td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{order.is_pinned ? <span className="badge blue">置顶</span> : null}{order.needs_raw_material_attention && order.current_stage !== "PENDING_RAW_MATERIAL" ? <span className="badge orange">原料待登记</span> : null}{order.needs_final_payment_attention ? <span className="badge red">待尾款</span> : null}{order.needs_invoice_attention ? <span className="badge orange">待开票</span> : null}{order.needs_shipment_attention ? <span className="badge orange">待发货</span> : null}{!order.is_pinned && !order.needs_raw_material_attention && !order.needs_final_payment_attention && !order.needs_invoice_attention && !order.needs_shipment_attention ? <span className="badge gray">--</span> : null}</div></td>
                <td>{order.progress_percent}%</td>
                <td>{formatDate(order.planned_production_date)}</td>
                <td>{formatDate(order.customer_extra_due_date || order.computed_due_date)}</td>
                <td>{formatDate(order.shipped_date)}</td>
                <td>{order.risk_level}</td>
                <td>{order.next_action}</td>
                <td><DeleteOrderButton contactNo={order.contact_no} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length ? <div className="empty">没有命中的订单。</div> : null}
      </section>
    </main>
  );
}

