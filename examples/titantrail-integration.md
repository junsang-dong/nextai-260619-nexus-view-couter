# TitanTrail NexusCounter Integration

## 1. Install workspace packages

In `nextai-260523-titantrail/package.json`:

```json
"@nexuscounter/core": "file:../../nextai-260619-next-view-couter-module/packages/core",
"@nexuscounter/react": "file:../../nextai-260619-next-view-couter-module/packages/react",
"@nexuscounter/vercel": "file:../../nextai-260619-next-view-couter-module/packages/vercel"
```

Build NexusCounter first:

```bash
cd nextai-260619-next-view-couter-module && npm install && npm run build
```

## 2. Environment variables

```env
NEXUS_ENABLED=true
NEXUS_DISPLAY_MODE=landing
NEXUS_CLASSIFY_ENTITIES=true
NEXUS_EXCLUDE_BOTS=true
NEXUS_COUNT_INTERVAL_MINUTES=0
```

## 3. Prisma migration

Run `npx prisma db push` after adding NexusViewDaily and NexusContentView models.

## 4. API routes

- `api/nexus/track.ts`
- `api/nexus/stats.ts`
- `api/nexus/admin.ts`
- `api/nexus/ranked.ts`

## 5. Client

Wrap `App` with `NexusProvider`, add `NexusRouteTracker`, and place widgets in Layout/Landing based on `displayMode`.
