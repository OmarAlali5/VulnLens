import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  className?: string
}

/**
 * Displayed when the scan history has no entries.
 * Shows a friendly illustration + CTA to start a new scan.
 */
export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 text-center animate-fade-in',
        className,
      )}
    >
      {/* Radar / shield illustration */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden />
        <div
          className={cn(
            'relative flex size-20 items-center justify-center rounded-full',
            'border border-slate-700/50 bg-surface-850/80',
            'shadow-[0_0_40px_-8px_rgba(34,211,238,0.2)]',
          )}
        >
          <svg
            className="size-9 text-cyan-400/70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-200">No scan history yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Launch your first security assessment to see results here. Scans include HTTP headers,
        SSL/TLS, and port analysis.
      </p>

      <Link to="/scans/new" className="mt-6">
        <Button size="lg">
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Start New Scan
        </Button>
      </Link>
    </div>
  )
}
