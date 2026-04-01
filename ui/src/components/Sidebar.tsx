import type { Page } from '../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: { id: Page; icon: string; label: string }[] = [
  { id: 'overview', icon: '⬡', label: 'Overview' },
  { id: 'b2b',      icon: '🏗️', label: 'B2B Constructor' },
  { id: 'kuzu',     icon: '🕸️', label: 'Kùzu Graph' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Morphs OS</h1>
        <p>Control Center v0.1</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="badge badge-green">
          <span>●</span> Core Mind Online
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
          localhost:8000
        </p>
      </div>
    </aside>
  )
}
