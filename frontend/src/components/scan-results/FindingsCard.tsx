import { useId, useState } from 'react'
import { cn } from '@/utils/cn'
import { SeverityBadge } from '@/components/scan-results/SeverityBadge'
import type { NormalizedFinding } from '@/utils/scanResults'

interface FindingsCardProps {
  finding: NormalizedFinding
  defaultExpanded?: boolean
  animationDelay?: number
}

export function FindingsCard({
  finding,
  defaultExpanded = false,
  animationDelay = 0,
}: FindingsCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const panelId = useId()

  return (
    <article
      className={cn(
        'finding-card-enter rounded-xl border border-slate-800/70 bg-slate-900/40 transition-all duration-300',
        'hover:border-slate-700/80 hover:bg-slate-900/60 hover:shadow-[0_0_20px_-8px_rgba(148,163,184,0.08)]',
        expanded && 'border-slate-700/90 bg-slate-900/55',
        `severity-accent-${finding.severity}`,
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <button
        type="button"
        className="flex w-full items-start gap-4 p-4 text-left sm:p-5"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-all duration-300',
            expanded && 'rotate-90 border-cyan-500/30 text-cyan-400',
          )}
          aria-hidden
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-100">{finding.title}</h4>
            <SeverityBadge severity={finding.severity} />
          </span>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
            {finding.code}
          </p>
          {!expanded && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">{finding.description}</p>
          )}
        </span>
      </button>

      <div
        id={panelId}
        className={cn(
          'finding-panel grid transition-[grid-template-rows] duration-300 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-slate-800/60 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Description
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{finding.description}</p>
            </div>
            <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500/80">
                Recommendation
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-cyan-100/80">
                {finding.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
