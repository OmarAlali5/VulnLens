import { Link } from 'react-router-dom'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { StatusBadge } from '@/components/scan-history/StatusBadge'
import { Button } from '@/components/ui/Button'
import type { ScanStatus } from '@/types/scan'
import { cn } from '@/utils/cn'
import { formatRelativeTime, truncateId } from '@/utils/format'

export interface HistoryEntry {
  scanId: string
  targetUrl: string
  createdAt: string
  status: ScanStatus
  riskLabel: string | null
  riskTone: 'critical' | 'high' | 'medium' | 'low' | 'safe' | null
}

interface HistoryCardProps {
  entry: HistoryEntry
  className?: string
  style?: React.CSSProperties
}

const toneBorder: Record<string, string> = {
  critical: 'border-red-500/25',
  high: 'border-orange-500/20',
  medium: 'border-yellow-500/15',
  low: 'border-blue-500/15',
  safe: 'border-emerald-500/15',
}

const toneText: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  safe: 'text-emerald-400',
}

/**
 * Mobile-friendly card representation of a single scan history entry.
 * Shown on smaller screens instead of the table layout.
 */
export function HistoryCard({ entry, className, style }: HistoryCardProps) {
  const borderClass = entry.riskTone ? toneBorder[entry.riskTone] : 'border-slate-700/40'

  return (
    <div
      className={cn(
        'glass-card group rounded-xl border p-5 transition-all duration-300',
        'hover:border-cyan-500/20 hover:shadow-[0_0_24px_-8px_rgba(34,211,238,0.15)]',
        borderClass,
        className,
      )}
      style={style}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors">
            {entry.targetUrl}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
            {truncateId(entry.scanId)}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {/* Meta row */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ClockIcon className="size-3.5" />
          {formatRelativeTime(entry.createdAt)}
        </span>
        {entry.riskLabel && entry.riskTone && (
          <span className={cn('font-medium', toneText[entry.riskTone])}>
            {entry.riskLabel}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/50 pt-4">
        <Link to={`/scans/${entry.scanId}`}>
          <Button size="sm" variant="secondary">
            <EyeIcon className="size-3.5" />
            View Results
          </Button>
        </Link>
        <DownloadReportButton scanId={entry.scanId} status={entry.status} className="text-xs px-3 py-1.5" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inline SVG icons                                                    */
/* ------------------------------------------------------------------ */

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
