"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Phone, 
  Briefcase, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Search
} from "lucide-react";
import { useWorkersStore, Worker } from "@/store/useWorkersStore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function WorkersPage() {
  const { workers, isLoading, fetchWorkers, addWorker, updateWorker, deleteWorker, subscribeToWorkers, unsubscribeFromWorkers } = useWorkersStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  useEffect(() => {
    fetchWorkers();
    subscribeToWorkers();
    return () => unsubscribeFromWorkers();
  }, [fetchWorkers, subscribeToWorkers, unsubscribeFromWorkers]);

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      role: formData.get("role") as string,
      hourly_rate: parseFloat(formData.get("hourly_rate") as string),
      phone: formData.get("phone") as string,
      status: formData.get("status") as string,
    };

    if (editingWorker) {
      await updateWorker(editingWorker.id, data);
    } else {
      await addWorker(data);
    }
    
    setIsModalOpen(false);
    setEditingWorker(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Сотрудники</h1>
          <p className="text-muted-foreground">Управление персоналом и ставками</p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/workers/playbook" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold transition-all hover:bg-white/10 shadow-sm active:scale-[0.98]">
            Методичка (Трелло)
          </Link>
          
          <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingWorker(null);
        }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B00] text-white font-bold transition-all hover:bg-[#FF8533] shadow-lg shadow-orange-500/20 active:scale-[0.98]">
              <Plus className="w-5 h-5" /> Добавить сотрудника
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/5 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingWorker ? 'Редактировать сотрудника' : 'Новый сотрудник'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">ФИО</label>
                <input name="name" defaultValue={editingWorker?.name} required className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Должность</label>
                  <input name="role" defaultValue={editingWorker?.role} required className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Ставка (₪/час)</label>
                  <input name="hourly_rate" type="number" step="0.1" defaultValue={editingWorker?.hourly_rate} required className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Телефон</label>
                <input name="phone" defaultValue={editingWorker?.phone} className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase">Статус</label>
                <select name="status" defaultValue={editingWorker?.status || "active"} className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 focus:outline-none focus:border-orange-500/50">
                  <option value="active">Активен</option>
                  <option value="on_leave">В отпуске</option>
                  <option value="inactive">Уволен</option>
                </select>
              </div>
              <DialogFooter className="pt-4">
                <button type="submit" className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-all">
                  Сохранить
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 bg-[#141414] border border-white/5 rounded-2xl p-2 pl-4">
        <Search className="w-5 h-5 text-neutral-500" />
        <input 
          type="text" 
          placeholder="Поиск по имени или должности..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none py-2 text-sm focus:outline-none focus:ring-0"
        />
        <div className="px-4 py-2 bg-black/20 rounded-xl text-xs font-medium text-neutral-500 border border-white/5">
          Всего: {workers.length}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center bg-[#141414] rounded-3xl border border-white/5">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkers.map(worker => (
            <div key={worker.id} className="group bg-[#141414] border border-white/5 rounded-3xl p-6 hover:border-orange-500/30 transition-all relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => {
                    setEditingWorker(worker);
                    setIsModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white/2 hover:bg-white/10 text-neutral-400 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Удалить сотрудника ${worker.name}?`)) deleteWorker(worker.id);
                  }}
                  className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500/50 hover:text-red-500 transition-all shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-2xl font-bold">
                  {worker.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <h3 className="text-lg font-bold truncate group-hover:text-orange-500 transition-colors uppercase tracking-tight">{worker.name}</h3>
                  <div className="flex items-center gap-2 mt-1 px-2 py-0.5 rounded-lg bg-orange-500/10 w-fit">
                    <Briefcase className="w-3 h-3 text-orange-500" />
                    <span className="text-[10px] font-black text-orange-500 uppercase">{worker.role}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 group-hover:border-orange-500/10 transition-colors">
                  <div className="flex items-center gap-3 text-neutral-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Ставка</span>
                  </div>
                  <span className="text-lg font-black text-white">{worker.hourly_rate} ₪/час</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/5 group-hover:border-orange-500/10 transition-colors">
                  <div className="flex items-center gap-3 text-neutral-400">
                    <Phone className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Телефон</span>
                  </div>
                  <span className="text-xs font-bold text-white">{worker.phone || 'Нет данных'}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-white/5 pt-4 flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  worker.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : worker.status === 'on_leave' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-neutral-800 text-neutral-500'
                }`}>
                  {worker.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {worker.status === 'active' ? 'Работает' : worker.status === 'on_leave' ? 'Отпуск' : 'Неактивен'}
                </div>
                <span className="text-[10px] text-neutral-600 font-bold uppercase">Добавлен {new Date(worker.created).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
