import { OrderForm } from "@/components/OrderForm";

export default function NewOrderPage() {
  return (
    <main>
      <section className="toolbar">
        <h2 style={{ margin: 0 }}>新建订单</h2>
        <div className="small">联系单号是业务主键。当前按一单一记录设计，后续可扩展子批次。</div>
      </section>
      <OrderForm />
    </main>
  );
}
