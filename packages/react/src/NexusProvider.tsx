import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DisplayMode } from '@nexuscounter/core'
import {
  type NexusClientConfig,
  type NexusContextValue,
  hasSessionTracked,
  markSessionTracked,
  nexusFetch,
  sessionTrackKey,
} from './client.js'

const NexusContext = createContext<NexusContextValue | null>(null)

export interface NexusProviderProps {
  children: ReactNode
  config?: NexusClientConfig
}

export function NexusProvider({ children, config = {} }: NexusProviderProps) {
  const value = useMemo<NexusContextValue>(() => {
    const apiBase = config.apiBase ?? '/api/nexus'
    const resolved: NexusContextValue['config'] = {
      apiBase,
      displayMode: config.displayMode ?? 'landing',
      enabled: config.enabled !== false,
      statsPeriod: config.statsPeriod ?? 7,
    }

    return {
      config: resolved,
      async fetchStats() {
        return nexusFetch(`${apiBase}/stats?period=${resolved.statsPeriod}`)
      },
      async trackPageView(path) {
        if (!resolved.enabled) return
        const key = sessionTrackKey(path)
        if (hasSessionTracked(key)) return
        markSessionTracked(key)
        await nexusFetch(`${apiBase}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: 'page', path }),
        })
      },
      async trackContentView(path, contentType, contentKey) {
        if (!resolved.enabled) return
        const key = sessionTrackKey(path, `${contentType}:${contentKey}`)
        if (hasSessionTracked(key)) return
        markSessionTracked(key)
        await nexusFetch(`${apiBase}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'content',
            path,
            contentType,
            contentKey,
          }),
        })
      },
    }
  }, [config.apiBase, config.displayMode, config.enabled, config.statsPeriod])

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
}

export function useNexus(): NexusContextValue {
  const ctx = useContext(NexusContext)
  if (!ctx) throw new Error('useNexus must be used within NexusProvider')
  return ctx
}

export function useNexusDisplayMode(): DisplayMode {
  return useNexus().config.displayMode
}
