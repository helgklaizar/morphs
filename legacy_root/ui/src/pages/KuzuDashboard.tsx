import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: 'file' | 'class' | 'function'
  group: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: string
}

interface GraphData { nodes: GraphNode[]; links: GraphLink[] }

interface Stats { files: number; classes: number; functions: number; edges: number }

interface SearchResult { type: string; name: string; file: string; lang?: string }

// Colors per node type
const NODE_COLORS: Record<string, string> = {
  file:     '#8b5cf6',
  class:    '#2dd4bf',
  function: '#f59e0b',
}
const NODE_RADIUS: Record<string, number> = {
  file: 10, class: 8, function: 6,
}

// ── D3 Graph ─────────────────────────────────────────────────
function GraphCanvas({ data }: { data: GraphData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = svgRef.current.getBoundingClientRect()

    // Zoom container
    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', e => g.attr('transform', e.transform.toString()))
    )

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(255,255,255,0.2)')

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links)
        .id(d => d.id).distance(80).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>(d => NODE_RADIUS[d.type] + 6))

    // Links
    const link = g.append('g').selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1.2)
      .attr('marker-end', 'url(#arrow)')

    // Nodes
    const node = g.append('g').selectAll<SVGCircleElement, GraphNode>('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', d => NODE_RADIUS[d.type])
      .attr('fill', d => NODE_COLORS[d.type] || '#666')
      .attr('stroke', d => NODE_COLORS[d.type] || '#666')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .attr('r', NODE_RADIUS[d.type] + 4)
          .attr('stroke-opacity', 1)
        setTooltip({ x: event.clientX + 12, y: event.clientY - 8, text: `[${d.type}] ${d.label}` })
      })
      .on('mousemove', event => {
        setTooltip(t => t ? { ...t, x: event.clientX + 12, y: event.clientY - 8 } : null)
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .attr('r', NODE_RADIUS[d.type])
          .attr('stroke-opacity', 0.4)
        setTooltip(null)
      })
      .call(
        d3.drag<SVGCircleElement, GraphNode>()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Labels — only for files and classes
    const label = g.append('g').selectAll('text')
      .data(data.nodes.filter(d => d.type !== 'function'))
      .join('text')
      .attr('fill', 'rgba(255,255,255,0.6)')
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('dy', -12)
      .attr('text-anchor', 'middle')
      .text(d => d.label.length > 20 ? d.label.slice(0, 18) + '…' : d.label)
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)
      node.attr('cx', d => d.x!).attr('cy', d => d.y!)
      label.attr('x', d => d.x!).attr('y', d => d.y!)
    })

    return () => { simulation.stop() }
  }, [data])

  return (
    <div className="graph-container">
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      {tooltip && (
        <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function KuzuDashboard() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchGraph = async () => {
    setLoading(true)
    setError(null)
    try {
      const [gRes, sRes] = await Promise.all([
        fetch('/api/v1/kuzu/graph'),
        fetch('/api/v1/kuzu/stats'),
      ])
      setGraphData(await gRes.json())
      setStats(await sRes.json())
    } catch {
      setError('Не удалось подключиться к Core Mind. Убедитесь, что сервер запущен.')
    } finally {
      setLoading(false)
    }
  }

  const rebuild = async () => {
    setRebuilding(true)
    await fetch('/api/v1/kuzu/rebuild', { method: 'POST' })
    await fetchGraph()
    setRebuilding(false)
  }

  const search = async () => {
    if (!searchQ.trim()) return
    const res = await fetch(`/api/v1/kuzu/search?q=${encodeURIComponent(searchQ)}`)
    const data = await res.json()
    setSearchResults(data.results || [])
  }

  const exportCSV = () => { window.open('/api/v1/kuzu/export/csv', '_blank') }
  const exportJSON = () => { window.open('/api/v1/kuzu/export/json', '_blank') }

  useEffect(() => { fetchGraph() }, [])

  const TYPE_BADGE: Record<string, string> = {
    file: 'badge-accent', class: 'badge-teal', function: 'badge-yellow'
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Kùzu Graph Dashboard</h2>
            <p>Визуализация графа знаний AST + зависимостей проекта</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>↓ CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={exportJSON}>↓ JSON</button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={rebuild}
              disabled={rebuilding}
            >
              {rebuilding ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🔄'} Rebuild
            </button>
            <button className="btn btn-primary btn-sm" onClick={fetchGraph} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↻'} Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card mb-6" style={{ borderColor: 'var(--red)', background: 'var(--red-dim)', marginBottom: '24px' }}>
          <p className="text-sm" style={{ color: 'var(--red)' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card accent">
            <div className="stat-value">{stats.files}</div>
            <div className="stat-label">Files</div>
          </div>
          <div className="stat-card teal">
            <div className="stat-value">{stats.classes}</div>
            <div className="stat-label">Classes</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-value">{stats.functions}</div>
            <div className="stat-label">Functions</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{stats.edges}</div>
            <div className="stat-label">Edges</div>
          </div>
        </div>
      )}

      {/* Graph */}
      <div className="card mb-6" style={{ marginBottom: '24px' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontWeight: 600 }}>Force Graph</h3>
          <div className="flex gap-3">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span className="text-sm text-secondary">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {loading
          ? <div className="graph-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          : graphData.nodes.length > 0
            ? <GraphCanvas data={graphData} />
            : <div className="graph-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <p className="text-secondary">Граф пуст. Запустите Rebuild для индексации проекта.</p>
                <button className="btn btn-primary" onClick={rebuild}>🔄 Rebuild Index</button>
              </div>
        }
        <p className="text-muted text-sm" style={{ marginTop: '12px' }}>
          Перетаскивайте узлы · Скролл для зума · Наведите для деталей
        </p>
      </div>

      {/* Search */}
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Поиск по графу</h3>
        <div className="flex gap-2 mb-4">
          <input
            className="form-input"
            placeholder="Найти класс, функцию или файл..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={search}>Найти</button>
        </div>

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {searchResults.map((r, i) => (
              <div key={i} className="card-glass" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${TYPE_BADGE[r.type] ?? 'badge-accent'}`}>{r.type}</span>
                <span className="font-mono text-sm">{r.name}</span>
                <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>{r.file}</span>
              </div>
            ))}
          </div>
        )}

        {searchQ && searchResults.length === 0 && (
          <p className="text-muted text-sm">Ничего не найдено по запросу «{searchQ}»</p>
        )}
      </div>
    </div>
  )
}
