import { cn } from '@/utils/cn'
import type { ScanStatus } from '@/types/scan'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: Severity | ScanStatus | 'default'
  className?: string
}

const variantStyles: Record<string, string> = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  info: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  RUNNING: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 animate-pulse',
  COMPLETED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const normalized = String(variant).toLowerCase()
  const key = normalized in variantStyles ? normalized : String(variant)
  const styles = variantStyles[key] ?? variantStyles.default

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        styles,
        className,
      )}
    >
      {children}
    </span>
  )
}
