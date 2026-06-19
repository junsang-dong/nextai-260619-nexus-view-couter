import type { EntityType } from './types.js'

interface BotPattern {
  entity: EntityType
  patterns: RegExp[]
}

const BOT_PATTERNS: BotPattern[] = [
  {
    entity: 'search_bot',
    patterns: [
      /googlebot/i,
      /bingbot/i,
      /slurp/i,
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
      /sogou/i,
      /applebot(?!-extended)/i,
      /petalbot/i,
    ],
  },
  {
    entity: 'agent_bot',
    patterns: [
      /gptbot/i,
      /chatgpt-user/i,
      /claudebot/i,
      /anthropic-ai/i,
      /perplexitybot/i,
      /applebot-extended/i,
      /cohere-ai/i,
      /bytespider/i,
      /meta-externalagent/i,
      /amazonbot/i,
    ],
  },
  {
    entity: 'preview_bot',
    patterns: [
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
      /slackbot/i,
      /discordbot/i,
      /whatsapp/i,
      /telegrambot/i,
      /embedly/i,
    ],
  },
]

const GENERIC_BOT = /bot|crawler|spider|scraper|headless|curl|wget|python-requests|go-http-client/i

export function classifyUserAgent(userAgent: string | null | undefined): EntityType {
  const ua = (userAgent ?? '').trim()
  if (!ua) return 'unknown'

  for (const { entity, patterns } of BOT_PATTERNS) {
    if (patterns.some((p) => p.test(ua))) return entity
  }

  if (GENERIC_BOT.test(ua)) return 'unknown'
  return 'human'
}

export function entityLabel(entityType: EntityType): string {
  switch (entityType) {
    case 'human':
      return 'Human'
    case 'search_bot':
      return 'Search (SEO)'
    case 'agent_bot':
      return 'Agent (AEO/GEO)'
    case 'preview_bot':
      return 'Preview'
    case 'unknown':
      return 'Unknown'
    case 'all':
      return 'All'
    default:
      return entityType
  }
}
