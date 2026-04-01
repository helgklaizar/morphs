"use client";

import { useState, useEffect } from "react";
import { Plus, User, ChevronRight, Trash2, X } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function ClientsPage() {
  const { clients, isLoading, fetchClients, subscribeToClients, unsubscribeFromClients, addClient, deleteClient } = useClientsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchClients();
    subscribeToClients();
    return () => unsubscribeFromClients();
  }, [fetchClients, subscribeToClients, unsubscribeFromClients]);

  const handleAdd = async () => {
    if (newName && newPhone) {
      await addClient({ name: newName.trim(), phone: newPhone.trim(), address: '' });
      setShowAddModal(false);
      setNewName("");
      setNewPhone("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Клиенты</h1>
          <p className="text-sm text-muted-foreground mt-1">База клиентов и статистика</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-4xl">
        {isLoading && clients.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка клиентов...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <User className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Нет клиентов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(client => (
              <div key={client.id} className="flex items-center p-4 bg-[#1C1C1C] rounded-xl border border-white/5 hover:bg-[#242424] transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center mr-4 shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 flex flex-col justify-center pr-4">
                  <h3 className="font-bold text-base leading-tight mb-1">{client.name}</h3>
                  <div className="text-sm text-white/60 leading-snug">
                    <div>{client.phone}</div>
                    <div className="truncate">{client.address}</div>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId({ id: client.id, name: client.name });
                  }}
                  className="p-2 mr-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Новый клиент</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Имя</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Телефон</label>
                <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button onClick={handleAdd} className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Удалить клиента?"
          message={`Точно удалить клиента "${confirmDeleteId.name}"? Это действие нельзя отменить.`}
          onConfirm={() => deleteClient(confirmDeleteId.id)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
