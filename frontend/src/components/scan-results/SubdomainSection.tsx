import { useState } from 'react'
import { cn } from '@/utils/cn'
import { SubdomainTable } from '@/components/scan-results/SubdomainTable'
import { EmptySubdomainState } from '@/components/scan-results/EmptySubdomainState'
import type { Subdomain } from '@/types/scan'
import type { ModuleResult } from '@/types/scan'

interface SubdomainSectionProps {
  module: ModuleResult | undefined
  className?: string
}

export function SubdomainSection({ module, className }: SubdomainSectionProps) {
  const [open, setOpen] = useState(true)
  const subdomains = (module?.subdomains ?? []) as Subdomain[]
  const count = subdomains.length
  const moduleStatus = module?.status

  const isNotIncluded = moduleStatus === undefined
  const isPending = moduleStatus === 'pending'

  return (
    <section
      className={cn(
        'findings-section-enter rounded-xl border border-slate-800/70 bg-surface-850/60 glass-card overflow-hidden',
        className,
      )}
    >
      <header className="border-b border-slate-800/60">
        <button
          type="button"
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-900/30 sm:px-6"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="text-2xl" role="img" aria-hidden>
            🌐
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">Subdomain Enumeration</h3>
              {count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
                  )}
                >
                  {count} found
                </span>
              )}
            </span>
            <p className="mt-0.5 text-sm text-slate-500">
              {isNotIncluded
                ? 'Module not included in this scan'
                : isPending
                  ? 'Loading subdomain data…'
                  : count === 0
                    ? 'No subdomains discovered'
                    : `${count} publicly discoverable subdomain${count !== 1 ? 's' : ''} identified.`}
            </p>
          </span>
          <span
            className={cn(
              'shrink-0 text-slate-500 transition-transform duration-300',
              open && 'rotate-180',
            )}
            aria-hidden
          >
            ▾
          </span>
        </button>
      </header>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 p-4 sm:p-5">
            {isNotIncluded ? (
              <p className="rounded-lg border border-dashed border-slate-700/50 px-4 py-8 text-center text-sm text-slate-500">
                Subdomain enumeration was not selected for this scan.
              </p>
            ) : isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative h-10 overflow-hidden rounded-lg bg-slate-800/70"
                  >
                    <div className="skeleton-shimmer absolute inset-0" />
                  </div>
                ))}
              </div>
            ) : count > 0 ? (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4 text-cyan-500/70"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    <strong className="text-slate-400">{count}</strong> subdomain{count !== 1 ? 's' : ''} discovered — expanding the attack surface beyond the root domain.
                  </span>
                </div>
                <SubdomainTable subdomains={subdomains} />
              </>
            ) : (
              <EmptySubdomainState />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
