import { useCallback, useEffect, useState } from 'react'
import type { AdminStats } from '@nexuscounter/core'
import { entityLabel } from '@nexuscounter/core'
import { formatViewCount, nexusFetch } from './client.js'
import { useNexus } from './NexusProvider.js'
import { NexusTrendChart } from './NexusTrendChart.js'

export interface NexusDashboardProps {
  className?: string
  authToken?: string | null
  period?: number
}

export function NexusDashboard({ className = '', authToken, period = 7 }: NexusDashboardProps) {
  const { config } = useNexus()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers: Record<string, string> = {}
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const data = await nexusFetch<AdminStats>(
        `${config.apiBase}/admin?period=${period}`,
        { headers },
      )
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [authToken, config.apiBase, period])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <p className={`text-sm opacity-70 ${className}`.trim()}>Loading traffic data…</p>
  }

  if (error) {
    return <p className={`text-sm text-red-600 ${className}`.trim()}>{error}</p>
  }

  if (!stats) return null

  return (
    <div className={`space-y-6 ${className}`.trim()}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total views" value={stats.totalViews} />
        <StatCard label="Today" value={stats.todayViews} />
        <StatCard label={`Last ${period}d`} value={stats.periodViews} />
        <StatCard
          label="Avg / day"
          value={Math.round(stats.periodViews / Math.max(period, 1))}
        />
      </div>

      <NexusTrendChart period={period} title={`Daily views (${period}d)`} height={220} />

      {stats.entityBreakdown && stats.entityBreakdown.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Entity breakdown</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.entityBreakdown.map((row) => (
              <div
                key={row.entityType}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{entityLabel(row.entityType)}</span>
                <span className="font-medium tabular-nums">{formatViewCount(row.views)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RankTable title="Top pages" rows={stats.topPages} />
        <RankTable title="Top content" rows={stats.topContent} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border px-4 py-3">
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold tabular-nums">{formatViewCount(value)}</p>
    </div>
  )
}

function RankTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ key: string; label: string; views: number }>
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-black/5 text-xs uppercase opacity-70">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="max-w-[200px] truncate px-3 py-2" title={row.label}>
                  {row.label}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatViewCount(row.views)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
