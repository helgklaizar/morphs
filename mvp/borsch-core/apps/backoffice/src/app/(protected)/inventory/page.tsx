"use client";

import { useState, useEffect } from "react";
import { useInventoryStore, InventoryItem } from "@rms/core";
import { Plus, Trash2, Edit2, PackageOpen } from "lucide-react";

import { MenuSharedHeader } from "@/components/MenuSharedHeader";
import { InventoryItemModal } from "./components/InventoryItemModal";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function InventoryPage() {
  const { items, categories, fetchInventory, fetchCategories, isLoading, deleteInventoryItem, saveInventoryItem } = useInventoryStore();
  const [editingItem, setEditingItem] = useState<{isOpen: boolean, item: InventoryItem | null}>({isOpen: false, item: null});
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);


  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, [fetchInventory, fetchCategories]);

  // Group items by categoryId
  const itemsByCategory: Record<string, typeof items> = {};
  items.forEach(item => {
    const catId = item.categoryId || "uncategorized";
    if (!itemsByCategory[catId]) itemsByCategory[catId] = [];
    itemsByCategory[catId].push(item);
  });



  return (
    <div className="flex h-full flex-col">
      <MenuSharedHeader />

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 mt-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-full opacity-50">Загрузка склада...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-white/30 gap-4 py-20">
            <PackageOpen className="w-16 h-16 opacity-20" />
            <span>Склад пуст. Добавьте ингредиенты.</span>
          </div>
        ) : (
          <div className="flex gap-4 h-full items-start px-4">
            {categories
              .filter(c => ['мясо', 'овощ', 'специ', 'утварь', 'хоз'].some(n => c.name?.toLowerCase().includes(n)))
              .map(cat => {
                const itemsCount = itemsByCategory[cat.id]?.length || 0;
                // If it's totally empty and NO items exist (not even when hovered), we could hide it.
                // But since we want to be able to drag into empty categories, we should NOT filter out empty ones here!
                // The user earlier asked to hide empty ones, maybe we keep them visible if we want DnD?
                // Wait, if it's completely empty, you can't drag into it if it's hidden!
                // So let's show empty columns so they can be drop targets.
              return (
              <div 
                key={cat.id} 
                className="w-[300px] shrink-0 bg-[#0a0a0a] rounded-2xl border border-white/5 flex flex-col max-h-full transition-colors"
              >
                <div className="p-4 border-b border-white/5 font-black text-lg sticky top-0 bg-[#0a0a0a] z-10 text-white/80 rounded-t-2xl">
                  {cat.name}
                  <span className="ml-2 text-xs font-normal text-white/40 bg-white/5 px-2 py-1 rounded-full">
                    {itemsCount}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-3 min-h-[100px]">
                  {(itemsByCategory[cat.id] || []).map(item => (
                    <div 
                      key={item.id} 
                      className="bg-white/5 hover:bg-white/10 transition-colors border border-white/5 rounded-xl p-3 flex flex-col group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm leading-tight flex-1">{item.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button 
                            onClick={() => setEditingItem({isOpen: true, item})}
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setDeletingItem(item)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-500/50 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                        <span className="text-xs text-white/40">{item.supplier || 'Без поставщика'}</span>
                        <span className="font-black text-blue-400">{item.quantity} {item.unit || 'шт'}</span>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => {
                        // Pass default category
                        setEditingItem({isOpen: true, item: { categoryId: cat.id } as any});
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5 hover:border-white/20 mt-2"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    Добавить
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      <InventoryItemModal 
        isOpen={editingItem.isOpen}
        onClose={() => setEditingItem({isOpen: false, item: null})}
        item={editingItem.item}
      />
      
      {deletingItem && (
        <ConfirmModal
           title="Удалить товар?"
           message={`Точно удалить "${deletingItem.name}" со склада?`}
           onConfirm={() => deleteInventoryItem(deletingItem.id)}
           onCancel={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
}
