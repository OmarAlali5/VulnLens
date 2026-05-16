import { Link } from 'react-router-dom'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { StatusBadge } from '@/components/scan-history/StatusBadge'
import type { HistoryEntry } from '@/components/scan-history/HistoryCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { formatRelativeTime, truncateId } from '@/utils/format'

interface HistoryTableProps {
  entries: HistoryEntry[]
  className?: string
}

const toneText: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-blue-400',
  safe: 'text-emerald-400',
}

/**
 * Desktop table layout for scan history.
 * Each row has staggered fade-in-up animations and hover glow effects.
 */
export function HistoryTable({ entries, className }: HistoryTableProps) {
  return (
    <Card className={cn('glass-panel overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" id="scan-history-table">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Target
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Scan Date
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Status
              </th>
              <th className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Risk Level
              </th>
              <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {entries.map((entry, index) => (
              <tr
                key={entry.scanId}
                className={cn(
                  'group transition-colors duration-200',
                  'hover:bg-cyan-500/[0.03]',
                  'findings-section-enter',
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Target */}
                <td className="px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate max-w-[260px] font-medium text-slate-200 group-hover:text-cyan-200 transition-colors">
                      {entry.targetUrl}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                      {truncateId(entry.scanId)}
                    </p>
                  </div>
                </td>

                {/* Date */}
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-400">
                  {formatRelativeTime(entry.createdAt)}
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <StatusBadge status={entry.status} />
                </td>

                {/* Risk Level */}
                <td className="px-4 py-4">
                  {entry.riskLabel && entry.riskTone ? (
                    <span className={cn('text-xs font-semibold', toneText[entry.riskTone])}>
                      {entry.riskLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/scans/${entry.scanId}`}>
                      <Button size="sm" variant="ghost">
                        <EyeIcon className="size-3.5" />
                        View
                      </Button>
                    </Link>
                    <DownloadReportButton
                      scanId={entry.scanId}
                      status={entry.status}
                      className="text-xs px-2.5 py-1"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Inline SVG icons                                                    */
/* ------------------------------------------------------------------ */

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
