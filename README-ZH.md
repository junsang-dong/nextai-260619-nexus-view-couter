# NexusCounter

适用于 Node.js Web 应用的页面与文章浏览量计数模块。

参考了 [WordPress Post Views Counter](https://wordpress.org/plugins/post-views-counter/)。

## 包

| 包 | 说明 |
|----|------|
| `@nexuscounter/core` | 追踪引擎、实体分类、Redis + PostgreSQL 存储 |
| `@nexuscounter/react` | React Provider、hooks、组件、仪表盘 |
| `@nexuscounter/vercel` | Vercel Serverless handler factory |
| `@nexuscounter/next` | Next.js App Router route factory |

## 快速开始

```bash
npm install
npm run build
```

## TitanTrail 集成

请参阅 [examples/titantrail-integration.md](examples/titantrail-integration.md)。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NEXUS_ENABLED` | `true` | 启用追踪 |
| `NEXUS_DISPLAY_MODE` | `landing` | `off` \| `landing` \| `header` \| `footer` |
| `NEXUS_CLASSIFY_ENTITIES` | `false` | 基于 User-Agent 的实体分类 |
| `NEXUS_EXCLUDE_BOTS` | `true` | 在主要统计中排除机器人 |
| `NEXUS_COUNT_INTERVAL_MINUTES` | `0` | 服务端去重间隔（分钟） |

客户端（Vite）: `VITE_NEXUS_DISPLAY_MODE`, `VITE_NEXUS_ENABLED`, `VITE_NEXUS_STATS_PERIOD`.

## API

- `POST /api/nexus/track` — 记录页面/内容浏览
- `GET /api/nexus/stats?period=7` — 公开统计 + 趋势
- `GET /api/nexus/admin?period=30` — Editor 仪表盘数据
- `PATCH /api/nexus/admin` — 手动调整浏览量
- `GET /api/nexus/admin?export=1&format=csv` — 导出数据
- `GET /api/nexus/ranked?limit=20` — 按浏览量排序的热门内容
