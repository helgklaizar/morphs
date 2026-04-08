import { useState } from "react";
import { useClientsQuery, useToastStore } from "@rms/core";
import { User, Phone, MapPin, TrendingUp, Search, ExternalLink } from "lucide-react";
import { MenuSharedHeader } from "@/components/MenuSharedHeader";

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClientsQuery();
  const [search, setSearch] = useState("");

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MenuSharedHeader />

      <div className="flex items-center justify-between pb-6 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-black uppercase tracking-widest text-white/90">База клиентов (CRM)</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Всего в базе: {clients.length}</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Поиск по имени или телефону..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs focus:outline-none focus:border-orange-500 transition-all font-bold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-10">
        {isLoading ? (
          <div className="flex justify-center py-20 opacity-20"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/></div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/5 border border-dashed border-white/5 rounded-3xl">
            <User className="w-20 h-20 mb-4 opacity-50" />
            <p className="font-black tracking-[0.4em] uppercase text-xs">Клиенты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredClients.map((c: any) => (
              <div key={c.id} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 group flex flex-col justify-between hover:border-white/10 transition-all cursor-default">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-orange-500/30 transition-all">
                        <User className="w-6 h-6 text-white/40 group-hover:text-orange-500 transition-all" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{c.name || 'Анонимный клиент'}</h3>
                        <p className="text-xs font-bold text-white/30 mt-0.5">{c.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-white/20" />
                      <span className="text-xs text-white/50 line-clamp-1">{c.address || 'Адрес не указан'}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.03]">
                      <div>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Всего заказов</p>
                        <p className="text-lg font-black text-white">{c.totalOrders || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">LTV (Выручка)</p>
                        <p className="text-lg font-black text-orange-500">{Math.round(c.ltv || 0)} ₪</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                      <span className="text-[10px] font-black text-white/40 uppercase">Последний:</span>
                      <span className="text-xs font-black text-white/60">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}</span>
                    </div>
                    <button className="text-white/10 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
