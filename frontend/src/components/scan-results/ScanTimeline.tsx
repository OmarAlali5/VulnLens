import type { ScanStatus } from '@/types/scan'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'

interface ScanTimelineProps {
  status: ScanStatus
  createdAt: string
  updatedAt: string
  scannedAt: string | null
  className?: string
}

interface TimelineStep {
  key: string
  label: string
  description: string
  timestamp: string | null
  state: 'done' | 'active' | 'upcoming' | 'failed'
}

function buildSteps(
  status: ScanStatus,
  createdAt: string,
  updatedAt: string,
  scannedAt: string | null,
): TimelineStep[] {
  const steps: TimelineStep[] = [
    {
      key: 'created',
      label: 'Created',
      description: 'Scan job submitted',
      timestamp: createdAt,
      state: 'done',
    },
    {
      key: 'pending',
      label: 'Queued',
      description: 'Waiting for worker',
      timestamp: status === 'PENDING' ? null : createdAt,
      state: status === 'PENDING' ? 'active' : 'done',
    },
    {
      key: 'running',
      label: 'Scanning',
      description: 'Analysing target modules',
      timestamp:
        status === 'RUNNING'
          ? updatedAt
          : status === 'COMPLETED' || status === 'FAILED'
            ? updatedAt
            : null,
      state:
        status === 'RUNNING'
          ? 'active'
          : status === 'COMPLETED' || status === 'FAILED'
            ? 'done'
            : 'upcoming',
    },
  ]

  if (status === 'FAILED') {
    steps.push({
      key: 'failed',
      label: 'Failed',
      description: 'Scan encountered an error',
      timestamp: updatedAt,
      state: 'failed',
    })
  } else {
    steps.push({
      key: 'completed',
      label: 'Completed',
      description: 'Results ready',
      timestamp: status === 'COMPLETED' ? (scannedAt ?? updatedAt) : null,
      state: status === 'COMPLETED' ? 'done' : 'upcoming',
    })
  }

  return steps
}

const stateStyles = {
  done: {
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    line: 'bg-emerald-500/40',
    label: 'text-slate-200',
    desc: 'text-slate-400',
    time: 'text-slate-500',
  },
  active: {
    dot: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]',
    line: 'bg-cyan-500/30',
    label: 'text-cyan-300',
    desc: 'text-cyan-400/70',
    time: 'text-cyan-500/80',
  },
  upcoming: {
    dot: 'bg-slate-600',
    line: 'bg-slate-700/40',
    label: 'text-slate-500',
    desc: 'text-slate-600',
    time: 'text-slate-600',
  },
  failed: {
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]',
    line: 'bg-red-500/30',
    label: 'text-red-300',
    desc: 'text-red-400/70',
    time: 'text-red-500/80',
  },
}

/**
 * Vertical timeline showing the lifecycle of a scan.
 */
export function ScanTimeline({ status, createdAt, updatedAt, scannedAt, className }: ScanTimelineProps) {
  const steps = buildSteps(status, createdAt, updatedAt, scannedAt)

  return (
    <div className={cn('relative', className)} role="list" aria-label="Scan lifecycle">
      {steps.map((step, idx) => {
        const styles = stateStyles[step.state]
        const isLast = idx === steps.length - 1

        return (
          <div
            key={step.key}
            className={cn(
              'relative flex gap-4 pb-6 animate-slide-in-right',
              isLast && 'pb-0',
            )}
            style={{ animationDelay: `${idx * 100}ms` }}
            role="listitem"
          >
            {/* Dot + vertical line */}
            <div className="flex flex-col items-center">
              <span className="relative flex size-3">
                {step.state === 'active' && (
                  <span
                    className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-50', styles.dot)}
                    aria-hidden
                  />
                )}
                <span className={cn('relative inline-flex size-3 rounded-full', styles.dot)} aria-hidden />
              </span>
              {!isLast && (
                <span
                  className={cn('mt-1 w-px flex-1 min-h-[24px]', styles.line)}
                  aria-hidden
                />
              )}
            </div>

            {/* Content */}
            <div className="-mt-0.5 min-w-0 flex-1">
              <p className={cn('text-sm font-semibold', styles.label)}>{step.label}</p>
              <p className={cn('text-xs', styles.desc)}>{step.description}</p>
              {step.timestamp && (
                <p className={cn('mt-0.5 text-[10px] font-mono', styles.time)}>
                  {formatDateTime(step.timestamp)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
