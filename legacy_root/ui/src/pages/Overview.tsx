import type { Page } from '../App'
import { useEffect, useState } from 'react'

interface OverviewProps {
  onNavigate: (page: Page) => void
}

interface Stats {
  files: number
  classes: number
  functions: number
  edges: number
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [coreOnline, setCoreOnline] = useState(false)

  useEffect(() => {
    // Check Core Mind status
    fetch('/api/v1/kuzu/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setCoreOnline(true) })
      .catch(() => setCoreOnline(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h2>Overview</h2>
        <p>Статус системы и быстрый доступ к инструментам</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-value">{stats?.files ?? '—'}</div>
          <div className="stat-label">Files Indexed</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-value">{stats?.classes ?? '—'}</div>
          <div className="stat-label">Classes</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{stats?.functions ?? '—'}</div>
          <div className="stat-label">Functions</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-value">{stats?.edges ?? '—'}</div>
          <div className="stat-label">Graph Edges</div>
        </div>
      </div>

      {/* Status */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontWeight: 600 }}>Core Mind Status</h3>
          <span className={`badge ${coreOnline ? 'badge-green' : 'badge-red'}`}>
            {coreOnline ? '● Online' : '● Offline'}
          </span>
        </div>

        <div className="grid-2">
          <div>
            <p className="text-sm text-secondary">API Endpoint</p>
            <p className="font-mono text-sm" style={{ marginTop: '4px' }}>http://localhost:8000</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Kùzu Graph DB</p>
            <p className="font-mono text-sm" style={{ marginTop: '4px' }}>
              {stats ? '.kuzu_graph/' : 'Not indexed'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: '20px' }}>Быстрые действия</h3>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('b2b')}>
            🏗️ B2B Constructor
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('kuzu')}>
            🕸️ Graph Dashboard
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fetch('/api/v1/kuzu/rebuild', { method: 'POST' })}
          >
            🔄 Rebuild Index
          </button>
        </div>
      </div>
    </div>
  )
}
