import { Link, useLocation } from 'react-router-dom'
import { useHealth } from '@/hooks/useHealth'
import { cn } from '@/utils/cn'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/history': 'Scan History',
  '/scans/new': 'New Scan',
}

export function Navbar() {
  const location = useLocation()
  const { data: health, isSuccess, isError, isFetching } = useHealth()

  const pathTitle =
    routeTitles[location.pathname] ??
    (location.pathname.startsWith('/scans/') ? 'Scan Results' : 'VulnLens')

  const apiOnline = isSuccess && health?.status === 'ok'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-surface-950/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
            <svg className="size-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-100">VulnLens</span>
        </Link>
        <h1 className="text-lg font-semibold text-slate-100">{pathTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
            apiOnline
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : isError
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-slate-700 bg-surface-800 text-slate-400',
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              apiOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-500',
              isFetching && 'animate-pulse',
            )}
          />
          {apiOnline ? 'API Online' : isError ? 'API Offline' : 'Checking…'}
        </div>

        <Link
          to="/scans/new"
          className="hidden rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-surface-950 transition hover:bg-cyan-400 sm:inline-flex"
        >
          New Scan
        </Link>
      </div>
    </header>
  )
}
