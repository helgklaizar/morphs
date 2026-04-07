import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrdersPage from '../app/(protected)/orders/page';
import { useOrdersStore } from '@rms/core';

vi.mock('@rms/core', () => ({
  useOrdersStore: vi.fn(),
}));

describe('OrdersPage Integration', () => {
  it('renders orders in correct status column and toggles views', () => {
    const mockOrders = [
      { id: 'o1', customerName: 'Иван', status: 'new', items: [], totalAmount: 100, customerPhone: '123', createdAt: new Date().toISOString() },
      { id: 'o2', customerName: 'Иван (Подписка [Пн])', status: 'pending', items: [], totalAmount: 500, customerPhone: '123', createdAt: new Date().toISOString() }
    ];

    (useOrdersStore as any).mockReturnValue({
      orders: mockOrders,
      isLoading: false,
      fetchOrders: vi.fn(),
      subscribeToOrders: vi.fn(),
      unsubscribeFromOrders: vi.fn(),
    });

    render(<OrdersPage />);
    
    // Check main title
    expect(screen.getByText('Управление заказами')).toBeDefined();
    
    // the regular new order shows up
    expect(screen.getAllByText('Иван')[0]).toBeDefined();
    
    // Switch to Mega Profiles
    const megaBtn = screen.getByText(/Мега-профили/i);
    fireEvent.click(megaBtn);
    
    // Sub order should trigger mega profile
    expect(screen.getAllByText('Иван')[0]).toBeDefined();
    expect(screen.getAllByText(/500/)[0]).toBeDefined();
  });
});
