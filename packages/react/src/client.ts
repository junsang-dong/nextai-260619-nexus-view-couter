import type { DisplayMode, NexusStats } from '@nexuscounter/core'

export interface NexusClientConfig {
  apiBase?: string
  displayMode?: DisplayMode
  enabled?: boolean
  statsPeriod?: number
}

export interface NexusContextValue {
  config: Required<NexusClientConfig>
  fetchStats: () => Promise<NexusStats & { displayMode?: DisplayMode; enabled?: boolean }>
  trackPageView: (path: string) => Promise<void>
  trackContentView: (
    path: string,
    contentType: string,
    contentKey: string,
  ) => Promise<void>
}

const STORAGE_PREFIX = 'nexus:view:'

export function sessionTrackKey(path: string, suffix = ''): string {
  return `${STORAGE_PREFIX}${path}${suffix ? `:${suffix}` : ''}`
}

export function hasSessionTracked(key: string): boolean {
  if (typeof sessionStorage === 'undefined') return false
  return sessionStorage.getItem(key) === '1'
}

export function markSessionTracked(key: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(key, '1')
}

export async function nexusFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`NexusCounter request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export function formatViewCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}
