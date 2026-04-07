import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as menuApi from './menu.api';
import { MenuItem } from '@rms/types';
import { pb } from '@rms/db-local';
import { useEffect } from 'react';

export const useCategoriesQuery = () => {
    return useQuery({
        queryKey: ['menu_categories'],
        queryFn: menuApi.fetchCategories
    });
};

export const useMenuQuery = () => {
    return useQuery({
        queryKey: ['menu_items'],
        queryFn: menuApi.fetchMenuItems
    });
};

export const useUpdateMenuStockMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, amount }: { id: string, amount: number }) => menuApi.updateMenuStock(id, amount),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu_items'] })
    });
};

export const useToggleMenuActiveMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => menuApi.toggleMenuTargetActive(id, isActive),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu_items'] })
    });
};

export const useSaveMenuItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (item: Partial<MenuItem> & { imageFile?: File }) => menuApi.saveMenuItem(item),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu_items'] })
    });
};

export const useDeleteMenuItemMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => menuApi.deleteMenuItem(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu_items'] })
    });
};

export const useMenuSubscriptions = () => {
    const queryClient = useQueryClient();
    
    useEffect(() => {
        pb.collection('menu_items').subscribe('*', () => {
            queryClient.invalidateQueries({ queryKey: ['menu_items'] });
        });
        pb.collection('menu_categories').subscribe('*', () => {
            queryClient.invalidateQueries({ queryKey: ['menu_categories'] });
        });
        
        return () => {
            pb.collection('menu_items').unsubscribe('*');
            pb.collection('menu_categories').unsubscribe('*');
        };
    }, [queryClient]);
};
