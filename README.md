# NexusCounter

Page & post view counter module for Node.js web applications.

Inspired by [WordPress Post Views Counter](https://wordpress.org/plugins/post-views-counter/).

## Packages

| Package | Description |
|---------|-------------|
| `@nexuscounter/core` | Tracking engine, entity classification, Redis + PostgreSQL storage |
| `@nexuscounter/react` | React Provider, hooks, widgets, dashboard |
| `@nexuscounter/vercel` | Vercel Serverless handler factories |
| `@nexuscounter/next` | Next.js App Router route factories |

## Quick start

```bash
npm install
npm run build
```

## TitanTrail integration

See [examples/titantrail-integration.md](examples/titantrail-integration.md).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXUS_ENABLED` | `true` | Enable tracking |
| `NEXUS_DISPLAY_MODE` | `landing` | `off` \| `landing` \| `header` \| `footer` |
| `NEXUS_CLASSIFY_ENTITIES` | `false` | User-Agent entity classification |
| `NEXUS_EXCLUDE_BOTS` | `true` | Exclude bots from primary counts |
| `NEXUS_COUNT_INTERVAL_MINUTES` | `0` | Server-side dedup interval |

Client (Vite): `VITE_NEXUS_DISPLAY_MODE`, `VITE_NEXUS_ENABLED`, `VITE_NEXUS_STATS_PERIOD`.

## API

- `POST /api/nexus/track` — record page/content view
- `GET /api/nexus/stats?period=7` — public stats + trend
- `GET /api/nexus/admin?period=30` — editor dashboard data
- `PATCH /api/nexus/admin` — manual count adjustment
- `GET /api/nexus/admin?export=1&format=csv` — export
- `GET /api/nexus/ranked?limit=20` — top content by views
