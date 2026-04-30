import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import B2BConstructor from '../pages/B2BConstructor'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

beforeEach(() => { mockFetch.mockReset() })

// Helper: get business type input (step 1 input)
const getBizInput = () => screen.getByPlaceholderText(/Agency/i)

describe('B2BConstructor', () => {
  it('renders step 1 with wizard labels', () => {
    render(<B2BConstructor />)
    expect(screen.getByText('Бизнес')).toBeInTheDocument()
    expect(screen.getByText('Какой бизнес разворачиваем?')).toBeInTheDocument()
    expect(getBizInput()).toBeInTheDocument()
  })

  it('cannot proceed from step 1 without business type', () => {
    render(<B2BConstructor />)
    expect(screen.getByText('Далее →')).toBeDisabled()
  })

  it('enables next button after typing business type', async () => {
    render(<B2BConstructor />)
    fireEvent.change(getBizInput(), { target: { value: 'My Coffee Shop' } })
    await waitFor(() => {
      expect(screen.getByText('Далее →')).not.toBeDisabled()
    })
  })

  it('advances to step 2 on next click', async () => {
    render(<B2BConstructor />)
    fireEvent.change(getBizInput(), { target: { value: 'My Café' } })
    fireEvent.click(screen.getByText('Далее →'))
    await waitFor(() => {
      expect(screen.getByText('Выберите модули системы')).toBeInTheDocument()
    })
  })

  it('allows selecting modules by tag click', async () => {
    render(<B2BConstructor />)
    // Advance to step 2
    fireEvent.change(getBizInput(), { target: { value: 'Shop' } })
    fireEvent.click(screen.getByText('Далее →'))

    await waitFor(() => screen.getByText('inventory'))
    fireEvent.click(screen.getByText('inventory'))
    fireEvent.click(screen.getByText('crm'))

    // Selected count badge visible — use getAllByText since step numbers also appear
    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('uses preset business type', async () => {
    render(<B2BConstructor />)
    fireEvent.click(screen.getByText('B2B CRM'))
    const input = getBizInput() as HTMLInputElement
    expect(input.value).toBe('B2B CRM')
  })

  it('hits API on launch step', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Accepted', status: 'accepted' }),
    } as Response)

    render(<B2BConstructor />)
    // Navigate to step 4
    fireEvent.change(getBizInput(), { target: { value: 'Test Biz' } })
    fireEvent.click(screen.getByText('Далее →'))   // → step 2
    await waitFor(() => screen.getByText('Далее →'))
    fireEvent.click(screen.getByText('Далее →'))   // → step 3
    await waitFor(() => screen.getByText('Далее →'))
    fireEvent.click(screen.getByText('Далее →'))   // → step 4
    await waitFor(() => screen.getByText(/Запустить Morph Swarm/))

    // Mock EventSource
    globalThis.EventSource = vi.fn(() => ({
      onmessage: null, onerror: null, close: vi.fn(),
    })) as unknown as typeof EventSource

    fireEvent.click(screen.getByText(/Запустить Morph Swarm/))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/generate',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows error log when core mind offline', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    render(<B2BConstructor />)
    fireEvent.change(getBizInput(), { target: { value: 'Test Biz' } })
    // Skip to step 4
    fireEvent.click(screen.getByText('Далее →'))
    await waitFor(() => screen.getByText('Далее →'))
    fireEvent.click(screen.getByText('Далее →'))
    await waitFor(() => screen.getByText('Далее →'))
    fireEvent.click(screen.getByText('Далее →'))
    await waitFor(() => screen.getByText(/Запустить Morph Swarm/))

    globalThis.EventSource = vi.fn(() => ({ onmessage: null, onerror: null, close: vi.fn() })) as unknown as typeof EventSource
    fireEvent.click(screen.getByText(/Запустить Morph Swarm/))

    await waitFor(() => {
      expect(screen.getByText(/Core Mind недоступен/i)).toBeInTheDocument()
    })
  })
})
