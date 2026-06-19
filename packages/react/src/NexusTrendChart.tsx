import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '@nexuscounter/core'
import { nexusFetch } from './client.js'
import { useNexus } from './NexusProvider.js'

export interface NexusTrendChartProps {
  className?: string
  height?: number
  period?: number
  title?: string
}

export function NexusTrendChart({
  className = '',
  height = 160,
  period,
  title = 'Traffic trend',
}: NexusTrendChartProps) {
  const { config } = useNexus()
  const days = period ?? config.statsPeriod
  const [trend, setTrend] = useState<TrendPoint[]>([])

  useEffect(() => {
    let active = true
    nexusFetch<{ trend: TrendPoint[] }>(`${config.apiBase}/stats?period=${days}`)
      .then((data) => {
        if (active) setTrend(data.trend ?? [])
      })
      .catch(() => {
        if (active) setTrend([])
      })
    return () => {
      active = false
    }
  }, [config.apiBase, days])

  if (trend.every((p) => p.views === 0)) return null

  return (
    <div className={className}>
      {title && <p className="mb-2 text-sm font-medium opacity-80">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => v.slice(5)}
            stroke="currentColor"
            opacity={0.5}
          />
          <YAxis tick={{ fontSize: 10 }} width={32} stroke="currentColor" opacity={0.5} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            labelFormatter={(label) => String(label)}
          />
          <Line
            type="monotone"
            dataKey="views"
            stroke="currentColor"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
