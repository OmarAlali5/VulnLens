import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'Scan History',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/scans/new',
    label: 'New Scan',
    icon: (
      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
]

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-surface-900/60 backdrop-blur-md lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/60 px-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
          <svg className="size-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-100">VulnLens</p>
          <p className="text-[10px] uppercase tracking-widest text-cyan-500/80">Security Scanner</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20'
                  : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    aria-hidden
                  />
                )}
                {item.icon}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-slate-800/60 p-4">
        <p className="text-xs text-slate-500">
          Defensive posture analysis only. Authorized targets.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/40 bg-surface-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          <span className="size-1.5 rounded-full bg-cyan-500/50" aria-hidden />
          v1.0.0
        </span>
      </div>
    </aside>
  )
}
