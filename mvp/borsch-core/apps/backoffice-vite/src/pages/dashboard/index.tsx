import { useAnalyticsQuery } from "@rms/core";
import { TrendingUp, Users, ShoppingBag, CreditCard, ChevronUp } from "lucide-react";
import { MenuSharedHeader } from "@/components/MenuSharedHeader";

export default function DashboardPage() {
  const { data, isLoading } = useAnalyticsQuery();

  if (isLoading || !data) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <MenuSharedHeader />
        <div className="flex-1 flex items-center justify-center opacity-20">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
        </div>
      </div>
    );
  }

  const { stats, salesByDay, popularItems } = data;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MenuSharedHeader />

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-10">
        <div className="mb-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-white/90">Аналитика бизнеса</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Показатели за последние 7 дней</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Выручка', value: `${stats.totalRevenue.toLocaleString()} ₪`, icon: CreditCard, color: 'text-orange-500' },
            { label: 'Заказы', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-500' },
            { label: 'Новые клиенты', value: stats.newClients, icon: Users, color: 'text-green-500' },
            { label: 'Средний чек', value: `${Math.round(stats.avgCheck)} ₪`, icon: TrendingUp, color: 'text-purple-500' },
          ].map((s, idx) => (
            <div key={idx} className="bg-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 group hover:border-white/10 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase">
                  <ChevronUp className="w-3 h-3" /> 12%
                </div>
              </div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className="text-2xl font-black text-white">{s.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart (CSS Simple Bar) */}
          <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-8">Продажи (7 дней)</h3>
            <div className="flex items-end justify-between h-48 gap-2">
              {salesByDay.map((day, idx) => {
                const max = Math.max(...salesByDay.map(d => d.amount), 1);
                const height = (day.amount / max) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full relative">
                       <div 
                        style={{ height: `${height}%` }}
                        className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl group-hover:from-orange-500 transition-all relative"
                       >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.amount}
                         </div>
                       </div>
                    </div>
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-tight">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Items */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-8">Топ блюд</h3>
            <div className="space-y-6">
              {popularItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-white/10 group-hover:text-orange-500/50 transition-colors">0{idx + 1}</span>
                    <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-white/30 lowercase">{item.quantity} шт.</span>
                </div>
              ))}
              {popularItems.length === 0 && (
                <div className="text-center py-10 opacity-20">Нет данных о продажах</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

