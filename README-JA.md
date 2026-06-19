# NexusCounter

Node.js ウェブアプリケーション向けのページ・投稿ビューカウンターモジュールです。

[WordPress Post Views Counter](https://wordpress.org/plugins/post-views-counter/)を参考にしています。

## パッケージ

| パッケージ | 説明 |
|------------|------|
| `@nexuscounter/core` | トラッキングエンジン、エンティティ分類、Redis + PostgreSQL ストレージ |
| `@nexuscounter/react` | React Provider、hooks、ウィジェット、ダッシュボード |
| `@nexuscounter/vercel` | Vercel Serverless handler factory |
| `@nexuscounter/next` | Next.js App Router route factory |

## クイックスタート

```bash
npm install
npm run build
```

## TitanTrail 連携

[examples/titantrail-integration.md](examples/titantrail-integration.md)を参照してください。

## 環境変数

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `NEXUS_ENABLED` | `true` | トラッキングを有効化 |
| `NEXUS_DISPLAY_MODE` | `landing` | `off` \| `landing` \| `header` \| `footer` |
| `NEXUS_CLASSIFY_ENTITIES` | `false` | User-Agent によるエンティティ分類 |
| `NEXUS_EXCLUDE_BOTS` | `true` | 主要集計からボットを除外 |
| `NEXUS_COUNT_INTERVAL_MINUTES` | `0` | サーバー側重複防止間隔（分） |

クライアント（Vite）: `VITE_NEXUS_DISPLAY_MODE`, `VITE_NEXUS_ENABLED`, `VITE_NEXUS_STATS_PERIOD`.

## API

- `POST /api/nexus/track` — ページ/コンテンツビューを記録
- `GET /api/nexus/stats?period=7` — 公開統計 + トレンド
- `GET /api/nexus/admin?period=30` — Editor ダッシュボードデータ
- `PATCH /api/nexus/admin` — ビュー数の手動調整
- `GET /api/nexus/admin?export=1&format=csv` — データエクスポート
- `GET /api/nexus/ranked?limit=20` — ビュー数順の上位コンテンツ
