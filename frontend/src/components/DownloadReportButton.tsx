import { useState } from 'react'
import { useDownloadReport } from '@/hooks/useScans'
import type { ScanStatus } from '@/types/scan'
import { cn } from '@/utils/cn'

interface DownloadReportButtonProps {
  scanId: string
  status: ScanStatus
  className?: string
}

/**
 * Reusable PDF report download button.
 *
 * - Shows a download icon + label
 * - Disabled when the scan status is not COMPLETED
 * - Shows a spinner while the download is in flight
 * - Displays a transient error toast on failure
 */
export function DownloadReportButton({
  scanId,
  status,
  className,
}: DownloadReportButtonProps) {
  const downloadReport = useDownloadReport()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isCompleted = status === 'COMPLETED'
  const isLoading = downloadReport.isPending

  function handleClick() {
    setErrorMsg(null)
    downloadReport.mutate(scanId, {
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to download report'
        setErrorMsg(message)
        // Auto-dismiss the error after 5 seconds
        setTimeout(() => setErrorMsg(null), 5000)
      },
    })
  }

  return (
    <div className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={!isCompleted || isLoading}
        aria-label="Download PDF Report"
        id="download-report-btn"
        className={cn(
          // --- base ---
          'btn-glow relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl',
          'px-5 py-2.5 text-sm font-semibold tracking-wide',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',

          // --- enabled / primary ---
          isCompleted &&
            !isLoading &&
            cn(
              'bg-gradient-to-r from-cyan-500 to-cyan-400 text-surface-950',
              'border border-cyan-300/40',
              'shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]',
              'hover:from-cyan-400 hover:to-cyan-300',
              'hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.7)]',
              'hover:-translate-y-0.5 active:translate-y-0',
            ),

          // --- loading ---
          isLoading &&
            cn(
              'bg-gradient-to-r from-cyan-600 to-cyan-500 text-surface-950',
              'border border-cyan-400/30 cursor-wait',
            ),

          // --- disabled (not completed) ---
          !isCompleted &&
            cn(
              'bg-surface-800 text-slate-500 border border-slate-700/50',
              'cursor-not-allowed opacity-60',
            ),

          className,
        )}
      >
        {/* Shimmer overlay */}
        <span
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
            'translate-x-[-100%] transition-transform duration-700',
            isCompleted && !isLoading && 'group-hover:translate-x-[100%]',
          )}
          aria-hidden
        />

        {/* Icon or spinner */}
        {isLoading ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          <DownloadIcon className="size-4 shrink-0" />
        )}

        <span className={cn(isLoading && 'opacity-80')}>
          {isLoading ? 'Downloading…' : 'Download PDF Report'}
        </span>
      </button>

      {/* Error toast */}
      {errorMsg && (
        <div
          role="alert"
          className={cn(
            'absolute top-full left-0 z-10 mt-2 w-max max-w-xs',
            'rounded-lg border border-red-500/30 bg-red-950/90 backdrop-blur-sm',
            'px-3 py-2 text-xs text-red-300 shadow-lg',
            'animate-fade-in',
          )}
        >
          <div className="flex items-center gap-2">
            <ErrorIcon className="size-3.5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Tooltip for disabled state */}
      {!isCompleted && (
        <p className="mt-1 text-[10px] text-slate-500">
          Available after scan completes
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Inline SVG icons — no external icon library needed                  */
/* ------------------------------------------------------------------ */

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 11.586V3a1 1 0 0 1 1-1Z" />
      <path d="M3 16a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
