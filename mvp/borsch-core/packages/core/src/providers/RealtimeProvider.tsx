"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pb } from '@rms/db-local';
import { orderKeys } from '@rms/core';

export function RealtimeProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Подписываемся на коллекции заказов и их элементов
    pb.collection('orders').subscribe('*', () => {
      // При любом изменении (создание, апдейт, удаление) инвалидируем кэш React Query.
      // Запросы на фоне перекачают свежие данные без перезагрузки страницы.
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    });

    pb.collection('order_items').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    });

    return () => {
      pb.collection('orders').unsubscribe('*');
      pb.collection('order_items').unsubscribe('*');
    };
  }, [queryClient]);

  // Не рендерим ничего, это компонент-обработчик логики.
  return null;
}
