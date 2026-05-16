import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type LoadingButtonVariant = 'primary' | 'secondary'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: LoadingButtonVariant
}

const variantStyles: Record<LoadingButtonVariant, string> = {
  primary: cn(
    'bg-gradient-to-r from-cyan-500 to-cyan-400 text-surface-950',
    'border border-cyan-300/40 shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]',
    'hover:from-cyan-400 hover:to-cyan-300 hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.7)]',
    'hover:-translate-y-0.5 active:translate-y-0',
  ),
  secondary: cn(
    'bg-slate-800/60 text-slate-200 border border-slate-600/50',
    'hover:bg-slate-700/60 hover:border-slate-500/60',
    'hover:-translate-y-0.5 active:translate-y-0',
  ),
}

export function LoadingButton({
  loading = false,
  variant = 'primary',
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'btn-glow relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3',
        'text-sm font-semibold tracking-wide transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
        'group disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
          'translate-x-[-100%] transition-transform duration-700',
          !loading && 'group-hover:translate-x-[100%]',
        )}
        aria-hidden
      />
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      <span className={cn(loading && 'opacity-80')}>{children}</span>
    </button>
  )
}
