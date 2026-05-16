import { cn } from '@/utils/cn'
import { RiskMeter } from '@/components/scan-results/RiskMeter'
import type { FindingSummary } from '@/types/scan'
import { calculateRiskScore, riskScoreLabel, riskScoreTone } from '@/utils/scanResults'

interface RiskScoreCardProps {
  summary: FindingSummary | null
  loading?: boolean
  className?: string
}

const TONE_RING: Record<ReturnType<typeof riskScoreTone>, string> = {
  critical: 'from-red-500/40 via-red-500/10 to-transparent text-red-300',
  high: 'from-orange-500/40 via-orange-500/10 to-transparent text-orange-300',
  medium: 'from-yellow-500/40 via-yellow-500/10 to-transparent text-yellow-300',
  low: 'from-blue-500/40 via-blue-500/10 to-transparent text-blue-300',
  safe: 'from-emerald-500/40 via-emerald-500/10 to-transparent text-emerald-300',
}

export function RiskScoreCard({ summary, loading = false, className }: RiskScoreCardProps) {
  const score = summary ? calculateRiskScore(summary) : null
  const tone = score !== null ? riskScoreTone(score) : 'safe'
  const label = score !== null ? riskScoreLabel(score) : 'Awaiting results'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 p-6 glass-card',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60',
          score !== null ? TONE_RING[tone] : 'from-slate-600/20 to-transparent',
        )}
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Overall risk score</p>
        {loading || score === null ? (
          <div className="mt-4 space-y-2">
            <div className="mx-auto h-24 w-40 animate-pulse rounded-lg bg-slate-800/80" />
            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-slate-800/60" />
          </div>
        ) : (
          <>
            <div className="mt-3">
              <RiskMeter score={score} />
            </div>
            <p className="mt-2 text-center text-sm font-medium text-slate-400">{label}</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Weighted score from severity counts (0 = minimal exposure, 100 = critical).
            </p>
          </>
        )}
      </div>
    </div>
  )
}
