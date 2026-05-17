import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DownloadReportButton } from '@/components/DownloadReportButton'
import { FindingsSection } from '@/components/scan-results/FindingsSection'
import { RiskScoreCard } from '@/components/scan-results/RiskScoreCard'
import { ScanProgress } from '@/components/scan-results/ScanProgress'
import { ScanResultsSkeleton } from '@/components/scan-results/ScanResultsSkeleton'
import { ScanTimeline } from '@/components/scan-results/ScanTimeline'
import { StatusIndicator } from '@/components/scan-results/StatusIndicator'
import { SubdomainSection } from '@/components/scan-results/SubdomainSection'
import { SeveritySummary } from '@/components/SeveritySummary'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useScan } from '@/hooks/useScans'
import type { ModuleResult } from '@/types/scan'
import { getErrorMessage } from '@/types/api'
import { formatDateTime, truncateId } from '@/utils/format'
import { isActiveScan, MODULE_ORDER } from '@/utils/scanResults'
import { cn } from '@/utils/cn'

export function ScanDetailPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const { data: scan, isLoading, isFetching, isError, error } = useScan(scanId)

  if (isLoading) {
    return <ScanResultsSkeleton />
  }

  if (isError || !scan) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in text-center">
        <Card>
          <CardContent className="py-10">
            <p className="text-red-400">{getErrorMessage(error, 'Scan not found')}</p>
            <Link to="/" className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">
              ← Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const active = isActiveScan(scan.status)
  const summary = scan.result?.summary ?? null
  const scannedAt = scan.result?.scanned_at ?? null
  const modules = scan.result?.modules ?? {}

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-500/80">
            Scan results
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Security assessment
          </h1>
        </div>
        {isFetching && active && (
          <span className="inline-flex items-center gap-2 text-xs text-cyan-400/90">
            <span className="size-3 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
            Syncing…
          </span>
        )}
      </header>

      <Card glow className="overflow-hidden">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Target domain
              </p>
              <p className="mt-1 break-all text-xl font-semibold text-slate-50 sm:text-2xl">
                {scan.target_url}
              </p>
              <p className="mt-2 font-mono text-xs text-slate-500">
                ID {truncateId(scan.scan_id, 10)}
              </p>
            </div>
            <StatusIndicator status={scan.status} />
          </div>

          <div className="grid gap-4 border-y border-slate-800/60 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetaItem label="Created" value={formatDateTime(scan.created_at)} />
            <MetaItem
              label="Last updated"
              value={formatDateTime(scan.updated_at)}
            />
            <MetaItem
              label="Scanned at"
              value={scannedAt ? formatDateTime(scannedAt) : active ? 'In progress…' : '—'}
            />
            <MetaItem label="Status" value={scan.status} mono />
          </div>

          <ScanProgress status={scan.status} />

          {/* Scan lifecycle timeline */}
          <div className="border-t border-slate-800/60 pt-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-slate-500">
              Scan lifecycle
            </p>
            <ScanTimeline
              status={scan.status}
              createdAt={scan.created_at}
              updatedAt={scan.updated_at}
              scannedAt={scannedAt}
            />
          </div>

          {scan.status === 'FAILED' && scan.error_message && (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              role="alert"
            >
              {scan.error_message}
            </div>
          )}

          <div className="flex flex-wrap items-start gap-3 pt-1">
            <DownloadReportButton scanId={scan.scan_id} status={scan.status} />
            <Link to="/scans/new">
              <Button variant="secondary">New Scan</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          'grid gap-4 transition-opacity duration-500 lg:grid-cols-[minmax(0,280px)_1fr]',
          !summary && 'opacity-90',
        )}
      >
        <RiskScoreCard summary={summary} loading={!summary && active} />
        <Card className="glass-panel">
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Severity summary</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Findings aggregated across all modules
              </p>
            </div>
            {summary ? (
              <SeveritySummary summary={summary} compact />
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="relative h-16 overflow-hidden rounded-lg bg-slate-800/70"
                  >
                    <div className="skeleton-shimmer absolute inset-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SubdomainSection
        module={modules.subdomain as ModuleResult | undefined}
        className="findings-section-enter"
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Module findings</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Headers, SSL/TLS, port, and technology analysis grouped by scanner module
            </p>
          </div>
        </div>

        {MODULE_ORDER.map((key, index) => (
          <FindingsSection
            key={key}
            moduleKey={key}
            module={modules[key] as ModuleResult | undefined}
            defaultExpanded={index === 0}
            className="findings-section-enter"
            style={{ animationDelay: `${index * 80}ms` } satisfies CSSProperties}
          />
        ))}
      </section>

      {!scan.result && !active && scan.status !== 'FAILED' && (
        <p className="text-center text-sm text-slate-500">No results available.</p>
      )}
    </div>
  )
}

function MetaItem({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-sm text-slate-200',
          mono && 'font-mono text-xs uppercase text-slate-400',
        )}
      >
        {value}
      </p>
    </div>
  )
}
