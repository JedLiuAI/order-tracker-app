export const dynamic = "force-dynamic";
import Link from "next/link";
import { OrderCard } from "@/components/OrderCard";
import { listOrders } from "@/lib/db";
import { deriveOrder, ORDER_STAGE_COLUMNS, STAGE_META, sortOrdersForWorkQueue } from "@/lib/order-logic";

export default function HomePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const unfinishedOnly = searchParams?.unfinished === "1";
  const orders = sortOrdersForWorkQueue(
    listOrders()
      .map((order) => deriveOrder(order))
      .filter((order) => (unfinishedOnly ? !order.is_completed : true))
  );

  const grouped = Object.fromEntries(
    ORDER_STAGE_COLUMNS.map((stage) => [stage, orders.filter((order) => order.current_stage === stage)])
  );

  const urgent = orders.filter((order) => order.is_urgent && !order.is_completed);
  const pinned = orders.filter((order) => order.is_pinned && !order.is_completed);
  const completed = orders.filter((order) => order.is_completed);
  const inFlight = orders.filter((order) => !order.is_completed);
  const highRisk = orders.filter((order) => order.risk_level === "HIGH" && !order.is_completed);
  const dueSoon = orders.filter((order) => !order.is_completed && (order.customer_extra_due_date || order.computed_due_date)).length;

  return (
    <main className="dashboard-main">
      <section className="hero-panel dashboard-hero">
        <div>
          <div className="eyebrow">首页状态台</div>
          <h2>个人订单跟进驾驶舱</h2>
          <p className="hero-copy">把紧急、进度、下一步动作和关键提醒放到同一眼里。现在更像每天会盯的工作台，而不是一张平铺列表。</p>
        </div>
        <div className="actions">
          <Link href={unfinishedOnly ? "/" : "/?unfinished=1"} className="btn secondary">
            {unfinishedOnly ? "查看全部订单" : "只看未完成"}
          </Link>
          <Link href="/import-export" className="btn secondary">导入/导出</Link>
          <Link href="/orders" className="btn secondary">查看列表</Link>
        </div>
      </section>

      <section className="kpi-strip">
        <div className="kpi-card accent-blue">
          <div className="small">进行中</div>
          <div className="kpi">{inFlight.length}</div>
          <div className="small">当前需要持续盯进度的订单</div>
        </div>
        <div className="kpi-card accent-red">
          <div className="small">紧急 / 异常</div>
          <div className="kpi">{urgent.length}</div>
          <div className="small">命中风险规则，优先处理</div>
        </div>
        <div className="kpi-card accent-amber">
          <div className="small">高风险</div>
          <div className="kpi">{highRisk.length}</div>
          <div className="small">存在多个阻塞项叠加</div>
        </div>
        <div className="kpi-card accent-green">
          <div className="small">已完成闭环</div>
          <div className="kpi">{completed.length}</div>
          <div className="small">交付、开票与尾款已完成</div>
        </div>
        <div className="kpi-card accent-purple">
          <div className="small">有交期信息</div>
          <div className="kpi">{dueSoon}</div>
          <div className="small">适合按交期优先排查</div>
        </div>
      </section>

      <section className="focus-grid">
        <div className="panel spotlight-panel urgent-zone">
          <div className="section-heading">
            <div>
              <div className="eyebrow">优先区</div>
              <h3>异常 / 紧急订单</h3>
            </div>
            <span className="badge red">{urgent.length} 个待处理</span>
          </div>
          <div className="divider" />
          {urgent.length ? (
            <div className="stack-list">
              {urgent.map((order) => <OrderCard key={order.contact_no} order={order} />)}
            </div>
          ) : (
            <div className="empty emphasis">目前没有命中风险规则的订单。</div>
          )}
        </div>

        <div className="panel spotlight-panel pinned-zone">
          <div className="section-heading">
            <div>
              <div className="eyebrow">个人关注</div>
              <h3>手动置顶订单</h3>
            </div>
            <span className="badge blue">{pinned.length} 个置顶中</span>
          </div>
          <div className="divider" />
          {pinned.length ? (
            <div className="stack-list">
              {pinned.map((order) => <OrderCard key={order.contact_no} order={order} />)}
            </div>
          ) : (
            <div className="empty">还没有手动置顶的联系单，可在订单编辑页开启“首页置顶”。</div>
          )}
        </div>
      </section>

      <section className="panel stage-board-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow">流程总览</div>
            <h3>阶段看板</h3>
          </div>
          <span className="small">从前置准备到完成闭环，一屏快速扫状态</span>
        </div>
        <div className="divider" />
        <section className="stage-board">
          {ORDER_STAGE_COLUMNS.map((stage) => {
            const stageOrders = grouped[stage];
            if (!stageOrders.length) return null;
            return (
              <div className="panel stage-column" key={stage} data-stage={stage}>
                <div className="column-header enhanced">
                  <div>
                    <strong>{STAGE_META[stage].label}</strong>
                    <div className="small">阶段进度 {STAGE_META[stage].progress}%</div>
                  </div>
                  <span className="badge gray">{stageOrders.length}</span>
                </div>
                <div className="column-divider" />
                <div className="stack-list">
                  {stageOrders.map((order) => <OrderCard key={order.contact_no} order={order} />)}
                </div>
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}

