import { useQuery } from "@tanstack/react-query";
import { Archive, RotateCcw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastStore } from "@rms/core";
import { format } from "date-fns";

export default function OrdersHistoryPage() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['orders_archived'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3002/api/orders/archived');
      if (!res.ok) throw new Error('failed');
      return res.json();
    }
  });

  const unarchiveMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`http://localhost:3002/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders_archived'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      useToastStore.getState().success("Заказ восстановлен");
    }
  });

  if (isLoading) return (
    <div className="flex justify-center py-20 opacity-50">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 pb-6 border-b border-white/5 shrink-0">
        <Archive className="w-7 h-7 text-neutral-500" />
        <h1 className="text-3xl font-black bg-gradient-to-r from-neutral-300 to-white bg-clip-text text-transparent uppercase tracking-wider">
          Архив заказов
        </h1>
        <span className="text-sm text-white/30 ml-auto">{orders.length} заказов</span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-6 mt-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
            <Archive className="w-16 h-16 opacity-50" />
            <p className="font-bold tracking-widest uppercase text-sm">Архив пуст</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order: any) => (
              <div key={order.id} className="flex items-center gap-4 bg-[#141414] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-black text-sm text-white/60">#{order.id.slice(-4).toUpperCase()}</span>
                    <span className="font-bold text-sm truncate">{order.customerName}</span>
                    <span className="text-xs text-white/30">{order.customerPhone}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    <span>{order.totalAmount} ₪</span>
                    <span>·</span>
                    <span>{format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                    <span>·</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-white/30 uppercase font-bold tracking-wide">{order.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => unarchiveMut.mutate(order.id)}
                  className="p-2 text-white/20 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors flex-none"
                  title="Восстановить"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
