import { cn } from '@/utils/cn'
import type { SeverityLevel } from '@/utils/scanResults'

interface SeverityBadgeProps {
  severity: SeverityLevel | string
  className?: string
  size?: 'sm' | 'md'
}

const STYLES: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/35 shadow-[0_0_12px_-4px_rgba(239,68,68,0.5)]',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
  medium: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35',
  low: 'bg-blue-500/15 text-blue-300 border-blue-500/35',
  info: 'bg-slate-500/15 text-slate-400 border-slate-600/35',
}

const DOT_STYLES: Record<SeverityLevel, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  info: 'bg-slate-400',
}

function normalizeKey(severity: string): SeverityLevel {
  const key = severity.toLowerCase()
  if (key in STYLES) return key as SeverityLevel
  return 'info'
}

export function SeverityBadge({ severity, className, size = 'sm' }: SeverityBadgeProps) {
  const key = normalizeKey(severity)
  const label = key.charAt(0).toUpperCase() + key.slice(1)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        STYLES[key],
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT_STYLES[key])} aria-hidden />
      {label}
    </span>
  )
}
