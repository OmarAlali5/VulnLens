import { cn } from '@/utils/cn'

interface ToggleSwitchProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200',
        'border-slate-700/40 bg-slate-900/30 backdrop-blur-md',
        'hover:border-cyan-500/25 hover:bg-slate-900/50',
        checked && 'border-cyan-500/30 bg-cyan-500/5',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="min-w-0">
        <span className="block font-medium text-slate-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
          checked
            ? 'border-cyan-400/50 bg-cyan-500/20 shadow-[0_0_12px_-2px_rgba(34,211,238,0.5)]'
            : 'border-slate-600/80 bg-slate-800/80',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full transition-all duration-300',
            checked
              ? 'translate-x-5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'
              : 'translate-x-0 bg-slate-500',
          )}
        />
      </button>
    </label>
  )
}
