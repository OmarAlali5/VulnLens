import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/scan-history/StatusBadge'
import { Card, CardContent } from '@/components/ui/Card'
import { useScan } from '@/hooks/useScans'
import type { ScanStatus } from '@/types/scan'
import { cn } from '@/utils/cn'
import { formatRelativeTime, truncateId } from '@/utils/format'
import { getRecentScans, type RecentScanEntry } from '@/utils/recentScans'
import { calculateRiskScore, riskScoreLabel, riskScoreTone } from '@/utils/scanResults'

/* ------------------------------------------------------------------ */
/* Single enriched row                                                 */
/* ------------------------------------------------------------------ */

function RecentRow({ entry, index }: { entry: RecentScanEntry; index: number }) {
  const { data } = useScan(entry.scanId)

  const status: ScanStatus = data?.status ?? 'PENDING'
  const riskInfo = useMemo(() => {
    if (!data?.result?.summary) return null
    const score = calculateRiskScore(data.result.summary)
    return { label: riskScoreLabel(score), tone: riskScoreTone(score) }
  }, [data])

  const toneText: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-blue-400',
    safe: 'text-emerald-400',
  }

  return (
    <Link
      to={`/scans/${entry.scanId}`}
      className={cn(
        'group flex items-center justify-between gap-4 px-5 py-3.5 transition-all duration-200',
        'hover:bg-cyan-500/[0.04]',
        'animate-slide-in-right',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200 group-hover:text-cyan-200 transition-colors">
          {data?.target_url ?? entry.targetUrl}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">
            {truncateId(entry.scanId)}
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-[10px] text-slate-500">
            {formatRelativeTime(entry.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {riskInfo && (
          <span className={cn('hidden text-[10px] font-semibold sm:inline', toneText[riskInfo.tone])}>
            {riskInfo.label}
          </span>
        )}
        <StatusBadge status={status} className="text-[9px]" />
        <svg
          className="size-4 text-slate-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

interface RecentScansWidgetProps {
  className?: string
}

/**
 * Dashboard widget that shows the most recent scans with live-enriched data.
 */
export function RecentScansWidget({ className }: RecentScansWidgetProps) {
  const recentScans = getRecentScans()

  if (recentScans.length === 0) {
    return (
      <Card className={cn('glass-panel', className)}>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-slate-700/50 bg-surface-850/80">
            <svg
              className="size-5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400">No recent scans</p>
          <p className="mt-1 text-xs text-slate-500">
            Completed scans will appear here automatically.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('glass-panel overflow-hidden', className)}>
      <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Recent Scans</h3>
          <p className="text-[10px] text-slate-500">
            {recentScans.length} scan{recentScans.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <Link
          to="/history"
          className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
        >
          View all →
        </Link>
      </div>

      <CardContent className="divide-y divide-slate-800/40 p-0">
        {recentScans.slice(0, 5).map((scan, idx) => (
          <RecentRow key={scan.scanId} entry={scan} index={idx} />
        ))}
      </CardContent>
    </Card>
  )
}
