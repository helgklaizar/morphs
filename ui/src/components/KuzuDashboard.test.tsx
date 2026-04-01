import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import KuzuDashboard from '../pages/KuzuDashboard'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const MOCK_GRAPH = {
  nodes: [
    { id: 'file::core/main.py', label: 'main.py',    type: 'file',     group: 1 },
    { id: 'class::CoreMind',   label: 'CoreMind',    type: 'class',    group: 2 },
    { id: 'func::think',       label: 'think',       type: 'function', group: 3 },
  ],
  links: [
    { source: 'file::core/main.py', target: 'class::CoreMind', type: 'CONTAINS_CLASS' },
    { source: 'file::core/main.py', target: 'func::think',     type: 'CONTAINS_FUNC' },
  ],
}

const MOCK_STATS = { files: 1, classes: 1, functions: 1, edges: 2 }

beforeEach(() => {
  mockFetch.mockReset()
  // Default: graph + stats
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => MOCK_GRAPH } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => MOCK_STATS } as Response)
})

describe('KuzuDashboard', () => {
  it('renders page header', async () => {
    render(<KuzuDashboard />)
    expect(screen.getByText('Kùzu Graph Dashboard')).toBeInTheDocument()
  })

  it('shows stats after load', async () => {
    render(<KuzuDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Files')).toBeInTheDocument()
    })
    expect(screen.getByText('Classes')).toBeInTheDocument()
    expect(screen.getByText('Functions')).toBeInTheDocument()
    expect(screen.getByText('Edges')).toBeInTheDocument()
    // Stats loaded = values are 1,1,1,2
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3)
  })

  it('renders graph legend', async () => {
    render(<KuzuDashboard />)
    await waitFor(() => expect(screen.getByText('Force Graph')).toBeInTheDocument())
    expect(screen.getByText('file')).toBeInTheDocument()
    expect(screen.getByText('class')).toBeInTheDocument()
    expect(screen.getByText('function')).toBeInTheDocument()
  })

  it('calls search endpoint on button click', async () => {
    render(<KuzuDashboard />)
    await waitFor(() => screen.getByPlaceholderText(/Найти класс/i))

    // Mock search response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: 'Core', results: [{ type: 'class', name: 'CoreMind', file: 'core/main.py' }], count: 1 }),
    } as Response)

    fireEvent.change(screen.getByPlaceholderText(/класс/i), { target: { value: 'Core' } })
    fireEvent.click(screen.getByText('Найти'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/kuzu/search?q=Core'))
      // CoreMind appears in both SVG label and result card
      expect(screen.getAllByText('CoreMind').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows empty state message when no results', async () => {
    render(<KuzuDashboard />)
    await waitFor(() => screen.getByPlaceholderText(/Найти класс/i))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: 'xyz', results: [], count: 0 }),
    } as Response)

    fireEvent.change(screen.getByPlaceholderText(/класс/i), { target: { value: 'xyz' } })
    fireEvent.click(screen.getByText('Найти'))

    await waitFor(() => {
      expect(screen.getByText(/Ничего не найдено/)).toBeInTheDocument()
    })
  })

  it('calls rebuild endpoint', async () => {
    render(<KuzuDashboard />)
    await waitFor(() => screen.getByRole('button', { name: /Rebuild/i }))

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'rebuilt' }) } as Response)
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_GRAPH } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_STATS } as Response)

    fireEvent.click(screen.getByRole('button', { name: /Rebuild/i }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/kuzu/rebuild', { method: 'POST' })
    })
  })

  it('shows error state on fetch failure', async () => {
    mockFetch.mockReset()
    mockFetch.mockRejectedValue(new Error('Network error'))
    render(<KuzuDashboard />)
    await waitFor(() => {
      expect(screen.getByText(/Не удалось подключиться/)).toBeInTheDocument()
    })
  })
})
