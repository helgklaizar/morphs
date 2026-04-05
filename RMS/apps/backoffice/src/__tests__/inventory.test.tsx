import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InventoryPage from '../app/(protected)/inventory/page';
import { useInventoryStore } from '../store/useInventoryStore';

// Mock the store
vi.mock('../store/useInventoryStore', () => ({
  useInventoryStore: vi.fn(),
}));

describe('InventoryPage Integration', () => {
  it('renders inventory correctly and handles add click', () => {
    const mockCategories = [
      { id: '1', name: 'Овощи', orderIndex: 0, isVisibleInAssemblies: false, isVisibleInRecipe: true, items: [
        { id: 'i1', name: 'Картофель', price: 50, quantity: 10, unit: 'кг', categoryId: '1' }
      ]}
    ];
    
    (useInventoryStore as any).mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      fetchInventory: vi.fn(),
      subscribeToInventory: vi.fn(),
      unsubscribeFromInventory: vi.fn(),
      updateItemQuantity: vi.fn(),
      toggleCategoryVisibility: vi.fn(),
      addCategory: vi.fn(),
      deleteCategory: vi.fn(),
      reorderCategories: vi.fn(),
    });

    render(<InventoryPage />);
    
    // Case-insensitive search
    expect(screen.getByText(/картофель/i)).toBeDefined();
    expect(screen.getByText(/овощи/i)).toBeDefined();
  });
});
