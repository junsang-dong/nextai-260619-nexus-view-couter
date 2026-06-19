import type { DisplayMode, EntityType, NexusConfig } from './types.js'

const DEFAULT_EXCLUDE: EntityType[] = ['search_bot', 'agent_bot', 'preview_bot']

export function parseNexusConfigFromEnv(env: NodeJS.ProcessEnv = process.env): NexusConfig {
  const displayMode = (env.NEXUS_DISPLAY_MODE ?? 'landing') as DisplayMode
  const excludeRaw = env.NEXUS_EXCLUDE_ENTITIES ?? ''
  let excludeEntities: EntityType[] = excludeRaw
    ? (excludeRaw.split(',').map((s) => s.trim()) as EntityType[])
    : DEFAULT_EXCLUDE

  if (env.NEXUS_EXCLUDE_BOTS === 'false') {
    excludeEntities = []
  } else if (env.NEXUS_EXCLUDE_BOTS === 'true' && !excludeRaw) {
    excludeEntities = DEFAULT_EXCLUDE
  }

  return {
    enabled: env.NEXUS_ENABLED !== 'false',
    displayMode: ['off', 'landing', 'header', 'footer'].includes(displayMode)
      ? displayMode
      : 'landing',
    classifyEntities: env.NEXUS_CLASSIFY_ENTITIES === 'true',
    excludeEntities,
    countIntervalMinutes: Math.max(0, Number(env.NEXUS_COUNT_INTERVAL_MINUTES ?? '0') || 0),
    siteId: env.NEXUS_SITE_ID || undefined,
  }
}

export function shouldCountEntity(config: NexusConfig, entityType: EntityType): boolean {
  if (!config.classifyEntities) return true
  if (entityType === 'all') return true
  return !config.excludeEntities.includes(entityType)
}

export function primaryEntityType(config: NexusConfig): EntityType {
  return config.classifyEntities ? 'human' : 'all'
}

export function sitePrefix(siteId?: string): string {
  return siteId ? `nexus:${siteId}` : 'nexus'
}
