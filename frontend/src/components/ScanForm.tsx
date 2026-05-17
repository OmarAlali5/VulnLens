import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingButton } from '@/components/LoadingButton'
import { ToggleSwitch } from '@/components/ToggleSwitch'
import { Input } from '@/components/ui/Input'
import { useCreateScan } from '@/hooks/useScans'
import { getErrorMessage } from '@/types/api'
import type { ScanOptions } from '@/types/scan'
import { validateScanTarget } from '@/utils/validateScanTarget'
import { cn } from '@/utils/cn'

const DEFAULT_OPTIONS: Pick<ScanOptions, 'ssl_scan' | 'headers_scan' | 'port_scan' | 'tech_scan' | 'subdomain_scan'> = {
  ssl_scan: true,
  headers_scan: true,
  port_scan: true,
  tech_scan: true,
  subdomain_scan: true,
}

const SCAN_MODULES = [
  {
    id: 'headers_scan' as const,
    label: 'Headers Scan',
    description: 'HSTS, CSP, cookies, framing protection, and disclosure checks.',
  },
  {
    id: 'ssl_scan' as const,
    label: 'SSL Scan',
    description: 'Certificate expiry, chain trust, hostname match, and cipher strength.',
  },
  {
    id: 'port_scan' as const,
    label: 'Port Scan',
    description: 'TCP connect probes on a curated port list.',
  },
  {
    id: 'tech_scan' as const,
    label: 'Technology Fingerprinting',
    description: 'Passive detection of web servers, frameworks, CMS, CDNs, and libraries.',
  },
  {
    id: 'subdomain_scan' as const,
    label: 'Subdomain Enumeration',
    description: 'Passive discovery using multiple OSINT sources via Subfinder.',
  },
]

interface ScanFormProps {
  className?: string
}

export function ScanForm({ className }: ScanFormProps) {
  const navigate = useNavigate()
  const createScan = useCreateScan()

  const [target, setTarget] = useState('https://')
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const updateOption = (key: keyof ScanOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
    setFieldError(null)
    setApiError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setApiError(null)

    const validation = validateScanTarget(target, options)
    if (!validation.valid) {
      setFieldError(validation.error ?? 'Invalid input')
      return
    }

    const payload = {
      target: target.trim(),
      options: {
        ...options,
        port_list: null,
      },
    }

    try {
      const result = await createScan.mutateAsync(payload)
      navigate(`/scans/${result.scan_id}`)
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to create scan'))
    }
  }

  const displayError = fieldError ?? apiError

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('glass-panel rounded-2xl p-6 sm:p-8', className)}
      noValidate
    >
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-100">Launch Scan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only scan systems you own or have explicit permission to test.
        </p>
      </header>

      <section className="space-y-6">
        <Input
          label="Target URL"
          type="url"
          name="target"
          placeholder="https://example.com"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value)
            setFieldError(null)
            setApiError(null)
          }}
          error={fieldError && !apiError ? fieldError : undefined}
          hint="Must be a public URL when private targets are blocked on the server."
          autoComplete="url"
          required
        />

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium text-slate-300">Scan Modules</legend>
          {SCAN_MODULES.map((mod) => (
            <ToggleSwitch
              key={mod.id}
              id={mod.id}
              label={mod.label}
              description={mod.description}
              checked={options[mod.id]}
              onChange={(v) => updateOption(mod.id, v)}
              disabled={createScan.isPending}
            />
          ))}
        </fieldset>

        {displayError && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {displayError}
          </p>
        )}

        <LoadingButton type="submit" loading={createScan.isPending} className="sm:max-w-xs">
          {createScan.isPending ? 'Starting Scan…' : 'Start Security Scan'}
        </LoadingButton>
      </section>
    </form>
  )
}
