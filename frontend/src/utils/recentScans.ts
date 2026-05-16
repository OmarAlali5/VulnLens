const STORAGE_KEY = 'vulnlens_recent_scans'
const MAX_RECENT = 10

export interface RecentScanEntry {
  scanId: string
  targetUrl: string
  createdAt: string
}

export function getRecentScans(): RecentScanEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentScanEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRecentScan(entry: RecentScanEntry): void {
  const existing = getRecentScans().filter((s) => s.scanId !== entry.scanId)
  const updated = [entry, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
