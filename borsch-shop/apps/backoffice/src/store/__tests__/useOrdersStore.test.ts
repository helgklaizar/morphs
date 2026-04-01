import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrdersStore, Order, OrderStatus } from '../useOrdersStore'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    }))
  }
}))

describe('useOrdersStore: updateOrderFull', () => {
  const mockOrder: Order = {
    id: 'test-order-id',
    customerName: 'Test Client',
    customerPhone: '12345',
    status: 'new' as OrderStatus,
    totalAmount: 100,
    createdAt: new Date().toISOString(),
    paymentMethod: 'cash',
    items: [
      { id: '1', menuItemName: 'Хинкали', quantity: 2, priceAtTime: 50, menuItemId: 'uuid-1' },
      { id: '2', menuItemName: 'Доставка', quantity: 1, priceAtTime: 30, menuItemId: 'delivery' } // Should be correctly converted to null
    ],
    isArchived: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useOrdersStore.setState({ orders: [mockOrder], isLoading: false, error: null })
  })

  it('correctly maps delivery id to null when inserting items', async () => {
    // Setup specific mock implementations for the chained methods
    const selectMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    // Simulate supabase.from() behavior
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orders') return { update: updateMock } as any
      if (table === 'order_items') return { delete: deleteMock, insert: insertMock } as any
      return {} as any
    })

    // Bypass fetchOrders for this test
    vi.spyOn(useOrdersStore.getState(), 'fetchOrders').mockResolvedValue(undefined)

    const updatedOrder = { ...mockOrder, totalAmount: 130 }
    await useOrdersStore.getState().updateOrderFull(updatedOrder)

    // Check that 'delivery' was replaced by null
    expect(insertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ menu_item_id: 'uuid-1' }),
        expect.objectContaining({ menu_item_id: null }) // <--- Bug solved assertion
      ])
    )
    
    // Check fetchOrders was called
    expect(useOrdersStore.getState().fetchOrders).toHaveBeenCalled()
  })

  it('rolls back completely and alerts if insert fails', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    // Success for update/delete, but ERROR for insert
    const successSelectMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const errorSelectMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed!') })
    
    const eqMock = vi.fn().mockReturnValue({ select: successSelectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    const insertMock = vi.fn().mockReturnValue({ select: errorSelectMock })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'orders') return { update: updateMock } as any
      if (table === 'order_items') return { delete: deleteMock, insert: insertMock } as any
      return {} as any
    })

    vi.spyOn(useOrdersStore.getState(), 'fetchOrders').mockResolvedValue(undefined)

    await useOrdersStore.getState().updateOrderFull(mockOrder)

    // Alert should have been shown with error message
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Insert failed!'))
    expect(useOrdersStore.getState().fetchOrders).toHaveBeenCalled() // The rollback mechanism calls fetchOrders again!
  })
})
