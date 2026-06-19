import type {
  AdjustViewInput,
  EntityType,
  PostgresStore,
  RankedContentItem,
  TrendPoint,
} from '../types.js'
import { sanitizePath } from './redis.js'

export interface PrismaLikeClient {
  nexusViewDaily: {
    upsert(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<Array<{ date: Date; views: number; entityType: string; path: string }>>
    groupBy(args: unknown): Promise<Array<{ path: string; _sum: { views: number | null } }>>
  }
  nexusContentView: {
    upsert(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<
      Array<{ contentType: string; contentKey: string; views: number; entityType: string }>
    >
    groupBy(args: unknown): Promise<
      Array<{ contentType: string; contentKey: string; _sum: { views: number | null } }>
    >
  }
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return startOfDay(d)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function createPostgresStore(client: PrismaLikeClient): PostgresStore {
  return {
    async recordView({ date, path, contentType, contentKey, entityType }) {
      const day = startOfDay(date)
      const safePath = sanitizePath(path)

      await client.nexusViewDaily.upsert({
        where: {
          date_path_entityType: { date: day, path: safePath, entityType },
        },
        create: { date: day, path: safePath, entityType, views: 1 },
        update: { views: { increment: 1 } },
      })

      if (contentType && contentKey) {
        await client.nexusContentView.upsert({
          where: {
            contentType_contentKey_entityType: { contentType, contentKey, entityType },
          },
          create: { contentType, contentKey, entityType, views: 1 },
          update: { views: { increment: 1 } },
        })
      }
    },

    async getDailyTrend({ days, entityType, path }) {
      const since = daysAgo(days)
      const rows = await client.nexusViewDaily.findMany({
        where: {
          date: { gte: since },
          entityType,
          ...(path ? { path: sanitizePath(path) } : {}),
        },
        orderBy: { date: 'asc' },
      })

      const byDate = new Map<string, number>()
      for (const row of rows) {
        const key = formatDate(row.date)
        byDate.set(key, (byDate.get(key) ?? 0) + row.views)
      }

      const trend: TrendPoint[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const key = formatDate(d)
        trend.push({ date: key, views: byDate.get(key) ?? 0 })
      }
      return trend
    },

    async getEntityBreakdown({ days }) {
      const since = daysAgo(days)
      const rows = await client.nexusViewDaily.findMany({
        where: { date: { gte: since } },
      })
      const totals = new Map<string, number>()
      for (const row of rows) {
        totals.set(row.entityType, (totals.get(row.entityType) ?? 0) + row.views)
      }
      return Array.from(totals.entries()).map(([entityType, views]) => ({
        entityType: entityType as EntityType,
        views,
      }))
    },

    async getTopPages({ days, entityType, limit }) {
      const since = daysAgo(days)
      const grouped = await client.nexusViewDaily.groupBy({
        by: ['path'],
        where: { date: { gte: since }, entityType },
        _sum: { views: true },
        orderBy: { _sum: { views: 'desc' } },
        take: limit,
      })
      return grouped.map((row) => ({
        key: row.path,
        label: row.path,
        views: row._sum.views ?? 0,
      }))
    },

    async getTopContent({ days, entityType, limit }) {
      const grouped = await client.nexusContentView.groupBy({
        by: ['contentType', 'contentKey'],
        where: { entityType },
        _sum: { views: true },
        orderBy: { _sum: { views: 'desc' } },
        take: limit,
      })
      return grouped.map((row) => ({
        key: `${row.contentType}:${row.contentKey}`,
        label: row.contentKey,
        views: row._sum.views ?? 0,
      }))
    },

    async adjustView(input: AdjustViewInput) {
      const entityType = input.entityType ?? 'all'
      const day = startOfDay(new Date())

      if (input.target === 'site' || input.target === 'page') {
        const path = input.target === 'page' ? sanitizePath(input.path ?? '/') : '/'
        await client.nexusViewDaily.upsert({
          where: { date_path_entityType: { date: day, path, entityType } },
          create: { date: day, path, entityType, views: Math.max(0, input.delta) },
          update: { views: { increment: input.delta } },
        })
      }

      if (input.target === 'content' && input.contentType && input.contentKey) {
        await client.nexusContentView.upsert({
          where: {
            contentType_contentKey_entityType: {
              contentType: input.contentType,
              contentKey: input.contentKey,
              entityType,
            },
          },
          create: {
            contentType: input.contentType,
            contentKey: input.contentKey,
            entityType,
            views: Math.max(0, input.delta),
          },
          update: { views: { increment: input.delta } },
        })
      }
    },

    async getRankedContent({ entityType, limit }) {
      const grouped = await client.nexusContentView.groupBy({
        by: ['contentType', 'contentKey'],
        where: { entityType },
        _sum: { views: true },
        orderBy: { _sum: { views: 'desc' } },
        take: limit,
      })
      return grouped.map((row) => ({
        contentType: row.contentType as RankedContentItem['contentType'],
        contentKey: row.contentKey,
        views: row._sum.views ?? 0,
      }))
    },

    async exportRows({ days, format }) {
      const since = daysAgo(days)
      const rows = await client.nexusViewDaily.findMany({
        where: { date: { gte: since } },
        orderBy: [{ date: 'asc' }, { path: 'asc' }],
      })

      if (format === 'json') {
        return JSON.stringify(
          rows.map((r) => ({
            date: formatDate(r.date),
            path: r.path,
            entityType: r.entityType,
            views: r.views,
          })),
          null,
          2,
        )
      }

      const header = 'date,path,entityType,views'
      const lines = rows.map(
        (r) => `${formatDate(r.date)},${JSON.stringify(r.path)},${r.entityType},${r.views}`,
      )
      return [header, ...lines].join('\n')
    },
  }
}
