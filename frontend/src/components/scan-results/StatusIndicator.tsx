import { cn } from '@/utils/cn'
import type { ScanStatus } from '@/types/scan'

interface StatusIndicatorProps {
  status: ScanStatus
  className?: string
  showLabel?: boolean
}

const CONFIG: Record<
  ScanStatus,
  { label: string; dot: string; text: string; pulse?: boolean }
> = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
  RUNNING: {
    label: 'Running',
    dot: 'bg-cyan-400',
    text: 'text-cyan-300',
    pulse: true,
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
  },
  FAILED: {
    label: 'Failed',
    dot: 'bg-red-400',
    text: 'text-red-300',
  },
}

export function StatusIndicator({ status, className, showLabel = true }: StatusIndicatorProps) {
  const cfg = CONFIG[status]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1.5',
        className,
      )}
      role="status"
      aria-label={`Scan status: ${cfg.label}`}
    >
      <span className="relative flex size-2">
        {cfg.pulse && (
          <span
            className={cn(
              'absolute inline-flex size-full animate-ping rounded-full opacity-60',
              cfg.dot,
            )}
            aria-hidden
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', cfg.dot)} aria-hidden />
      </span>
      {showLabel && (
        <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.text)}>
          {cfg.label}
        </span>
      )}
    </div>
  )
}
