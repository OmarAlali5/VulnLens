export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface ScanOptions {
  ssl_scan: boolean
  headers_scan: boolean
  port_scan: boolean
  tech_scan: boolean
  subdomain_scan: boolean
  port_list: number[] | null
}

export interface ScanCreateRequest {
  target: string
  options: ScanOptions
}

export interface ScanCreateResponse {
  scan_id: string
  status: ScanStatus
}

export interface FindingSummary {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export interface ModuleFinding {
  code: string
  severity: string
  message: string
  title?: string
  description?: string
  recommendation?: string
}

export interface ModuleResult {
  status: string
  findings: ModuleFinding[]
  [key: string]: unknown
}

export interface ScanResultPayload {
  target: string
  scanned_at: string
  modules: Record<string, ModuleResult>
  summary: FindingSummary
}

export interface ScanDetailResponse {
  scan_id: string
  target_url: string
  status: ScanStatus
  created_at: string
  updated_at: string
  result: ScanResultPayload | null
  error_message: string | null
}

export interface Subdomain {
  hostname: string
  source: string
  status: string
}

export interface HealthResponse {
  status: string
}
