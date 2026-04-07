import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutPage from '../app/(protected)/pos/page';
import { useMenuStore } from '@rms/core';
import { useCartStore } from '@rms/core';
import { useOrdersStore } from '@rms/core';

// Mock the stores
vi.mock('@rms/core', () => ({
  useMenuStore: vi.fn(),
}));
vi.mock('@rms/core', () => ({
  useCartStore: vi.fn(),
}));
vi.mock('@rms/core', () => ({
  useOrdersStore: vi.fn(),
}));
vi.mock('@rms/core', () => ({
  useAiStore: vi.fn().mockReturnValue({ isOpen: false }),
}));

describe('POSPage Integration', () => {
  it('renders menu and adds item to cart', () => {
    const mockCategories = [
      { id: 'c1', name: 'Супы', items: [
        { id: 'm1', name: 'Борщ', price: 30, isActive: true, category: 'Супы' }
      ]}
    ];
    
    (useMenuStore as any).mockReturnValue({
      categories: mockCategories,
      items: [
        { id: 'm1', name: 'Борщ', price: 30, isActive: true, category: 'Супы' }
      ],
      isLoading: false,
      fetchMenuItems: vi.fn(),
    });
    (useMenuStore as any).getState = () => ({ fetchCategories: vi.fn() });

    const mockAddToCart = vi.fn();
    (useCartStore as any).mockReturnValue({
       items: [],
       addToCart: mockAddToCart,
       getTotal: () => 0,
       customerName: '',
       customerPhone: '',
       paymentMethod: 'cash',
       reservationDate: null,
       setCustomer: vi.fn(),
       setPaymentMethod: vi.fn(),
       setReservationDate: vi.fn(),
       clearCart: vi.fn(),
       removeFromCart: vi.fn(),
       updateQuantity: vi.fn(),
    });

    (useOrdersStore as any).mockReturnValue({
      fetchOrders: vi.fn(),
    });

    render(<CheckoutPage />);
    
    expect(screen.getByText(/борщ/i)).toBeDefined();
    
    // Click on item to add to cart
    fireEvent.click(screen.getByText(/борщ/i));
    expect(mockAddToCart).toHaveBeenCalled();
  });
});
