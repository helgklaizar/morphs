"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Box, Plus, Settings, ShoppingCart, Trash2, X } from "lucide-react";
import { useSuppliersStore, Supplier } from "@/store/useSuppliersStore";
import { useSupplierProductsStore } from "@/store/useSupplierProductsStore";
import { SupplierEditModal } from "./SupplierEditModal";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  id: string;
  onBack: () => void;
}

export function SupplierDetails({ id, onBack }: Props) {
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  const { products, orders, fetchProducts, fetchOrders, addProduct, deleteProduct, createOrder } = useSupplierProductsStore();
  
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

  const supplier = suppliers.find(s => s.id === id);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts(id);
    fetchOrders(id);
  }, [id, fetchSuppliers, fetchProducts, fetchOrders]);

  if (!supplier) return <div className="p-8 text-white/50 animate-pulse">Загрузка...</div>;

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-sm text-white/50">{supplier.address} {supplier.phone && `• ${supplier.phone}`}</p>
        </div>
        <button onClick={() => setEditingSupplier(supplier)} className="p-2 border border-white/10 rounded-xl hover:bg-white/5 transition flex items-center gap-2 px-4 shadow-sm bg-black">
          <Settings className="w-4 h-4" /> Настройки
        </button>
      </div>

      <div className="flex bg-black/50 p-1 rounded-xl w-max mb-6 border border-white/5 font-semibold text-sm">
        <button onClick={() => setTab('products')} className={`px-5 py-2 rounded-lg transition-colors ${tab === 'products' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'}`}>
          Продукты
        </button>
        <button onClick={() => setTab('orders')} className={`px-5 py-2 rounded-lg transition-colors ${tab === 'orders' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'}`}>
          История заказов
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-10">
        {tab === 'products' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-lg font-bold">Список товаров</h2>
               <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 font-bold transition">
                  <Plus className="w-4 h-4" /> Добавить
               </button>
            </div>
            
            {products.length === 0 ? (
              <div className="p-10 text-center text-white/40 border border-white/5 rounded-2xl flex flex-col items-center">
                <Box className="w-12 h-12 mb-3 text-white/10" />
                <p>У данного поставщика пока нет продуктов</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map(p => (
                  <div key={p.id} className="bg-[#1C1C1C] rounded-2xl p-4 border border-white/5 hover:border-white/20 transition flex flex-col h-full">
                     <h3 className="font-bold text-sm mb-2 leading-tight flex-1">{p.supplierName}</h3>
                     <div className="flex flex-wrap gap-1 mb-4 shrink-0">
                        {Object.entries(p.prices || {}).map(([unit, price]) => (
                           <span key={unit} className="text-[10px] bg-white/5 px-2 py-1 rounded text-white/70">
                              {unit}: {price}₪
                           </span>
                        ))}
                     </div>
                     <div className="flex gap-2 shrink-0">
                        <button className="flex-1 text-xs border border-orange-500/30 text-orange-500 rounded-lg py-1.5 font-bold hover:bg-orange-500/10">В корзину</button>
                        <button onClick={() => setConfirmDelete({ id: p.id, name: p.supplierName })} className="w-8 h-8 flex justify-center items-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 shrink-0"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-2">История заказов</h2>
            {orders.length === 0 ? (
              <div className="p-10 text-center text-white/40 border border-white/5 rounded-2xl flex flex-col items-center">
                <ShoppingCart className="w-12 h-12 mb-3 text-white/10" />
                <p>Истории заказов пока нет</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl">
                {orders.map(o => (
                  <div key={o.id} className="bg-[#1C1C1C] rounded-xl p-4 border border-white/5 flex gap-4 pr-6 shrink-0 text-left">
                     <ShoppingCart className="text-white/20 shrink-0" />
                     <div className="flex-1">
                        <h4 className="font-bold mb-1">Заказ от {new Date(o.createdAt).toLocaleString()}</h4>
                        <div className="text-xs text-white/60 mb-2">Отправлено: {o.sentVia} • Статус: {o.status}</div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <SupplierEditModal isOpen={editingSupplier !== null} onClose={() => setEditingSupplier(null)} supplier={editingSupplier} />

      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAddProduct(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowAddProduct(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6">Новый товар</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Название товара</label>
                <input 
                  type="text" 
                  value={newProductName} 
                  onChange={e => setNewProductName(e.target.value)} 
                  className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5" 
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => {
                  if (newProductName.trim()) {
                    addProduct({ supplierId: id, supplierName: newProductName.trim(), prices: {"шт": 0} });
                    setNewProductName("");
                    setShowAddProduct(false);
                  }
                }} 
                className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить товар?"
          message={`Точно удалить товар "${confirmDelete.name}"?`}
          onConfirm={() => deleteProduct(confirmDelete.id, id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
