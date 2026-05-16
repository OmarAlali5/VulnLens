import { useState, type CSSProperties } from 'react'
import { cn } from '@/utils/cn'
import { FindingsCard } from '@/components/scan-results/FindingsCard'
import { SeverityBadge } from '@/components/scan-results/SeverityBadge'
import type { ModuleResult } from '@/types/scan'
import {
  MODULE_ICONS,
  MODULE_LABELS,
  normalizeFinding,
  type ModuleKey,
  type NormalizedFinding,
} from '@/utils/scanResults'

interface FindingsSectionProps {
  moduleKey: ModuleKey
  module: ModuleResult | undefined
  className?: string
  style?: CSSProperties
  defaultExpanded?: boolean
}

function highestSeverity(findings: NormalizedFinding[]): string | null {
  const order = ['critical', 'high', 'medium', 'low', 'info']
  for (const level of order) {
    if (findings.some((f) => f.severity === level)) return level
  }
  return null
}

export function FindingsSection({
  moduleKey,
  module,
  className,
  style,
  defaultExpanded = true,
}: FindingsSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultExpanded)
  const findings = (module?.findings ?? []).map((f, i) => normalizeFinding(f, i))
  const label = MODULE_LABELS[moduleKey]
  const icon = MODULE_ICONS[moduleKey]
  const moduleStatus = module?.status ?? 'pending'
  const topSeverity = highestSeverity(findings)

  return (
    <section
      className={cn(
        'findings-section-enter rounded-xl border border-slate-800/70 bg-surface-850/60 glass-card overflow-hidden',
        className,
      )}
      style={style}
    >
      <header className="border-b border-slate-800/60">
        <button
          type="button"
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-900/30 sm:px-6"
          onClick={() => setSectionOpen((v) => !v)}
          aria-expanded={sectionOpen}
        >
          <span className="text-2xl" role="img" aria-hidden>
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">{label}</h3>
              {topSeverity && <SeverityBadge severity={topSeverity} size="md" />}
            </span>
            <p className="mt-0.5 text-sm text-slate-500">
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
              <span className="mx-2 text-slate-700">·</span>
              Module status:{' '}
              <span className="text-slate-400">{String(moduleStatus)}</span>
            </p>
          </span>
          <span
            className={cn(
              'shrink-0 text-slate-500 transition-transform duration-300',
              sectionOpen && 'rotate-180',
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
          sectionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 p-4 sm:p-5">
            {!module ? (
              <p className="rounded-lg border border-dashed border-slate-700/50 px-4 py-8 text-center text-sm text-slate-500">
                Module not included in this scan.
              </p>
            ) : findings.length === 0 ? (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-8 text-center text-sm text-emerald-300/90">
                No issues detected in this module.
              </p>
            ) : (
              findings.map((finding, idx) => (
                <FindingsCard
                  key={finding.id}
                  finding={finding}
                  defaultExpanded={idx === 0 && findings.length === 1}
                  animationDelay={idx * 40}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
