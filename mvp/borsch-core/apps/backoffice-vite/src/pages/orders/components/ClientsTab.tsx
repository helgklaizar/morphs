import { useClientsQuery } from "@rms/core";
import { Users, Phone, MapPin } from "lucide-react";

export function ClientsTab() {
  const { data: clients = [], isLoading } = useClientsQuery();

  if (isLoading) {
     return (
       <div className="flex justify-center items-center h-64">
         <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
       </div>
     );
  }

  if (clients.length === 0) {
     return (
       <div className="flex h-64 flex-col items-center justify-center text-white/40">
         <Users className="h-16 w-16 mb-4 opacity-50" />
         <p>База клиентов пуста</p>
       </div>
     );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 pb-20">
      {clients.map((client: any) => {
        const cleanName = client.name?.replace(/\s*\((Самовывоз|Доставка.*?)\)/i, '');
        const orderCount = client.orders?.length || 0;
        
        return (
          <div 
            key={client.id} 
            className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 h-full shadow-2xl transition-all overflow-hidden relative"
            style={{ boxShadow: `0 8px 32px -8px #6366f125` }}
          >
             {/* Glow Effect Top Border */}
             <div className="absolute top-0 left-0 right-0 h-[3px] w-full bg-indigo-500"></div>

             <div className="flex flex-col p-4 flex-1 gap-4 relative z-10">
               {/* БЛОК 1: Имя - телефон */}
               <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                 <div className="flex flex-col min-w-0 flex-1">
                   <h3 className="text-[21px] font-bold truncate text-white/90">{cleanName || 'Аноним'}</h3>
                   <span className="text-[14px] font-bold text-indigo-400 mt-0.5">{client.phone}</span>
                 </div>
                 
                 <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1 rounded-xl text-xs font-bold bg-white/5 text-white/50 border border-white/5">
                      {orderCount} заказов
                    </div>
                 </div>
               </div>

               {/* БЛОК 2: Адрес */}
               <div className="flex-1">
                 <div className="flex items-start gap-2 text-sm text-white/50 line-clamp-2">
                   <MapPin className="w-5 h-5 shrink-0 mt-0.5 opacity-40 text-white" />
                   <span>{client.address || 'Адрес не указан'}</span>
                 </div>
               </div>

               {/* БЛОК 3: Подвал / Сумма */}
               <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                 <div className="text-[12px] text-white/40 font-bold uppercase tracking-wider">
                   Сумма LTV
                 </div>
                 <div className="font-black text-emerald-400 text-xl">
                   {Math.round(client.ltv || 0)} ₪
                 </div>
               </div>
             </div>
          </div>
        );
      })}
    </div>
  );
}
