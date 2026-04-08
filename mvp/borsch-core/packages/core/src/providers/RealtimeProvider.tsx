"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { orderKeys } from '../domains/orders/orders.queries';

export function RealtimeProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Подключаемся к Hono SSE
    const eventSource = new EventSource('http://localhost:3002/api/events');

    eventSource.addEventListener('order-created', (event) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    });

    eventSource.addEventListener('order-updated', (event) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    });

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  // Не рендерим ничего, это компонент-обработчик логики.
  return null;
}
