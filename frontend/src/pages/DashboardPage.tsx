import { Link } from 'react-router-dom'
import { HeroSection } from '@/components/HeroSection'
import { RecentScansWidget } from '@/components/RecentScansWidget'
import { ScanForm } from '@/components/ScanForm'
import { useHealth } from '@/hooks/useHealth'

const MODULES = [
  {
    name: 'HTTP Headers',
    description: 'HSTS, CSP, X-Frame-Options, cookie flags, and server disclosure checks.',
    icon: '🛡️',
  },
  {
    name: 'SSL/TLS',
    description: 'Certificate validity, chain trust, hostname match, and cipher analysis.',
    icon: '🔒',
  },
  {
    name: 'Port Scan',
    description: 'TCP connect probes on common ports with risky service detection.',
    icon: '🔌',
  },
  {
    name: 'Technology',
    description: 'Passive fingerprinting of web servers, frameworks, CMS, CDNs, and libraries.',
    icon: '🔍',
  },
  {
    name: 'PDF Reports',
    description: 'Professional reports with severity summaries and module findings.',
    icon: '📄',
  },
]

export function DashboardPage() {
  const { data: health } = useHealth()

  return (
    <main className="mx-auto max-w-6xl space-y-8 lg:space-y-10">
      <HeroSection backendConnected={health?.status === 'ok'} />

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <ScanForm className="lg:order-2" />

        <aside className="space-y-6 lg:order-1">
          <ul className="grid gap-4 sm:grid-cols-2">
            {MODULES.map((mod) => (
              <li
                key={mod.name}
                className="glass-card group rounded-xl p-5 transition duration-300 hover:border-cyan-500/20 hover:shadow-[0_0_24px_-8px_rgba(34,211,238,0.25)]"
              >
                <span className="text-2xl" role="img" aria-hidden>
                  {mod.icon}
                </span>
                <h3 className="mt-3 font-semibold text-slate-100">{mod.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{mod.description}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {/* Recent Scans Widget */}
      <section>
        <RecentScansWidget />
      </section>
    </main>
  )
}
