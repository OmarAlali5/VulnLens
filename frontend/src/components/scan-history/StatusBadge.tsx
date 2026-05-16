import type { ScanStatus } from '@/types/scan'
import { cn } from '@/utils/cn'

interface StatusBadgeProps {
  status: ScanStatus
  className?: string
}

const statusConfig: Record<ScanStatus, { label: string; dot: string; style: string }> = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]',
    style: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  RUNNING: {
    label: 'Running',
    dot: 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse',
    style: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  FAILED: {
    label: 'Failed',
    dot: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]',
    style: 'border-red-500/30 bg-red-500/10 text-red-300',
  },
}

/**
 * A pill-style status badge with a coloured dot indicator.
 * More visually rich than the generic Badge component — designed for dashboard/table use.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wider',
        config.style,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', config.dot)} aria-hidden />
      {config.label}
    </span>
  )
}
