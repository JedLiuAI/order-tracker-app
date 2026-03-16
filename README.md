# 个人订单跟进台

一个面向单人业务跟单场景的本地 Web 应用，适合先运行在电脑或 NAS / Docker 环境中，用于维护订单进度、风险提醒、导入导出和交付闭环。

## 技术栈

- Next.js 14
- React 18
- SQLite（better-sqlite3）
- xlsx（Excel / CSV 导入导出）

## 当前能力

- 首页按业务阶段展示订单看板
- 高风险、紧急、置顶订单集中展示
- 订单列表支持搜索和多条件筛选
- 订单详情页支持查看和编辑
- 支持手动新建订单
- 支持 Excel / CSV 导入
- 支持 Excel 导出并自选字段
- 自动推导订单阶段、风险等级和下一步动作
- SQLite 预留 `order_batches` 子表，便于后续扩展批次能力

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000
```

默认数据库位置：

```text
./data/orders.db
```

也可以通过环境变量指定：

```bash
ORDER_TRACKER_DB_PATH=./data/orders.db
```

## 生产运行

```bash
npm install
npm run build
npm run start
```

## Docker 部署

### Docker Compose

```bash
docker compose up -d --build
```

当前默认映射端口：

```text
http://NAS-IP:3003
```

对应配置见 [docker-compose.yml](/Z:/order-tracker-app/docker-compose.yml)。

### 手动构建

```bash
docker build -t order-tracker-app .
docker run -d \
  --name order-tracker-app \
  -p 3003:3000 \
  -e ORDER_TRACKER_DB_PATH=/app/data/orders.db \
  -v $(pwd)/data:/app/data \
  order-tracker-app
```

## 导入说明

支持文件格式：

- `.xlsx`
- `.xls`
- `.csv`

导入规则：

- `联系单号` 为空的行会被跳过
- 已存在的 `联系单号` 会被覆盖更新
- 不存在的 `联系单号` 会被新增

推荐使用的中文列名包括：

- 合同日期
- 合同号
- 客户名称
- 国家
- 联系单号
- 物料号
- 产品名称
- 规格
- 批号
- 包装形式
- 质量标准
- 单价
- 数量
- 合同金额
- 原料采购申请日期
- 客户确认包装日期
- 收到客户预付款日期
- 联系单审批完成日期
- 计划排产日期
- 实际生产完成日期
- 发货日期
- 开票完成日期
- 尾款收到日期
- 是否需要预付款
- 尾款条件类型
- 完成条件是否要求尾款
- 最后跟进日期
- 是否重点关注
- 首页置顶
- 手动标签
- 备注

## 数据文件与隐私

运行时数据库文件位于 `data/` 目录下，不应提交到版本控制。
仓库中的 `.gitignore` 已排除以下文件：

- `data/*.db`
- `data/*.db-shm`
- `data/*.db-wal`

如果你需要迁移真实数据，请单独备份 `data/` 目录，不要直接推送到 GitHub。

## 后续建议

- 升级 Next.js 到已修复安全问题的版本
- 为导入、阶段推导和主键迁移补测试
- 将设置页接入真实 `app_settings` 配置
- 补充批次管理 UI
