import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useCreateScan } from '@/hooks/useScans'
import type { ScanOptions } from '@/types/scan'
import { getErrorMessage } from '@/types/api'

const DEFAULT_OPTIONS: ScanOptions = {
  ssl_scan: true,
  headers_scan: true,
  port_scan: true,
  tech_scan: true,
  subdomain_scan: true,
  port_list: null,
}

interface ModuleToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ModuleToggle({ label, description, checked, onChange }: ModuleToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-lg border border-slate-800/80 bg-surface-900/50 p-4 transition hover:border-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 rounded border-slate-600 bg-surface-800 text-cyan-500 focus:ring-cyan-500/30"
      />
      <div>
        <p className="font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </label>
  )
}

export function NewScanPage() {
  const navigate = useNavigate()
  const createScan = useCreateScan()

  const [target, setTarget] = useState('https://')
  const [options, setOptions] = useState<ScanOptions>(DEFAULT_OPTIONS)
  const [portListInput, setPortListInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateOption = <K extends keyof ScanOptions>(key: K, value: ScanOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Basic sanity check to ensure they didn't just submit spaces
    const trimmed = target.trim()
    if (!trimmed) {
      setValidationError('Target URL is required')
      return
    }

    // Rely on the browser's native URL parser to ensure the format is actually valid
    try {
      new URL(trimmed)
    } catch {
      setValidationError('Enter a valid URL (e.g. https://example.com)')
      return
    }

    let portList: number[] | null = null
    // If they provided a custom port list, we need to parse and validate it
    if (portListInput.trim()) {
      const ports = portListInput
        .split(/[,\s]+/)
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !Number.isNaN(p) && p >= 1 && p <= 65535)

      if (ports.length === 0) {
        setValidationError('Invalid port list. Use comma-separated ports (1–65535).')
        return
      }
      portList = ports
    }

    const payload = {
      target: trimmed,
      options: { ...options, port_list: portList },
    }

    try {
      // Fire off the API request to create the scan job
      const result = await createScan.mutateAsync(payload)
      // Instantly jump to the results page where the spinner will be waiting
      navigate(`/scans/${result.scan_id}`)
    } catch (err) {
      setValidationError(getErrorMessage(err, 'Failed to create scan'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card glow>
        <CardHeader>
          <CardTitle>New Security Scan</CardTitle>
          <CardDescription>
            Submit a target for defensive posture analysis. Only scan systems you own or have permission to test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Target URL"
              type="url"
              placeholder="https://example.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              error={validationError ?? undefined}
              hint="Must be a public URL when private targets are blocked on the server."
              required
            />

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-slate-300">Scan Modules</legend>
              <ModuleToggle
                label="HTTP Security Headers"
                description="HSTS, CSP, cookies, framing protection, and disclosure checks."
                checked={options.headers_scan}
                onChange={(v) => updateOption('headers_scan', v)}
              />
              <ModuleToggle
                label="SSL/TLS Analysis"
                description="Certificate expiry, chain trust, hostname match, and cipher strength."
                checked={options.ssl_scan}
                onChange={(v) => updateOption('ssl_scan', v)}
              />
              <ModuleToggle
                label="Port Scan"
                description="TCP connect probes on a curated port list."
                checked={options.port_scan}
                onChange={(v) => updateOption('port_scan', v)}
              />
              <ModuleToggle
                label="Technology Fingerprinting"
                description="Passive detection of web servers, frameworks, CMS, CDNs, and libraries."
                checked={options.tech_scan}
                onChange={(v) => updateOption('tech_scan', v)}
              />
              <ModuleToggle
                label="Subdomain Enumeration"
                description="Passive discovery using multiple OSINT sources via Subfinder."
                checked={options.subdomain_scan}
                onChange={(v) => updateOption('subdomain_scan', v)}
              />
            </fieldset>

            {options.port_scan && (
              <Input
                label="Custom Port List (optional)"
                placeholder="80, 443, 8080"
                value={portListInput}
                onChange={(e) => setPortListInput(e.target.value)}
                hint="Leave empty to use the server default port list."
              />
            )}

            {validationError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {validationError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={createScan.isPending} className="flex-1 sm:flex-none">
                Start Scan
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
