import { NextResponse } from 'next/server'
import {
  createTracker,
  type AdjustViewInput,
  type ContentType,
  type EntityType,
  type NexusTrackerOptions,
  type TrackViewInput,
  type ViewTarget,
} from '@nexuscounter/core'

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null
  return null
}

function parseTrackBody(body: unknown): TrackViewInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const target = b.target as ViewTarget | undefined
  if (target !== 'page' && target !== 'content') return null
  return {
    target,
    path: typeof b.path === 'string' ? b.path : '/',
    contentType: typeof b.contentType === 'string' ? (b.contentType as ContentType) : undefined,
    contentKey: typeof b.contentKey === 'string' ? b.contentKey : undefined,
  }
}

export function createNextTrackRoute(options: NexusTrackerOptions) {
  const tracker = createTracker(options)

  return async function POST(request: Request) {
    try {
      const body = await request.json()
      const input = parseTrackBody(body)
      if (!input) {
        return NextResponse.json({ error: 'Invalid track payload' }, { status: 400 })
      }
      const userAgent = request.headers.get('user-agent')
      const clientIp = getClientIp(request)
      const result = await tracker.trackView({ ...input, userAgent, clientIp })
      return NextResponse.json({ ok: true, ...result })
    } catch {
      return NextResponse.json({ error: 'Track failed' }, { status: 500 })
    }
  }
}

export function createNextStatsRoute(options: NexusTrackerOptions) {
  const tracker = createTracker(options)

  return async function GET(request: Request) {
    try {
      const url = new URL(request.url)
      const period = Math.min(90, Math.max(1, Number(url.searchParams.get('period') ?? 7) || 7))
      const entity = (url.searchParams.get('entity') as EntityType | null) ?? undefined
      const stats = await tracker.getStats({ period, entity })
      return NextResponse.json({
        ...stats,
        displayMode: options.config.displayMode,
        enabled: options.config.enabled,
      })
    } catch {
      return NextResponse.json({ error: 'Stats failed' }, { status: 500 })
    }
  }
}

export function createNextAdminRoute(
  options: NexusTrackerOptions,
  requireEditor: (request: Request) => boolean,
) {
  const tracker = createTracker(options)

  return async function handler(request: Request) {
    if (!requireEditor(request)) {
      return NextResponse.json({ error: 'Editor login required' }, { status: 401 })
    }

    try {
      const url = new URL(request.url)
      const period = Math.min(365, Math.max(1, Number(url.searchParams.get('period') ?? 7) || 7))
      const entity = (url.searchParams.get('entity') as EntityType | null) ?? undefined

      if (request.method === 'GET' && url.searchParams.get('export')) {
        const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json'
        const data = await tracker.exportData(period, format)
        return new NextResponse(data, {
          headers: {
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
            'Content-Disposition': `attachment; filename="nexus-export-${period}d.${format}"`,
          },
        })
      }

      if (request.method === 'GET') {
        const stats = await tracker.getAdminStats({ period, entity })
        return NextResponse.json(stats)
      }

      if (request.method === 'PATCH') {
        const body = (await request.json()) as AdjustViewInput
        await tracker.adjustView(body)
        return NextResponse.json({ ok: true })
      }

      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    } catch {
      return NextResponse.json({ error: 'Admin request failed' }, { status: 500 })
    }
  }
}

export function createNextRankedRoute(options: NexusTrackerOptions) {
  const tracker = createTracker(options)

  return async function GET(request: Request) {
    try {
      const url = new URL(request.url)
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20))
      const entity = (url.searchParams.get('entity') as EntityType | null) ?? undefined
      const items = await tracker.getRankedContent(limit, entity)
      return NextResponse.json({ items })
    } catch {
      return NextResponse.json({ error: 'Ranked content failed' }, { status: 500 })
    }
  }
}
