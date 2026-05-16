import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg border bg-surface-900/80 px-4 py-2.5 text-sm text-slate-100',
          'placeholder:text-slate-500',
          'border-slate-700/80 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20',
          'transition-colors',
          error && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20',
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
