import { Order } from '@rms/core';
import { Users, Edit2 } from 'lucide-react';
import { STATUS_CONFIG } from '../config';

interface MegaOrdersViewProps {
  megaProfiles: {
    phone: string;
    cleanName: string;
    orders: Order[];
    totalSum: number;
    paymentMethod: string;
  }[];
  onAcceptSubscription: (profile: { orders: Order[] }) => void;
  onDeleteSubscription: (profile: { key: string; orders: Order[] }) => void;
  onEditOrder: (order: Order) => void;
}

export function MegaOrdersView({
  megaProfiles,
  onAcceptSubscription,
  onDeleteSubscription,
  onEditOrder,
}: MegaOrdersViewProps) {
  if (megaProfiles.length === 0) {
    return (
      <div className="col-span-full flex h-64 flex-col items-center justify-center">
        <Users className="h-16 w-16 text-[#2A2A2A] mb-4" />
        <p className="text-xl font-semibold text-gray-500">Нет активных подписок</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-6 pb-20">
      {megaProfiles.map(profile => (
        <div key={profile.phone} className="bg-[#141414] rounded-[18px] border border-green-500/20 shadow-lg flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-green-500/5">
            <div>
              <h3 className="font-black text-xl text-white uppercase">{profile.cleanName}</h3>
              <p className="font-mono text-white/50 text-sm mt-1">{profile.phone}</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-xs text-white/30 uppercase font-black tracking-widest mb-1.5 border-b border-white/5 pb-1 inline-block">Итого за неделю</p>
                  <div className="text-3xl font-black text-green-500 leading-none">
                    {profile.totalSum} ₪
                  </div>
               </div>
               
               <div className="flex flex-col gap-2 border-l border-white/10 pl-4">
                 <button 
                   onClick={() => onAcceptSubscription({ orders: profile.orders })}
                   className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-xs"
                 >
                   Принять в работу
                 </button>
                 <button 
                   onClick={() => onDeleteSubscription({ key: profile.phone, orders: profile.orders })}
                   className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2 px-4 rounded-lg text-xs"
                 >
                   Удалить
                 </button>
               </div>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-4 bg-[#0a0a0a]">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-xs font-black uppercase text-white/30 tracking-widest">ДОСТАВКИ ПО ДНЯМ:</span>
             </div>
             <div className="flex flex-col gap-3">
               {profile.orders.map((o, idx) => {
                 const dayMatch = o.customerName.match(/\[(.*?)\]/);
                 const dayInfo = dayMatch ? dayMatch[1] : `Заказ ${idx+1}`;
                 const deliveryInfo = o.customerName.includes("Самовывоз") ? "Самовывоз" : "Доставка";
                 
                 return (
                   <div key={o.id} className="p-3 bg-[#1c1c1e] rounded-xl border border-white/5 flex items-center justify-between gap-4">
                     <div>
                       <p className="font-bold text-white/90 text-sm">{dayInfo} <span className="text-orange-500/60 ml-2 text-xs">({deliveryInfo})</span></p>
                       <p className="text-xs text-white/40 mt-1">{o.items.length} поз., сумма {o.totalAmount} ₪</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black text-white/50 border border-white/10">
                         Статус: {STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG]?.label || o.status}
                       </div>
                       <button onClick={() => onEditOrder(o)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10">
                         <Edit2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
