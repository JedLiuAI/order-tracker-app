import { importOrdersAction } from "@/app/actions";
import { exportFieldOptions } from "@/lib/export-fields";

export default function ImportExportPage() {
  return (
    <main className="detail-grid">
      <section>
        <h2 style={{ marginTop: 0 }}>Excel / CSV 导入</h2>
        <div className="small" style={{ marginBottom: 12 }}>支持 `.xlsx` / `.xls` / `.csv`，默认读取第一张工作表或 CSV 内容，按“联系单号”新增或覆盖更新。</div>
        <form action={importOrdersAction} className="sheet" style={{ padding: 18 }}>
          <label className="field">
            <span>上传文件</span>
            <input type="file" name="file" accept=".xlsx,.xls,.csv,text/csv" required />
          </label>
          <div className="actions" style={{ marginTop: 16 }}><button className="btn" type="submit">开始导入</button></div>
        </form>
      </section>

      <section>
        <h2 style={{ marginTop: 0 }}>Excel 导出</h2>
        <div className="small" style={{ marginBottom: 12 }}>可选字段，可过滤是否仅导出紧急单、是否包含已完成订单。提交后会直接下载 Excel 文件。</div>
        <form action="/api/export" method="post" className="sheet" style={{ padding: 18 }}>
          <div className="grid-4">
            <label className="field"><span>包含已完成</span><select name="include_completed" defaultValue="1"><option value="1">是</option><option value="0">否</option></select></label>
            <label className="field"><span>仅紧急</span><select name="urgent_only" defaultValue="0"><option value="0">否</option><option value="1">是</option></select></label>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>导出字段</div>
            <div className="grid-4">{exportFieldOptions.map((field) => <label key={field.value} className="field" style={{ flexDirection: "row", alignItems: "center" }}><input type="checkbox" name="fields" value={field.value} defaultChecked={["contact_no", "customer_name", "product_name", "stage_label", "progress_percent", "risk_level", "next_action"].includes(field.value)} /><span>{field.label}</span></label>)}</div>
          </div>
          <div className="actions" style={{ marginTop: 16 }}><button className="btn" type="submit">导出 Excel</button></div>
        </form>
      </section>
    </main>
  );
}
