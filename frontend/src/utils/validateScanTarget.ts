import type { ScanOptions } from '@/types/scan'

export interface ScanTargetValidation {
  valid: boolean
  error?: string
}

export function validateScanTarget(
  target: string,
  options: Pick<ScanOptions, 'ssl_scan' | 'headers_scan' | 'port_scan' | 'subdomain_scan'>,
): ScanTargetValidation {
  const trimmed = target.trim()

  if (!trimmed) {
    return { valid: false, error: 'Target URL is required' }
  }

  try {
    // Native browser URL parsing is the safest way to validate formatting
    const parsed = new URL(trimmed)
    
    // We only support standard web protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http:// or https://' }
    }
    
    // Ensure they didn't just type "http://" with no actual domain
    if (!parsed.hostname) {
      return { valid: false, error: 'Enter a valid URL (e.g. https://example.com)' }
    }
  } catch {
    return { valid: false, error: 'Enter a valid URL (e.g. https://example.com)' }
  }

  // Prevent users from submitting a scan with literally zero checks enabled
  if (!options.ssl_scan && !options.headers_scan && !options.port_scan && !options.subdomain_scan) {
    return { valid: false, error: 'Enable at least one scan module' }
  }

  return { valid: true }
}
