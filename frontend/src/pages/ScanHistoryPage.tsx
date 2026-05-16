import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/scan-history/EmptyState'
import { HistoryCard, type HistoryEntry } from '@/components/scan-history/HistoryCard'
import { HistoryTable } from '@/components/scan-history/HistoryTable'
import { Button } from '@/components/ui/Button'
import { useScan } from '@/hooks/useScans'
import { getRecentScans, type RecentScanEntry } from '@/utils/recentScans'
import { cn } from '@/utils/cn'
import {
  calculateRiskScore,
  riskScoreLabel,
  riskScoreTone,
} from '@/utils/scanResults'
import type { ScanDetailResponse, ScanStatus } from '@/types/scan'

/* ------------------------------------------------------------------ */
/* Per-entry data fetcher (enriches localStorage stub with live data)  */
/* ------------------------------------------------------------------ */

function useEnrichedEntry(recent: RecentScanEntry): HistoryEntry {
  const { data } = useScan(recent.scanId)

  return useMemo(() => {
    if (!data) {
      return {
        scanId: recent.scanId,
        targetUrl: recent.targetUrl,
        createdAt: recent.createdAt,
        status: 'PENDING' as ScanStatus,
        riskLabel: null,
        riskTone: null,
      }
    }

    return enrichEntry(data)
  }, [data, recent])
}

function enrichEntry(scan: ScanDetailResponse): HistoryEntry {
  let riskLabel: string | null = null
  let riskTone: HistoryEntry['riskTone'] = null

  if (scan.result?.summary) {
    const score = calculateRiskScore(scan.result.summary)
    riskLabel = riskScoreLabel(score)
    riskTone = riskScoreTone(score)
  }

  return {
    scanId: scan.scan_id,
    targetUrl: scan.target_url,
    createdAt: scan.created_at,
    status: scan.status,
    riskLabel,
    riskTone,
  }
}

/* ------------------------------------------------------------------ */
/* Wrapper to render each enriched row                                 */
/* ------------------------------------------------------------------ */

function EnrichedTableRow({ recent, onEntry }: { recent: RecentScanEntry; onEntry: (e: HistoryEntry) => void }) {
  const entry = useEnrichedEntry(recent)
  // Push entry up so parent can collect them for the table
  useMemo(() => onEntry(entry), [entry, onEntry])
  return null
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 8

export function ScanHistoryPage() {
  const recentScans = getRecentScans()
  const [page, setPage] = useState(0)

  // Collect enriched entries
  const [entriesMap, setEntriesMap] = useState<Map<string, HistoryEntry>>(new Map())

  const handleEntry = useMemo(
    () => (entry: HistoryEntry) => {
      setEntriesMap((prev) => {
        const existing = prev.get(entry.scanId)
        // Avoid re-render if data hasn't changed
        if (
          existing &&
          existing.status === entry.status &&
          existing.riskLabel === entry.riskLabel
        ) {
          return prev
        }
        const next = new Map(prev)
        next.set(entry.scanId, entry)
        return next
      })
    },
    [],
  )

  // Order entries matching the localStorage order
  const orderedEntries = useMemo(() => {
    return recentScans
      .map((r) => entriesMap.get(r.scanId))
      .filter(Boolean) as HistoryEntry[]
  }, [recentScans, entriesMap])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orderedEntries.length / ITEMS_PER_PAGE))
  const paginatedEntries = orderedEntries.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  )

  const isEmpty = recentScans.length === 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      {/* Render hooks to enrich each entry */}
      {recentScans.map((r) => (
        <EnrichedTableRow key={r.scanId} recent={r} onEntry={handleEntry} />
      ))}

      {/* Page header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-500/80">
            History
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Scan History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEmpty
              ? 'No scans recorded yet'
              : `${orderedEntries.length} scan${orderedEntries.length !== 1 ? 's' : ''} on file`}
          </p>
        </div>
        <Link to="/scans/new">
          <Button>
            <PlusIcon className="size-4" />
            New Scan
          </Button>
        </Link>
      </header>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {/* Loading skeleton while entries are still enriching */}
          {orderedEntries.length === 0 && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-surface-800/60 border border-slate-800/40"
                />
              ))}
            </div>
          )}

          {/* Desktop table (hidden on mobile) */}
          {orderedEntries.length > 0 && (
            <div className="hidden md:block">
              <HistoryTable entries={paginatedEntries} />
            </div>
          )}

          {/* Mobile cards (hidden on desktop) */}
          {orderedEntries.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 md:hidden">
              {paginatedEntries.map((entry, idx) => (
                <HistoryCard
                  key={entry.scanId}
                  entry={entry}
                  className="finding-card-enter"
                  style={{ animationDelay: `${idx * 80}ms` }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-2 pt-2"
              aria-label="Scan history pagination"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className={cn(
                  'rounded-lg border border-slate-700/50 bg-surface-800/60 px-3 py-1.5 text-xs font-medium text-slate-300',
                  'transition hover:bg-surface-700/60 hover:text-white',
                  'disabled:opacity-40 disabled:pointer-events-none',
                )}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={cn(
                    'size-8 rounded-lg text-xs font-semibold transition',
                    i === page
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:bg-surface-800 hover:text-slate-200',
                  )}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={cn(
                  'rounded-lg border border-slate-700/50 bg-surface-800/60 px-3 py-1.5 text-xs font-medium text-slate-300',
                  'transition hover:bg-surface-700/60 hover:text-white',
                  'disabled:opacity-40 disabled:pointer-events-none',
                )}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

/* ------------------------------------------------------------------ */
/* Inline SVG icons                                                    */
/* ------------------------------------------------------------------ */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
