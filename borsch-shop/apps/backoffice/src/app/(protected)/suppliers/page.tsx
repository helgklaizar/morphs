"use client";

import { useState, useEffect } from "react";
import { Plus, Store, Clock, Phone, MapPin, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSuppliersStore, Supplier } from "@/store/useSuppliersStore";
import { SupplierEditModal } from "./components/SupplierEditModal";
import { SupplierDetails } from "./components/SupplierDetails";

export default function SuppliersPage() {
  const router = useRouter();
  const { suppliers, isLoading, fetchSuppliers, subscribeToSuppliers, unsubscribeFromSuppliers } = useSuppliersStore();
  const [editingSupplier, setEditingSupplier] = useState<{isOpen: boolean, supplier: Supplier | null}>({isOpen: false, supplier: null});
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
    subscribeToSuppliers();
    return () => unsubscribeFromSuppliers();
  }, [fetchSuppliers, subscribeToSuppliers, unsubscribeFromSuppliers]);

  if (selectedSupplierId) {
    return <SupplierDetails id={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Поставщики</h1>
          <p className="text-sm text-muted-foreground mt-1">База контактов</p>
        </div>
        <button 
          onClick={() => setEditingSupplier({isOpen: true, supplier: null})}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Поставщик
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading && suppliers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
            <Store className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Нет поставщиков</p>
            <p className="text-sm text-gray-600 mt-2">Нажмите Добавить</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map(sup => (
              <div 
                key={sup.id} 
                onClick={() => setSelectedSupplierId(sup.id)}
                className="cursor-pointer bg-gradient-to-br from-[#1C1C1C] to-[#121212] rounded-2xl border border-white/5 p-4 hover:border-white/20 transition-colors relative group flex flex-col h-full"
              >
                <div className="flex items-center mb-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-500 mr-3 shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base flex-1 pr-6 leading-tight">{sup.name}</h3>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSupplier({isOpen: true, supplier: sup});
                  }}
                  className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                
                <div className="space-y-1.5 mt-4">
                  <div className="flex items-center text-xs">
                    <Clock className="w-3.5 h-3.5 text-white/30 mr-2 shrink-0" />
                    <span className="text-white/50 truncate">{sup.hours}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <Phone className="w-3.5 h-3.5 text-white/30 mr-2 shrink-0" />
                    <span className="text-white/50 truncate">{sup.phone}</span>
                  </div>
                  <div className="flex items-center text-xs">
                    <MapPin className="w-3.5 h-3.5 text-white/30 mr-2 shrink-0" />
                    <span className="text-white/50 truncate">{sup.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SupplierEditModal 
        isOpen={editingSupplier.isOpen} 
        onClose={() => setEditingSupplier({isOpen: false, supplier: null})} 
        supplier={editingSupplier.supplier} 
      />
    </div>
  );
}
