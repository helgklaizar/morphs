import { MenuSharedHeader } from "@/components/MenuSharedHeader";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Package, AlertTriangle } from "lucide-react";

interface PurchaseItem {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  deficit: number;
}

export default function PurchasesPage() {
  const { data: inventory = [], isLoading } = useQuery<any[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3002/api/inventory');
      return res.json();
    }
  });

  const deficitItems = inventory
    .filter(i => i.stock <= i.minStock)
    .map(i => ({
      ...i,
      deficit: Math.max(0, i.minStock - i.stock + i.minStock) // need to buy to reach 2x minStock
    }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MenuSharedHeader />

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-6">
        <div className="mb-6">
          <h2 className="text-xl font-black text-white/80 mb-1 uppercase tracking-widest">Список закупок</h2>
          <p className="text-sm text-white/40">Позиции, у которых остаток ≤ минимального запаса</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 opacity-50">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
          </div>
        ) : deficitItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
            <ShoppingCart className="w-16 h-16 opacity-50" />
            <p className="font-bold tracking-widest uppercase">Всё на складе 🎉</p>
            <p className="text-sm">Пополнять запасы не нужно</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {deficitItems.map((item: any) => (
              <div key={item.id} className={`flex items-center gap-4 bg-[#141414] border rounded-2xl p-5 ${item.stock === 0 ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <div className={`p-3 rounded-xl ${item.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-sm text-white/50 mt-0.5">
                    Остаток: <span className={`font-bold ${item.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>{item.stock} {item.unit}</span>
                    {" · "}Мин. запас: <span className="text-white/60">{item.minStock} {item.unit}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Купить</p>
                  <p className="text-xl font-black text-orange-400">{item.deficit} <span className="text-sm text-white/50">{item.unit}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {inventory.length > 0 && deficitItems.length > 0 && (
          <div className="mt-6 p-5 bg-[#1A1A1A] rounded-2xl border border-white/5">
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-3">Итого позиций к закупке</p>
            <p className="text-4xl font-black text-orange-500">{deficitItems.length} <span className="text-lg text-white/40">позиций</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
