import { saveOrderAction } from "@/app/actions";
import { DerivedOrder, OrderRecord } from "@/lib/types";

const textFields = [
  ["contract_no", "合同号"],
  ["customer_name", "客户名称"],
  ["country", "出口产品国家"],
  ["material_no", "物料号"],
  ["product_name", "产品名称"],
  ["spec", "规格"],
  ["batch_no", "批号"],
  ["package_form", "包装形式"],
  ["quality_standard", "质量标准"],
  ["export_type", "出口类型"],
  ["region", "区域"],
  ["internal_contract_no", "内部合同号"],
  ["custom_tags", "手动标签"]
] as const;

const dateFields = [
  ["contract_date", "合同日期"],
  ["raw_material_request_date", "原料采购申请日期"],
  ["package_confirm_date", "客户确认包装日期"],
  ["prepayment_received_date", "收到客户预付款日期"],
  ["contact_approval_done_date", "联系单审批完成日期"],
  ["customer_extra_due_date", "客户额外交货期"],
  ["computed_due_date", "按合同计算交货期"],
  ["planned_production_date", "计划排产日期"],
  ["actual_production_done_date", "实际生产完成日期"],
  ["shipped_date", "发货日期"],
  ["invoice_done_date", "开票完成日期"],
  ["contract_remit_date", "合同汇款日期"],
  ["final_payment_received_date", "尾款收到日期"],
  ["last_follow_up_date", "最后跟进日期"]
] as const;

export function OrderForm({ order }: { order?: DerivedOrder | OrderRecord | null }) {
  const isEditing = Boolean(order?.contact_no);

  return (
    <form action={saveOrderAction} className="sheet" style={{ padding: 20 }}>
      <input type="hidden" name="original_contact_no" value={order?.contact_no || ""} />

      <div className="grid-4">
        <label className="field">
          <span>联系单号 *</span>
          <input name="contact_no" defaultValue={order?.contact_no || ""} required />
          {isEditing ? <small className="small">修改联系单号时会迁移原记录，不会残留旧主键。</small> : null}
        </label>
        <label className="field"><span>单价</span><input name="unit_price" type="number" step="0.01" defaultValue={String(order?.unit_price ?? "")} /></label>
        <label className="field"><span>数量</span><input name="quantity" type="number" step="0.01" defaultValue={String(order?.quantity ?? "")} /></label>
        <label className="field"><span>合同金额</span><input name="contract_amount" type="number" step="0.01" defaultValue={String(order?.contract_amount ?? "")} /></label>
      </div>

      <div className="grid-4" style={{ marginTop: 14 }}>
        {textFields.map(([name, label]) => (
          <label className="field" key={name}>
            <span>{label}</span>
            <input name={name} defaultValue={String(order?.[name] ?? "")} />
          </label>
        ))}
      </div>

      <div className="grid-4" style={{ marginTop: 14 }}>
        {dateFields.map(([name, label]) => (
          <label className="field" key={name}>
            <span>{label}</span>
            <input name={name} type="date" defaultValue={String(order?.[name] ?? "")} />
          </label>
        ))}
      </div>

      <div className="grid-4" style={{ marginTop: 14 }}>
        <label className="field">
          <span>是否需要预付款</span>
          <select name="need_prepayment" defaultValue={String(order?.need_prepayment ?? 1)}>
            <option value="1">是</option>
            <option value="0">否</option>
          </select>
        </label>
        <label className="field">
          <span>尾款条件类型</span>
          <select name="final_payment_rule" defaultValue={order?.final_payment_rule || "AFTER_SHIPMENT"}>
            <option value="BEFORE_SHIPMENT">发货前付尾款</option>
            <option value="AFTER_SHIPMENT">发货后付尾款</option>
            <option value="AFTER_INVOICE">见发票付尾款</option>
            <option value="NONE">无尾款控制</option>
          </select>
        </label>
        <label className="field">
          <span>完成条件是否要求尾款</span>
          <select name="completed_requires_final_payment" defaultValue={String(order?.completed_requires_final_payment ?? 0)}>
            <option value="0">否</option>
            <option value="1">是</option>
          </select>
        </label>
        <label className="field">
          <span>是否重点关注</span>
          <select name="is_key_order" defaultValue={String(order?.is_key_order ?? 0)}>
            <option value="0">否</option>
            <option value="1">是</option>
          </select>
        </label>
      </div>

      <div className="grid-4" style={{ marginTop: 14 }}>
        <label className="field">
          <span>首页置顶</span>
          <select name="is_pinned" defaultValue={String(order?.is_pinned ?? 0)}>
            <option value="0">否</option>
            <option value="1">是</option>
          </select>
        </label>
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="field">
          <span>备注</span>
          <textarea name="notes" defaultValue={order?.notes || ""} />
        </label>
      </div>

      <div className="actions" style={{ marginTop: 18 }}>
        <button className="btn" type="submit">保存订单</button>
      </div>
    </form>
  );
}
