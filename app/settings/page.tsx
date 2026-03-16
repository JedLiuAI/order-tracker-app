export const dynamic = "force-dynamic";

import { createManualBackupAction, saveBackupSettingsAction } from "@/app/actions";
import { getAppSetting, listBackups } from "@/lib/db";
import { formatNumber } from "@/lib/utils";

export default function SettingsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const autoEnabled = getAppSetting("backup_auto_enabled") === "1";
  const intervalHours = Number(getAppSetting("backup_interval_hours") || "24") || 24;
  const keepCount = Number(getAppSetting("backup_keep_count") || "20") || 20;
  const lastRunAt = getAppSetting("backup_last_run_at");
  const lastFile = getAppSetting("backup_last_file");
  const backups = listBackups().slice(0, 12);
  const backupCreated = searchParams?.backup === "created";
  const settingsSaved = searchParams?.settings === "saved";

  return (
    <main className="detail-grid">
      <section>
        <h2 style={{ marginTop: 0 }}>备份与设置</h2>
        {(backupCreated || settingsSaved) ? (
          <div className="card" style={{ marginTop: 16, background: "#ecfdf5", borderColor: "rgba(16, 185, 129, 0.25)" }}>
            <strong>{backupCreated ? "数据库备份已创建" : "自动备份设置已保存"}</strong>
            <div className="meta">{backupCreated ? "你可以在下方最近备份列表中看到新文件。" : "自动备份会在应用被访问时按设定时间检查并补做。"}</div>
          </div>
        ) : null}

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <strong>立即备份数据库</strong>
            <div className="meta" style={{ marginTop: 8 }}>会把当前 SQLite 数据库复制到 `data/backups/`，适合导入前、批量编辑前或日常手动留档。</div>
            <form action={createManualBackupAction} style={{ marginTop: 14 }}>
              <button className="btn" type="submit">立即备份</button>
            </form>
          </div>

          <div className="card">
            <strong>当前备份状态</strong>
            <div className="meta" style={{ marginTop: 8 }}>最后备份时间：{lastRunAt || "--"}</div>
            <div className="meta">最后备份文件：{lastFile || "--"}</div>
            <div className="meta">当前保留数量上限：{keepCount}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>自动备份设置</h3>
        <div className="small" style={{ marginBottom: 12 }}>自动备份采用请求驱动方式：当应用被访问时，如果距离上次备份已超过设定间隔，就会自动生成一份新备份。这样不需要额外守护进程，适合你现在的 NAS / Docker 场景。</div>
        <form action={saveBackupSettingsAction} className="sheet" style={{ padding: 18 }}>
          <div className="grid-3">
            <label className="field">
              <span>启用自动备份</span>
              <select name="backup_auto_enabled" defaultValue={autoEnabled ? "1" : "0"}>
                <option value="1">是</option>
                <option value="0">否</option>
              </select>
            </label>
            <label className="field">
              <span>备份间隔（小时）</span>
              <input name="backup_interval_hours" type="number" min="1" step="1" defaultValue={String(intervalHours)} />
            </label>
            <label className="field">
              <span>最多保留备份数</span>
              <input name="backup_keep_count" type="number" min="1" step="1" defaultValue={String(keepCount)} />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">保存设置</button>
          </div>
        </form>
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>最近备份</h3>
        {backups.length ? (
          <section className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>大小</th>
                  <th>修改时间</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.fileName}>
                    <td>{backup.fileName}</td>
                    <td>{formatNumber(Math.round(backup.size / 1024))} KB</td>
                    <td>{backup.modifiedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <div className="empty">还没有备份文件。你可以先点一次“立即备份”。</div>
        )}
      </section>

      <section>
        <h3 style={{ marginTop: 0 }}>其他设置</h3>
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
