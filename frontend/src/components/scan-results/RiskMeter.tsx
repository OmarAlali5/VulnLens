import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import { riskScoreTone } from '@/utils/scanResults'

interface RiskMeterProps {
  score: number
  className?: string
}

const RADIUS = 45
const CIRCUMFERENCE = Math.PI * RADIUS // semi-circle ≈ 141.37
const STROKE_WIDTH = 7

const TONE_COLOURS: Record<ReturnType<typeof riskScoreTone>, { stroke: string; glow: string }> = {
  critical: { stroke: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
  high:     { stroke: '#f97316', glow: 'rgba(249,115,22,0.3)' },
  medium:   { stroke: '#eab308', glow: 'rgba(234,179,8,0.25)' },
  low:      { stroke: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
  safe:     { stroke: '#34d399', glow: 'rgba(52,211,153,0.25)' },
}

/**
 * Animated semi-circular SVG arc gauge for displaying risk scores.
 * Animates on mount: the arc draws in and the counter counts up.
 */
export function RiskMeter({ score, className }: RiskMeterProps) {
  const tone = riskScoreTone(score)
  const colours = TONE_COLOURS[tone]

  // Animated counter
  const [displayScore, setDisplayScore] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const duration = 900
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [score])

  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <svg
        viewBox="0 0 100 55"
        className="w-full max-w-[180px]"
        aria-hidden
      >
        {/* Background track */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          className="text-slate-800/60"
        />
        {/* Animated arc */}
        <path
          d="M 5 50 A 45 45 0 0 1 95 50"
          fill="none"
          stroke={colours.stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className="animate-draw-ring"
          style={{
            '--ring-circumference': CIRCUMFERENCE,
            '--ring-offset': offset,
            filter: `drop-shadow(0 0 6px ${colours.glow})`,
          } as React.CSSProperties}
        />
      </svg>

      {/* Score number */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <p
          className="text-3xl font-bold tabular-nums tracking-tight"
          style={{ color: colours.stroke }}
          aria-label={`Risk score: ${score} out of 100`}
        >
          {displayScore}
        </p>
      </div>
    </div>
  )
}
