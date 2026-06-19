import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createTracker,
  createRedisStore,
  parseNexusConfigFromEnv,
  type ContentType,
  type EntityType,
  type NexusTrackerOptions,
  type TrackViewInput,
  type ViewTarget,
} from '@nexuscounter/core'

export interface NexusHandlerContext {
  trackerOptions: NexusTrackerOptions
}

function getClientIp(req: VercelRequest): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? null
  if (Array.isArray(forwarded)) return forwarded[0] ?? null
  return req.socket?.remoteAddress ?? null
}

function parseTrackBody(body: unknown): TrackViewInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const target = b.target as ViewTarget | undefined
  if (target !== 'page' && target !== 'content') return null
  const path = typeof b.path === 'string' ? b.path : '/'
  const contentType = typeof b.contentType === 'string' ? (b.contentType as ContentType) : undefined
  const contentKey = typeof b.contentKey === 'string' ? b.contentKey : undefined
  return { target, path, contentType, contentKey }
}

export function createTrackHandler(ctx: NexusHandlerContext) {
  const tracker = createTracker(ctx.trackerOptions)

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const input = parseTrackBody(body)
      if (!input) {
        return res.status(400).json({ error: 'Invalid track payload' })
      }

      const userAgent = req.headers['user-agent'] ?? null
      const clientIp = getClientIp(req)
      const result = await tracker.trackView({ ...input, userAgent, clientIp })
      return res.status(200).json({ ok: true, ...result })
    } catch (error) {
      console.error('[nexus/track]', error)
      return res.status(500).json({ error: 'Track failed' })
    }
  }
}

export function createStatsHandler(ctx: NexusHandlerContext) {
  const tracker = createTracker(ctx.trackerOptions)

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const period = Math.min(90, Math.max(1, Number(req.query.period ?? 7) || 7))
      const entity = (req.query.entity as EntityType | undefined) ?? undefined
      const stats = await tracker.getStats({ period, entity })
      const config = ctx.trackerOptions.config
      return res.status(200).json({
        ...stats,
        displayMode: config.displayMode,
        enabled: config.enabled,
      })
    } catch (error) {
      console.error('[nexus/stats]', error)
      return res.status(500).json({ error: 'Stats failed' })
    }
  }
}

export interface AdminHandlerOptions extends NexusHandlerContext {
  requireEditor: (req: VercelRequest) => boolean
}

export function createAdminHandler(options: AdminHandlerOptions) {
  const tracker = createTracker(options.trackerOptions)

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (!options.requireEditor(req)) {
      return res.status(401).json({ error: 'Editor login required' })
    }

    try {
      const period = Math.min(365, Math.max(1, Number(req.query.period ?? 7) || 7))
      const entity = (req.query.entity as EntityType | undefined) ?? undefined

      if (req.method === 'GET' && req.query.export) {
        const format = req.query.format === 'csv' ? 'csv' : 'json'
        const data = await tracker.exportData(period, format)
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="nexus-export-${period}d.${format}"`,
        )
        return res.status(200).send(data)
      }

      if (req.method === 'GET') {
        const stats = await tracker.getAdminStats({ period, entity })
        return res.status(200).json(stats)
      }

      if (req.method === 'PATCH') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Invalid body' })
        }
        await tracker.adjustView(body)
        return res.status(200).json({ ok: true })
      }

      return res.status(405).json({ error: 'Method not allowed' })
    } catch (error) {
      console.error('[nexus/admin]', error)
      return res.status(500).json({ error: 'Admin request failed' })
    }
  }
}

export function createRankedHandler(ctx: NexusHandlerContext) {
  const tracker = createTracker(ctx.trackerOptions)

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20))
      const entity = (req.query.entity as EntityType | undefined) ?? undefined
      const ranked = await tracker.getRankedContent(limit, entity)
      return res.status(200).json({ items: ranked })
    } catch (error) {
      console.error('[nexus/ranked]', error)
      return res.status(500).json({ error: 'Ranked content failed' })
    }
  }
}

export function createDefaultHandlerContext(
  overrides?: Partial<NexusTrackerOptions>,
): NexusHandlerContext {
  return {
    trackerOptions: {
      config: overrides?.config ?? parseNexusConfigFromEnv(),
      redis: overrides?.redis ?? createRedisStore(),
      postgres: overrides?.postgres,
    },
  }
}

export { parseNexusConfigFromEnv }
