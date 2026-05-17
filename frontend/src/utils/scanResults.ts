import type { FindingSummary, ModuleFinding, ScanStatus } from '@/types/scan'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface NormalizedFinding {
  id: string
  code: string
  severity: SeverityLevel
  title: string
  description: string
  recommendation: string
}

export const MODULE_ORDER = ['headers', 'ssl', 'ports', 'technology', 'subdomain'] as const

export type ModuleKey = (typeof MODULE_ORDER)[number]

export const MODULE_LABELS: Record<ModuleKey, string> = {
  headers: 'HTTP Headers',
  ssl: 'SSL/TLS',
  ports: 'Ports',
  technology: 'Technology',
  subdomain: 'Subdomain Enumeration',
}

export const MODULE_ICONS: Record<ModuleKey, string> = {
  headers: '🛡️',
  ssl: '🔒',
  ports: '🔌',
  technology: '🔍',
  subdomain: '🌐',
}

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
}

const RECOMMENDATIONS: Record<string, string> = {
  MISSING_HSTS:
    'Enable Strict-Transport-Security with a long max-age, includeSubDomains, and consider preload after testing.',
  HSTS_DISABLED: 'Remove max-age=0 and configure HSTS with a meaningful max-age value.',
  MISSING_CSP:
    'Deploy a Content-Security-Policy that restricts script, style, and resource origins to trusted domains.',
  MISSING_X_FRAME_OPTIONS:
    'Set X-Frame-Options to DENY or SAMEORIGIN, or use frame-ancestors in CSP to prevent clickjacking.',
  WEAK_X_FRAME_OPTIONS: 'Use DENY or SAMEORIGIN instead of allowing all frames.',
  MISSING_X_CONTENT_TYPE_OPTIONS: 'Add X-Content-Type-Options: nosniff to reduce MIME-sniffing attacks.',
  MISSING_REFERRER_POLICY: 'Set Referrer-Policy to strict-origin-when-cross-origin or stricter.',
  MISSING_PERMISSIONS_POLICY:
    'Add Permissions-Policy to disable unused browser features (camera, geolocation, etc.).',
  SERVER_HEADER_DISCLOSURE: 'Remove or genericize the Server header to reduce fingerprinting.',
  INSECURE_COOKIE:
    'Set Secure, HttpOnly, and SameSite attributes on session cookies; use SameSite=Lax or Strict where possible.',
  CERT_EXPIRED: 'Renew the TLS certificate before expiry and automate renewal (e.g. ACME).',
  CERT_EXPIRING_SOON: 'Renew the certificate soon and monitor expiry with automated alerts.',
  CERT_HOSTNAME_MISMATCH: 'Reissue the certificate with correct Subject Alternative Names for your hostnames.',
  CERT_CHAIN_INVALID: 'Install the full certificate chain including intermediate CAs.',
  TLS_VERSION_WEAK: 'Disable TLS 1.0/1.1 and require TLS 1.2 or higher.',
  WEAK_CIPHER: 'Disable weak cipher suites and prefer modern AEAD ciphers.',
  FTP_OPEN: 'Close FTP if unused, or restrict access with firewall rules and strong authentication.',
  TELNET_OPEN: 'Disable Telnet; use SSH instead for remote administration.',
  SMB_OPEN: 'Restrict SMB to trusted networks and keep systems patched.',
  RDP_OPEN: 'Expose RDP only via VPN or bastion; enforce MFA and network-level access controls.',
  REDIS_OPEN: 'Bind Redis to localhost or protect with authentication and firewall rules.',
  MYSQL_OPEN: 'Do not expose MySQL publicly; use private networking and strong credentials.',
  POSTGRES_OPEN: 'Restrict PostgreSQL to private networks and enforce authentication.',
  MANY_OPEN_PORTS:
    'Review exposed services, close unused ports, and place public services behind a reverse proxy.',
  TECHNOLOGY_DISCLOSURE:
    'Remove or genericize version information from HTTP response headers to reduce fingerprinting.',
  CMS_DETECTED:
    'Keep the CMS and all plugins updated; remove default install pages and unnecessary metadata.',
  LARGE_TECH_STACK:
    'Review dependencies for unused technologies; a smaller stack reduces attack surface.',
}

const SEVERITY_FALLBACK: Record<SeverityLevel, string> = {
  critical: 'Treat as an immediate priority: remediate before production exposure.',
  high: 'Address this issue promptly in your next security hardening cycle.',
  medium: 'Plan remediation and verify the fix does not break required functionality.',
  low: 'Apply this improvement when convenient as part of defense-in-depth.',
  info: 'Review for informational hardening opportunities.',
}

export function normalizeSeverity(value: string | undefined): SeverityLevel {
  const key = (value ?? 'info').toLowerCase()
  if (key in SEVERITY_WEIGHTS) return key as SeverityLevel
  return 'info'
}

export function formatFindingTitle(code: string): string {
  return code
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function getRecommendation(code: string, severity: SeverityLevel): string {
  return RECOMMENDATIONS[code] ?? SEVERITY_FALLBACK[severity]
}

export function normalizeFinding(finding: ModuleFinding, index: number): NormalizedFinding {
  const severity = normalizeSeverity(finding.severity)
  return {
    id: `${finding.code}-${index}`,
    code: finding.code,
    severity,
    title: finding.title ?? formatFindingTitle(finding.code),
    description: finding.description ?? finding.message,
    recommendation: finding.recommendation ?? getRecommendation(finding.code, severity),
  }
}

export function calculateRiskScore(summary: FindingSummary): number {
  const raw =
    summary.critical * SEVERITY_WEIGHTS.critical +
    summary.high * SEVERITY_WEIGHTS.high +
    summary.medium * SEVERITY_WEIGHTS.medium +
    summary.low * SEVERITY_WEIGHTS.low +
    summary.info * SEVERITY_WEIGHTS.info

  return Math.min(100, Math.round(raw))
}

export function riskScoreLabel(score: number): string {
  if (score >= 75) return 'Critical Risk'
  if (score >= 50) return 'High Risk'
  if (score >= 25) return 'Moderate Risk'
  if (score > 0) return 'Low Risk'
  return 'Minimal Risk'
}

export function riskScoreTone(score: number): 'critical' | 'high' | 'medium' | 'low' | 'safe' {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  if (score > 0) return 'low'
  return 'safe'
}

export function getProgressForStatus(status: ScanStatus): number {
  switch (status) {
    case 'PENDING':
      return 12
    case 'RUNNING':
      return 58
    case 'COMPLETED':
      return 100
    case 'FAILED':
      return 0
    default:
      return 0
  }
}

export function isActiveScan(status: ScanStatus): boolean {
  return status === 'PENDING' || status === 'RUNNING'
}
