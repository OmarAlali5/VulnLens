import type { FindingSummary } from '@/types/scan'
import { cn } from '@/utils/cn'

interface SeveritySummaryProps {
  summary: FindingSummary
  compact?: boolean
}

const SEVERITY_CONFIG = [
  { key: 'critical' as const, label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { key: 'high' as const, label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { key: 'medium' as const, label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { key: 'low' as const, label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { key: 'info' as const, label: 'Info', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-600/20' },
]

export function SeveritySummary({ summary, compact = false }: SeveritySummaryProps) {
  const total = Object.values(summary).reduce((a, b) => a + b, 0)

  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
      {SEVERITY_CONFIG.map(({ key, label, color, bg }) => (
        <div
          key={key}
          className={cn('rounded-lg border px-4 py-3 text-center', bg)}
        >
          <p className={cn('text-2xl font-bold tabular-nums', color)}>{summary[key]}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
        </div>
      ))}
      {!compact && (
        <p className="col-span-full text-center text-xs text-slate-500">
          {total} finding{total !== 1 ? 's' : ''} across all modules
        </p>
      )}
    </div>
  )
}
