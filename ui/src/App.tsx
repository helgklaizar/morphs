import { useState } from 'react'
import Sidebar from './components/Sidebar'
import B2BConstructor from './pages/B2BConstructor'
import KuzuDashboard from './pages/KuzuDashboard'
import Overview from './pages/Overview'

export type Page = 'overview' | 'b2b' | 'kuzu'

export default function App() {
  const [page, setPage] = useState<Page>('overview')

  return (
    <div className="app-layout">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main className="main-content animate-in">
        {page === 'overview' && <Overview onNavigate={setPage} />}
        {page === 'b2b'      && <B2BConstructor />}
        {page === 'kuzu'     && <KuzuDashboard />}
      </main>
    </div>
  )
}
