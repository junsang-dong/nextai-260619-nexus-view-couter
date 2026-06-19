export type EntityType =
  | 'human'
  | 'search_bot'
  | 'agent_bot'
  | 'preview_bot'
  | 'unknown'
  | 'all'

export type DisplayMode = 'off' | 'landing' | 'header' | 'footer'

export type ViewTarget = 'page' | 'content'

export type ContentType = 'page' | 'report' | 'macro' | 'news'

export interface NexusConfig {
  enabled: boolean
  displayMode: DisplayMode
  /** When true, User-Agent is classified into entity types */
  classifyEntities: boolean
  /** Entity types excluded from primary (human-facing) counts */
  excludeEntities: EntityType[]
  /** Minutes before same IP+path can count again (0 = disabled) */
  countIntervalMinutes: number
  siteId?: string
}

export interface TrackViewInput {
  target: ViewTarget
  path: string
  contentType?: ContentType
  contentKey?: string
  userAgent?: string | null
  clientIp?: string | null
}

export interface TrendPoint {
  date: string
  views: number
}

export interface TopItem {
  key: string
  label: string
  views: number
}

export interface EntityBreakdown {
  entityType: EntityType
  views: number
}

export interface NexusStats {
  totalViews: number
  todayViews: number
  periodViews: number
  trend: TrendPoint[]
  entityBreakdown?: EntityBreakdown[]
}

export interface AdminStats extends NexusStats {
  topPages: TopItem[]
  topContent: TopItem[]
}

export interface AdjustViewInput {
  target: 'site' | 'page' | 'content'
  path?: string
  contentType?: ContentType
  contentKey?: string
  entityType?: EntityType
  delta: number
}

export interface RankedContentItem {
  contentType: ContentType
  contentKey: string
  views: number
}

export interface RedisStore {
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  get(key: string): Promise<string | number | null>
  mget(keys: string[]): Promise<(string | number | null)[]>
  set(key: string, value: string | number, options?: { ex?: number; nx?: boolean }): Promise<boolean | null>
}

export interface PostgresStore {
  recordView(input: {
    date: Date
    path: string
    contentType?: ContentType
    contentKey?: string
    entityType: EntityType
  }): Promise<void>
  getDailyTrend(input: {
    days: number
    entityType: EntityType
    path?: string
  }): Promise<TrendPoint[]>
  getEntityBreakdown(input: { days: number }): Promise<EntityBreakdown[]>
  getTopPages(input: { days: number; entityType: EntityType; limit: number }): Promise<TopItem[]>
  getTopContent(input: { days: number; entityType: EntityType; limit: number }): Promise<TopItem[]>
  adjustView(input: AdjustViewInput): Promise<void>
  getRankedContent(input: { entityType: EntityType; limit: number }): Promise<RankedContentItem[]>
  exportRows(input: { days: number; format: 'json' | 'csv' }): Promise<string>
}

export interface NexusTrackerOptions {
  config: NexusConfig
  redis: RedisStore
  postgres?: PostgresStore
}
