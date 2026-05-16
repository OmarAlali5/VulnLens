import { cn } from '@/utils/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className, label = 'Loading…' }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  )
}
