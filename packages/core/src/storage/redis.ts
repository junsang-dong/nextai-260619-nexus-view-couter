import { Redis } from '@upstash/redis'
import type { RedisStore } from '../types.js'

type MemoryStore = Map<string, number>

const globalForNexus = globalThis as unknown as { __nexusMemory?: MemoryStore }

function getMemoryStore(): MemoryStore {
  if (!globalForNexus.__nexusMemory) {
    globalForNexus.__nexusMemory = new Map()
  }
  return globalForNexus.__nexusMemory
}

function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function memoryRedisStore(): RedisStore {
  const store = getMemoryStore()
  return {
    async incr(key) {
      const next = (store.get(key) ?? 0) + 1
      store.set(key, next)
      return next
    },
    async decr(key) {
      const next = Math.max(0, (store.get(key) ?? 0) - 1)
      store.set(key, next)
      return next
    },
    async get(key) {
      const v = store.get(key)
      return v ?? null
    },
    async mget(keys) {
      return keys.map((k) => store.get(k) ?? null)
    },
    async set(key, value, options) {
      if (options?.nx && store.has(key)) return null
      store.set(key, Number(value))
      return true
    },
  }
}

function upstashRedisStore(client: Redis): RedisStore {
  return {
    async incr(key) {
      return client.incr(key)
    },
    async decr(key) {
      return client.decr(key)
    },
    async get(key) {
      const v = await client.get<string | number>(key)
      return v ?? null
    },
    async mget(keys) {
      if (keys.length === 0) return []
      const values = await client.mget<(string | number | null)[]>(...keys)
      return values ?? keys.map(() => null)
    },
    async set(key, value, options) {
      if (options?.nx && options?.ex) {
        const result = await client.set(key, value, { nx: true, ex: options.ex })
        return result === 'OK' ? true : null
      }
      if (options?.ex) {
        await client.set(key, value, { ex: options.ex })
        return true
      }
      await client.set(key, value)
      return true
    },
  }
}

export function createRedisStore(existing?: RedisStore): RedisStore {
  if (existing) return existing
  const client = getUpstashRedis()
  if (client) return upstashRedisStore(client)
  return memoryRedisStore()
}

export function isRedisPersistent(): boolean {
  return getUpstashRedis() !== null
}

export function sanitizePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/[^a-zA-Z0-9/_-]/g, '_').slice(0, 200) || '/'
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function buildRedisKeys(prefix: string, entityType: string, path?: string) {
  const date = todayKey()
  const keys = {
    siteTotal: `${prefix}:site:total:${entityType}`,
    daily: `${prefix}:daily:${date}:${entityType}`,
  } as { siteTotal: string; daily: string; path?: string; content?: string }

  if (path) {
    const safe = sanitizePath(path)
    keys.path = `${prefix}:path:${safe}:${entityType}`
  }

  return keys
}

export function buildContentKey(
  prefix: string,
  contentType: string,
  contentKey: string,
  entityType: string,
): string {
  const safeKey = contentKey.replace(/[^a-zA-Z0-9/_-]/g, '_').slice(0, 120)
  return `${prefix}:content:${contentType}:${safeKey}:${entityType}`
}

export function buildDedupKey(
  prefix: string,
  clientIp: string,
  path: string,
  entityType: string,
): string {
  const safeIp = clientIp.replace(/[^a-fA-F0-9.:]/g, '').slice(0, 45) || 'unknown'
  return `${prefix}:dedup:${safeIp}:${sanitizePath(path)}:${entityType}`
}

export async function readNumber(redis: RedisStore, key: string): Promise<number> {
  const raw = await redis.get(key)
  return Number(raw ?? 0) || 0
}

export async function incrementCounters(
  redis: RedisStore,
  keys: { siteTotal: string; daily: string; path?: string; content?: string },
  delta = 1,
): Promise<void> {
  const step = Math.abs(delta)
  const op = delta >= 0 ? redis.incr.bind(redis) : redis.decr.bind(redis)
  for (let i = 0; i < step; i++) {
    await op(keys.siteTotal)
    await op(keys.daily)
    if (keys.path) await op(keys.path)
    if (keys.content) await op(keys.content)
  }
}
