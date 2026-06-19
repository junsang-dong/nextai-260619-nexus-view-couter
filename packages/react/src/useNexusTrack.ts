import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useNexus } from './NexusProvider.js'

export function NexusRouteTracker() {
  const { pathname, search } = useLocation()
  const { trackPageView } = useNexus()

  useEffect(() => {
    const path = `${pathname}${search}`
    trackPageView(path).catch(() => undefined)
  }, [pathname, search, trackPageView])

  return null
}

export function useNexusTrackContent(
  contentType: string,
  contentKey: string | null | undefined,
  path?: string,
) {
  const location = useLocation()
  const { trackContentView } = useNexus()
  const resolvedPath = path ?? `${location.pathname}${location.search}`

  useEffect(() => {
    if (!contentKey) return
    trackContentView(resolvedPath, contentType, contentKey).catch(() => undefined)
  }, [contentKey, contentType, resolvedPath, trackContentView])
}
