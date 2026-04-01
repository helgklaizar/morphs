"use client";

import { useState } from "react";
import { Plus, Edit3, Grid3X3, Trash2 } from "lucide-react";

import { useAssembliesStore, Assembly } from "@/store/useAssembliesStore";
import { useInventoryStore } from "@/store/useInventoryStore";
import { AssemblyEditModal } from "./components/AssemblyEditModal";
import { useEffect } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function AssembliesPage() {
  const { assemblies, isLoading, fetchAssemblies, subscribeToAssemblies, unsubscribeFromAssemblies, deleteAssembly } = useAssembliesStore();
  const { fetchInventory } = useInventoryStore();

  const [editingAssembly, setEditingAssembly] = useState<{isOpen: boolean, assembly: Assembly | null}>({isOpen: false, assembly: null});
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    fetchAssemblies();
    fetchInventory();
    subscribeToAssemblies();
    return () => unsubscribeFromAssemblies();
  }, [fetchAssemblies, fetchInventory, subscribeToAssemblies, unsubscribeFromAssemblies]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Сборки</h1>
          <p className="text-sm text-muted-foreground mt-1">Комплекты хоз-товаров</p>
        </div>
        <button 
          onClick={() => setEditingAssembly({isOpen: true, assembly: null})}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading && assemblies.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка...</p>
          </div>
        ) : assemblies.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <Grid3X3 className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Сборок пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assemblies.map(assembly => (
              <div key={assembly.id} className="flex flex-col bg-[#141414] rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center px-4 py-3.5 bg-blue-500/10 border-b border-blue-500/10">
                  <Grid3X3 className="w-5 h-5 text-blue-500 mr-3" />
                  <h3 className="font-bold text-base flex-1 truncate">{assembly.name}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingAssembly({isOpen: true, assembly})} className="text-blue-500 hover:text-blue-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg bg-white/5">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => {
                      setConfirmDelete({ id: assembly.id, name: assembly.name });
                    }} className="text-red-500 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg bg-white/5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col flex-1 p-4">
                  <span className="text-xs text-white/40 mb-2">Состав сборки:</span>
                  <div className="flex-1 space-y-1">
                    {assembly.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-white/80 truncate pr-2">{item.name}</span>
                        <span className="text-white/50 text-xs shrink-0">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="px-4 py-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-white/40">Итого:</span>
                  <span className="text-blue-500 font-bold">{assembly.totalCost.toFixed(2)} ₪</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssemblyEditModal 
        isOpen={editingAssembly.isOpen} 
        onClose={() => setEditingAssembly({isOpen: false, assembly: null})} 
        assembly={editingAssembly.assembly} 
      />

      {confirmDelete && (
        <ConfirmModal
          title="Удалить сборку?"
          message={`Точно удалить сборку "${confirmDelete.name}"? Это действие необратимо.`}
          onConfirm={() => deleteAssembly(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
