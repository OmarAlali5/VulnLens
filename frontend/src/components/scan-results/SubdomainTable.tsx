import { cn } from '@/utils/cn'
import type { Subdomain } from '@/types/scan'

interface SubdomainTableProps {
  subdomains: Subdomain[]
  className?: string
}

const STATUS_STYLES: Record<string, string> = {
  discovered: 'text-emerald-300',
}

const SOURCE_STYLES: Record<string, string> = {
  'crt.sh': 'text-cyan-300',
}

const ENV_COLORS: Record<string, string> = {
  api: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  dev: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  staging: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  admin: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  cdn: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  mail: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  blog: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  app: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  www: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
}

function extractEnvLabel(hostname: string): string | null {
  const first = hostname.split('.')[0]
  if (!first || first === hostname) return null
  if (first in ENV_COLORS) return first
  return null
}

export function SubdomainTable({ subdomains, className }: SubdomainTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-slate-800/60 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            <th scope="col" className="pb-3 pr-4">Hostname</th>
            <th scope="col" className="pb-3 pr-4">Source</th>
            <th scope="col" className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {subdomains.map((sd, idx) => (
            <tr
              key={`${sd.hostname}-${idx}`}
              className={cn(
                'group border-b border-slate-800/40 transition-colors duration-200',
                'hover:bg-slate-800/30 last:border-b-0',
              )}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-slate-200 transition-colors duration-200 group-hover:text-cyan-300">
                    {sd.hostname}
                  </span>
                  {(() => {
                    const env = extractEnvLabel(sd.hostname)
                    if (!env) return null
                    const style = ENV_COLORS[env] ?? 'bg-slate-500/15 text-slate-400 border-slate-600/30'
                    return (
                      <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', style)}>
                        {env}
                      </span>
                    )
                  })()}
                </div>
              </td>
              <td className="py-3 pr-4">
                <span className={cn('font-mono text-xs font-medium', SOURCE_STYLES[sd.source] ?? 'text-slate-400')}>
                  {sd.source}
                </span>
              </td>
              <td className="py-3">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', STATUS_STYLES[sd.status] ?? 'text-slate-400')}>
                  <span className={cn(
                    'size-1.5 rounded-full',
                    sd.status === 'discovered' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-500',
                  )} aria-hidden />
                  {sd.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
