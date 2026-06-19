import { classifyUserAgent } from './classifier.js'
import { primaryEntityType, shouldCountEntity, sitePrefix } from './config.js'
import {
  buildContentKey,
  buildDedupKey,
  buildRedisKeys,
  incrementCounters,
  readNumber,
  todayKey,
} from './storage/redis.js'
import type {
  AdjustViewInput,
  AdminStats,
  EntityType,
  NexusStats,
  NexusTrackerOptions,
  TrackViewInput,
  TrendPoint,
} from './types.js'

export class NexusTracker {
  private readonly prefix: string

  constructor(private readonly options: NexusTrackerOptions) {
    this.prefix = sitePrefix(options.config.siteId)
  }

  private resolveEntity(input: TrackViewInput): EntityType {
    if (!this.options.config.classifyEntities) return 'all'
    return classifyUserAgent(input.userAgent)
  }

  private async checkDedup(
    clientIp: string | null | undefined,
    path: string,
    entityType: EntityType,
  ): Promise<boolean> {
    const minutes = this.options.config.countIntervalMinutes
    if (!minutes || !clientIp) return true

    const key = buildDedupKey(this.prefix, clientIp, path, entityType)
    const set = await this.options.redis.set(key, '1', {
      nx: true,
      ex: minutes * 60,
    })
    return set !== null
  }

  async trackView(input: TrackViewInput): Promise<{ counted: boolean; entityType: EntityType }> {
    if (!this.options.config.enabled) {
      return { counted: false, entityType: 'all' }
    }

    const entityType = this.resolveEntity(input)
    const path = input.path || '/'

    const canDedup = await this.checkDedup(input.clientIp, path, entityType)
    if (!canDedup) {
      return { counted: false, entityType }
    }

    const primary = primaryEntityType(this.options.config)
    const shouldPrimary = shouldCountEntity(this.options.config, entityType)
    const entitiesToIncrement = new Set<EntityType>()

    if (!this.options.config.classifyEntities) {
      entitiesToIncrement.add('all')
    } else {
      entitiesToIncrement.add(entityType)
      if (shouldPrimary && entityType !== primary) {
        entitiesToIncrement.add(primary)
      }
    }

    for (const entity of entitiesToIncrement) {
      const keys = buildRedisKeys(this.prefix, entity, path)
      if (input.target === 'content' && input.contentType && input.contentKey) {
        keys.content = buildContentKey(this.prefix, input.contentType, input.contentKey, entity)
      }
      await incrementCounters(this.options.redis, keys)
    }

    if (this.options.postgres) {
      void this.options.postgres
        .recordView({
          date: new Date(),
          path,
          contentType: input.contentType,
          contentKey: input.contentKey,
          entityType,
        })
        .catch(() => undefined)
    }

    return { counted: shouldPrimary, entityType }
  }

  async getStats(params: { period?: number; entity?: EntityType } = {}): Promise<NexusStats> {
    const period = params.period ?? 7
    const entity = params.entity ?? primaryEntityType(this.options.config)
    const date = todayKey()

    const siteTotalKey = `${this.prefix}:site:total:${entity}`
    const todayKeyRedis = `${this.prefix}:daily:${date}:${entity}`

    const [totalViews, todayViews] = await Promise.all([
      readNumber(this.options.redis, siteTotalKey),
      readNumber(this.options.redis, todayKeyRedis),
    ])

    let trend: TrendPoint[] = []
    let periodViews = 0

    if (this.options.postgres) {
      trend = await this.options.postgres.getDailyTrend({ days: period, entityType: entity })
      periodViews = trend.reduce((sum, p) => sum + p.views, 0)
    } else {
      const dayKeys = Array.from({ length: period }, (_, i) => {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - (period - 1 - i))
        return `${this.prefix}:daily:${d.toISOString().slice(0, 10)}:${entity}`
      })
      const values = await this.options.redis.mget(dayKeys)
      trend = dayKeys.map((key, i) => ({
        date: key.split(':')[2] ?? '',
        views: Number(values[i] ?? 0) || 0,
      }))
      periodViews = trend.reduce((sum, p) => sum + p.views, 0)
    }

    return { totalViews, todayViews, periodViews, trend }
  }

  async getAdminStats(params: { period?: number; entity?: EntityType } = {}): Promise<AdminStats> {
    const period = params.period ?? 7
    const entity = params.entity ?? primaryEntityType(this.options.config)
    const base = await this.getStats({ period, entity })

    if (!this.options.postgres) {
      return { ...base, topPages: [], topContent: [] }
    }

    const [entityBreakdown, topPages, topContent] = await Promise.all([
      this.options.postgres.getEntityBreakdown({ days: period }),
      this.options.postgres.getTopPages({ days: period, entityType: entity, limit: 20 }),
      this.options.postgres.getTopContent({ days: period, entityType: entity, limit: 20 }),
    ])

    return { ...base, entityBreakdown, topPages, topContent }
  }

  async adjustView(input: AdjustViewInput): Promise<void> {
    if (input.delta === 0) return

    const entity = input.entityType ?? primaryEntityType(this.options.config)
    const path = input.target === 'page' ? input.path : undefined
    const keys = buildRedisKeys(this.prefix, entity, path)

    if (input.target === 'content' && input.contentType && input.contentKey) {
      keys.content = buildContentKey(
        this.prefix,
        input.contentType,
        input.contentKey,
        entity,
      )
    }

    await incrementCounters(this.options.redis, keys, input.delta)

    if (this.options.postgres) {
      await this.options.postgres.adjustView(input)
    }
  }

  async getRankedContent(limit = 20, entity?: EntityType) {
    const entityType = entity ?? primaryEntityType(this.options.config)
    if (!this.options.postgres) return []
    return this.options.postgres.getRankedContent({ entityType, limit })
  }

  async exportData(days: number, format: 'json' | 'csv'): Promise<string> {
    if (!this.options.postgres) return format === 'json' ? '[]' : 'date,path,entityType,views'
    return this.options.postgres.exportRows({ days, format })
  }
}

export function createTracker(options: NexusTrackerOptions): NexusTracker {
  return new NexusTracker(options)
}
