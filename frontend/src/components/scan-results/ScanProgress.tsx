import { cn } from '@/utils/cn'
import type { ScanStatus } from '@/types/scan'
import { getProgressForStatus, isActiveScan } from '@/utils/scanResults'

interface ScanProgressProps {
  status: ScanStatus
  className?: string
}

export function ScanProgress({ status, className }: ScanProgressProps) {
  const progress = getProgressForStatus(status)
  const active = isActiveScan(status)
  const failed = status === 'FAILED'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Scan progress</p>
        <p className="font-mono text-sm tabular-nums text-slate-300">
          {failed ? '—' : `${progress}%`}
        </p>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            failed && 'bg-red-500/60',
            status === 'COMPLETED' && 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_12px_rgba(52,211,153,0.3)]',
            active && 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.25)] scan-progress-active',
            status === 'PENDING' && !failed && 'bg-amber-500/70',
          )}
          style={
            active
              ? undefined
              : { width: failed ? '100%' : `${progress}%` }
          }
          role="progressbar"
          aria-valuenow={failed ? 0 : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scan progress"
        />
        {/* Inner shimmer */}
        {(active || status === 'COMPLETED') && (
          <div
            className="pointer-events-none absolute inset-0 skeleton-shimmer rounded-full opacity-60"
            aria-hidden
          />
        )}
      </div>
      {active && (
        <p className="text-xs text-cyan-400/90">
          Analyzing target modules — this page refreshes automatically.
        </p>
      )}
    </div>
  )
}
