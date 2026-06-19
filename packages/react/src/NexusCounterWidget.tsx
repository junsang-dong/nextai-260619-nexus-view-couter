import { useEffect, useState } from 'react'
import { formatViewCount, nexusFetch } from './client.js'
import { useNexus } from './NexusProvider.js'

export interface NexusCounterWidgetProps {
  className?: string
  label?: string
  showLabel?: boolean
  refreshMs?: number
}

export function NexusCounterWidget({
  className = '',
  label = 'Site views',
  showLabel = false,
  refreshMs = 60_000,
}: NexusCounterWidgetProps) {
  const { config } = useNexus()
  const [totalViews, setTotalViews] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const stats = await nexusFetch<{ totalViews: number }>(
          `${config.apiBase}/stats?period=${config.statsPeriod}`,
        )
        if (active) setTotalViews(stats.totalViews)
      } catch {
        if (active) setTotalViews((prev) => prev ?? 0)
      }
    }

    load()
    const timer = window.setInterval(load, refreshMs)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [config.apiBase, config.statsPeriod, refreshMs])

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs ${className}`.trim()}
      title={label}
      aria-label={`${label}: ${totalViews ?? 0}`}
    >
      <svg
        className="h-3.5 w-3.5 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="font-medium tabular-nums">
        {totalViews === null ? '—' : formatViewCount(totalViews)}
      </span>
      {showLabel && <span className="opacity-70">{label}</span>}
    </div>
  )
}
