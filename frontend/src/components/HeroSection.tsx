import { cn } from '@/utils/cn'

interface HeroSectionProps {
  backendConnected?: boolean
  className?: string
}

export function HeroSection({ backendConnected, className }: HeroSectionProps) {
  return (
    <section
      className={cn(
        'glass-panel relative overflow-hidden rounded-2xl p-8 sm:p-10 lg:p-12',
        className,
      )}
    >
      {/* Subtle grid pattern */}
      <div
        className="hero-grid-bg pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
      />

      {/* Floating ambient blurs */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-cyan-500/10 blur-3xl"
        style={{ animation: 'float-subtle 12s ease-in-out infinite' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-48 rounded-full bg-indigo-500/10 blur-3xl"
        style={{ animation: 'float-subtle 15s ease-in-out infinite 3s' }}
        aria-hidden
      />

      <div className="relative z-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90 sm:text-sm">
          Defensive Security Platform
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
          Website Security{' '}
          <span className="text-gradient">Posture Analysis</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Analyze HTTP security headers, TLS configuration, and exposed ports.
          Generate professional reports — authorized targets only, no exploitation.
        </p>
        {backendConnected && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Backend connected
          </div>
        )}
      </div>
    </section>
  )
}
