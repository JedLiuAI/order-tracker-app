export default function SettingsPage() {
  return (
    <main className="detail-grid">
      <section>
        <h2 style={{ marginTop: 0 }}>设置页（v1）</h2>
        <div className="grid-2">
          <div className="card">
            <strong>交期预警阈值</strong>
            <div className="meta">当前内置为 7 天，后续建议接入 `app_settings` 表做配置化。</div>
          </div>
          <div className="card">
            <strong>尾款默认规则</strong>
            <div className="meta">当前默认 `AFTER_SHIPMENT`，表单已支持切换 `BEFORE_SHIPMENT`、`AFTER_INVOICE` 和 `NONE`。</div>
          </div>
          <div className="card">
            <strong>完成是否要求尾款</strong>
            <div className="meta">订单级字段已支持，后续可提升为客户模板或全局默认值。</div>
          </div>
          <div className="card">
            <strong>子批次扩展</strong>
            <div className="meta">SQLite 已预留 `order_batches` 子表，后续可在详情页展开多批次。</div>
          </div>
        </div>
      </section>
    </main>
  );
}
