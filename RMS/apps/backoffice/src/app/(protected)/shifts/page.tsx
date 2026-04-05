"use client";

import { useEffect, useState } from "react";
import { Clock, Play, StopCircle, User, Calendar, DollarSign, Wallet, History, X, FileText, Printer } from "lucide-react";
import { useShiftsStore, Shift } from "@/store/useShiftsStore";
import { useWorkersStore } from "@/store/useWorkersStore";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useToastStore } from "@/store/useToastStore";
import { format, formatDistance } from "date-fns";
import { ru } from "date-fns/locale";

function ZReportModal({ onClose }: { onClose: () => void }) {
  const { fetchOrders, archiveOrder, orders } = useOrdersStore();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const completedOrders = orders.filter(o => o.status === 'completed');

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const cashObj = completedOrders.filter(o => o.paymentMethod === 'cash');
  const cardObj = completedOrders.filter(o => o.paymentMethod !== 'cash');
  const cashRevenue = cashObj.reduce((sum, o) => sum + o.totalAmount, 0);
  const cardRevenue = cardObj.reduce((sum, o) => sum + o.totalAmount, 0);

  const handleArchive = async () => {
    setIsClosing(true);
    try {
      for (const order of completedOrders) {
         await archiveOrder(order.id);
      }
      useToastStore.getState().success("Смена успешно закрыта, данные обнулились.");
      onClose();
    } catch (e: any) {
      useToastStore.getState().error("Ошибка при закрытии смены: " + e.message);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
       <div className="bg-[#1a1a1a] rounded-2xl p-8 w-full max-w-md border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-200">
         <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
         </button>
         
         <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-2xl mb-4 border border-white/10 text-white">
               <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Z-ОТЧЕТ</h2>
            <p className="text-white/40 text-sm mt-1">{format(new Date(), "dd MMMM yyyy, HH:mm", { locale: ru })}</p>
         </div>

         <div className="space-y-3 bg-[#111] p-5 rounded-2xl border border-white/5 mb-6">
            <div className="flex justify-between items-center text-sm">
               <span className="text-white/50 font-medium">Закрытых чеков:</span>
               <span className="font-bold">{completedOrders.length}</span>
            </div>
            <div className="h-px bg-white/5 my-2"></div>
            <div className="flex justify-between items-center text-sm">
               <span className="text-white/50 font-medium">Наличные:</span>
               <span className="font-bold text-green-400">{cashRevenue.toFixed(2)} ₪</span>
            </div>
            <div className="flex justify-between items-center text-sm">
               <span className="text-white/50 font-medium">Карта/Bit:</span>
               <span className="font-bold text-purple-400">{cardRevenue.toFixed(2)} ₪</span>
            </div>
            <div className="h-px bg-white/5 my-2"></div>
            <div className="flex justify-between items-center text-lg">
               <span className="text-white/80 font-black uppercase tracking-widest">ИТОГО:</span>
               <span className="font-black text-white">{totalRevenue.toFixed(2)} ₪</span>
            </div>
         </div>

         <div className="flex gap-3">
            <button 
               onClick={() => window.print()} 
               className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
               <Printer className="w-4 h-4" /> Печать
            </button>
            <button 
               onClick={handleArchive}
               disabled={isClosing || completedOrders.length === 0}
               className="flex-[2] bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-3 rounded-xl transition-colors text-sm uppercase tracking-wider"
            >
               {isClosing ? 'Закрытие...' : 'Закрыть смену'}
            </button>
         </div>
       </div>
    </div>
  );
}

export default function ShiftsPage() {
  const { shifts, isLoading, fetchShifts, startShift, endShift } = useShiftsStore();
  const { workers, fetchWorkers } = useWorkersStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  useEffect(() => {
    fetchShifts();
    fetchWorkers();
  }, [fetchShifts, fetchWorkers]);

  const activeShifts = shifts.filter(s => !s.end_time);
  const shiftHistory = shifts.filter(s => s.end_time);

  const handleStart = async () => {
    if (!selectedWorkerId) return;
    await startShift(selectedWorkerId);
    setIsModalOpen(false);
    setSelectedWorkerId("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Смены</h1>
          <p className="text-sm text-muted-foreground mt-1">График работы и учет рабочего времени</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsZReportOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold transition-all active:scale-[0.98]"
          >
            <FileText className="w-5 h-5" />
            Z-ОТЧЕТ
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            ОТКРЫТЬ СМЕНУ
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 space-y-12 pb-20">
        {/* Active Shifts */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
            <Clock className="w-3 h-3" /> СЕЙЧАС НА СМЕНЕ
          </h2>
          
          {activeShifts.length === 0 ? (
            <div className="bg-[#111] p-10 rounded-3xl border border-dashed border-white/10 text-center">
              <span className="text-white/20 font-bold uppercase italic">Нет открытых смен</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeShifts.map(shift => (
                <div key={shift.id} className="bg-blue-500/5 rounded-3xl border border-blue-500/20 p-6 flex flex-col relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4">
                     <span className="w-3 h-3 bg-blue-500 rounded-full animate-ping inline-block" />
                   </div>

                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center font-black text-xl text-black">
                        {(shift.expand?.worker_id?.name || '?').charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{shift.expand?.worker_id?.name || 'Неизвестно'}</h3>
                        <p className="text-xs text-blue-500 font-bold uppercase tracking-widest">{shift.expand?.worker_id?.role}</p>
                      </div>
                   </div>

                   <div className="space-y-3 mb-8">
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-white/30">Начало</span>
                        <span className="text-white/80">{format(new Date(shift.start_time), "HH:mm (eeee)", { locale: ru })}</span>
                     </div>
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-white/30">Длительность</span>
                        <span className="text-blue-500 font-black">{formatDistance(new Date(shift.start_time), new Date(), { locale: ru })}</span>
                     </div>
                   </div>

                   <button 
                     onClick={() => endShift(shift.id, shift.start_time, shift.expand?.worker_id?.hourly_rate || 0)}
                     className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-500/10"
                   >
                     <StopCircle className="w-5 h-5" /> ЗАВЕРШИТЬ СМЕНУ
                   </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shift History */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
            <History className="w-3 h-3" /> ИСТОРИЯ СМЕН
          </h2>
          
          <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 text-[10px] text-white/30 uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Сотрудник</th>
                  <th className="px-6 py-4">Начало</th>
                  <th className="px-6 py-4">Конец</th>
                  <th className="px-6 py-4">Часы</th>
                  <th className="px-6 py-4 text-right">Зарплата</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {shiftHistory.map(shift => (
                  <tr key={shift.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40">
                             {shift.expand?.worker_id?.name ? shift.expand.worker_id.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="font-bold">{shift.expand?.worker_id?.name || 'Удален'}</div>
                            <div className="text-[10px] text-white/30 uppercase font-black">{shift.expand?.worker_id?.role}</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-white/40 lowercase italic">
                       {format(new Date(shift.start_time), "dd MMM HH:mm", { locale: ru })}
                    </td>
                    <td className="px-6 py-4 text-white/40 lowercase italic">
                       {shift.end_time ? format(new Date(shift.end_time), "dd MMM HH:mm", { locale: ru }) : '—'}
                    </td>
                    <td className="px-6 py-4 font-black text-blue-500">
                       {shift.total_hours.toFixed(1)} ч.
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="font-black text-white bg-green-500/10 px-3 py-1 rounded-lg text-green-500">
                         {shift.total_pay.toFixed(1)} ₪
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
               <X className="h-5 w-5" />
             </button>
             <h2 className="text-xl font-black mb-6 text-blue-500 flex items-center gap-2 italic uppercase tracking-tighter">
                <Clock className="w-6 h-6" /> Новая смена
             </h2>
             
             <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-black text-white/30 mb-1 block">Выберите сотрудника</label>
                  <select 
                    value={selectedWorkerId} 
                    onChange={e => setSelectedWorkerId(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    <option value="">Не выбрано...</option>
                    {workers.filter(w => !activeShifts.some(as => as.worker_id === w.id)).map(worker => (
                      <option key={worker.id} value={worker.id}>{worker.name} ({worker.role})</option>
                    ))}
                  </select>
                  {workers.filter(w => !activeShifts.some(as => as.worker_id === w.id)).length === 0 && (
                    <p className="text-[10px] text-yellow-500/60 mt-2 italic px-1">Все сотрудники уже на смене или список пуст</p>
                  )}
               </div>

               <button 
                 onClick={handleStart}
                 disabled={!selectedWorkerId}
                 className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-white/5 disabled:text-white/20 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
               >
                 <Play className="w-4 h-4 fill-current" /> НАЧАТЬ РАБОТАТЬ
               </button>
             </div>
          </div>
        </div>
      )}

      {isZReportOpen && <ZReportModal onClose={() => setIsZReportOpen(false)} />}
    </div>
  );
}
