import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MenuPage from '../app/(protected)/menu/page';
import { useMenuStore } from '../store/useMenuStore';
import { useRecipesStore } from '../store/useRecipesStore';
import { useAssembliesStore } from '../store/useAssembliesStore';
import { useLandingSettingsStore } from '../store/useLandingSettingsStore';

vi.mock('../store/useMenuStore', () => ({
  useMenuStore: vi.fn(),
}));

vi.mock('../store/useRecipesStore', () => ({
  useRecipesStore: vi.fn(),
}));

vi.mock('../store/useAssembliesStore', () => ({
  useAssembliesStore: vi.fn(),
}));

vi.mock('../store/useLandingSettingsStore', () => ({
  useLandingSettingsStore: vi.fn(),
}));

describe('MenuPage Integration', () => {
  it('renders menu items and responds to add button', () => {
    (useMenuStore as any).mockReturnValue({
      categories: [
        { id: 'c1', name: 'Супы' }
      ],
      items: [
        { id: '1', name: 'Борщ Украинский', price: 45, stock: 10, isActive: true, isPoll: false, category: 'c1' },
        { id: '2', name: 'Сало', price: 20, stock: 5, isActive: false, isPoll: false, category: 'c1' },
      ],
      isLoading: false,
      fetchMenuItems: vi.fn(),
      fetchCategories: vi.fn(),
      subscribeToMenu: vi.fn(),
      unsubscribeFromMenu: vi.fn(),
    });

    (useRecipesStore as any).mockReturnValue({
      recipes: [],
      fetchRecipes: vi.fn(),
    });
    
    (useRecipesStore as any).getState = () => ({
      calculateRecipeCost: vi.fn().mockReturnValue(15),
    });

    (useAssembliesStore as any).mockReturnValue({
      assemblies: [],
      fetchAssemblies: vi.fn(),
    });

    (useLandingSettingsStore as any).mockReturnValue({
      settings: null,
      fetchSettings: vi.fn(),
      updateSettings: vi.fn(),
    });

    render(<MenuPage />);
    
    // Check main title
    expect(screen.getByText('Управление Меню')).toBeDefined();
    
    // Check items rendered
    expect(screen.getByText('Борщ Украинский')).toBeDefined();
    expect(screen.getByText('45 ₪')).toBeDefined();
    expect(screen.getByText('Сало')).toBeDefined();
    
    // Check add modal
    const addBtn = screen.getByText('Добавить');
    fireEvent.click(addBtn);
    
    // The MenuItemModal should render (it could show "Новая позиция")
    // We just verify it doesn't crash here.
  });
});
