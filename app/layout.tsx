import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "个人订单跟进台",
  description: "单人使用的订单跟进原型"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="layout-shell">
          <div className="layout">
            <header className="app-header panel">
              <div className="app-header-main">
                <div>
                  <div className="eyebrow">单人工作流 · 本地原型</div>
                  <h1>个人订单跟进台</h1>
                  <div className="small">Excel 导入导出 · SQLite 持久化 · 更醒目的风险、进度与闭环视图</div>
                </div>
                <div className="actions">
                  <Link href="/orders/new" className="btn">新建订单</Link>
                </div>
              </div>
              <nav className="nav">
                <Link href="/">首页状态台</Link>
                <Link href="/orders">订单列表</Link>
                <Link href="/import-export">导入导出</Link>
                <Link href="/settings">设置页</Link>
              </nav>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
