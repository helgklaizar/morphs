"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Package, X, GripHorizontal } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useInventoryStore, InventoryItem } from "@/store/useInventoryStore";
import { InventoryItemModal } from "./components/InventoryItemModal";
import { QuantityModal } from "./components/QuantityModal";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function InventoryPage() {
  const { categories, isLoading, fetchInventory, subscribeToInventory, unsubscribeFromInventory, updateItemQuantity, toggleCategoryVisibility, addCategory, deleteCategory, reorderCategories } = useInventoryStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isAddCatModalOpen, setAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  
  const [editItemModal, setEditItemModal] = useState<{isOpen: boolean, item: InventoryItem | null, catId: string}>({isOpen: false, item: null, catId: ""});
  const [qtyModalItem, setQtyModalItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{id: string, name: string} | null>(null);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setAddCatModalOpen(false);
    setNewCatName("");
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setConfirmDeleteCat({ id, name });
  };

  useEffect(() => {
    setIsMounted(true);
    fetchInventory();
    subscribeToInventory();
    return () => unsubscribeFromInventory();
  }, [fetchInventory, subscribeToInventory, unsubscribeFromInventory]);

  if (!isMounted) return null;

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    reorderCategories(result.source.index, result.destination.index);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Склад</h1>
          <p className="text-sm text-muted-foreground mt-1">Управление запасами и категориями</p>
        </div>
        <button 
          onClick={() => setAddCatModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Категория
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        {isLoading && categories.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center absolute inset-0">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xl font-semibold text-gray-500">Загрузка склада...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center absolute inset-0">
            <Package className="h-16 w-16 text-[#2A2A2A] mb-4" />
            <p className="text-xl font-semibold text-gray-500">Нет категорий склада.</p>
            <p className="text-sm text-gray-600">Создайте первую!</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="COLUMN">
              {(provided) => (
                <div 
                  className="flex gap-4 h-full items-start"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {categories.map((col, index) => (
                    <Draggable key={col.id} draggableId={col.id} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          className="w-[320px] flex-shrink-0 bg-[#1A1A1A] rounded-xl border border-white/5 flex flex-col max-h-full"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          {/* Header */}
                          <div className="p-3 border-b border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 p-1 -ml-1"
                                  {...provided.dragHandleProps}
                                >
                                  <GripHorizontal className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-base">{col.name}</h3>
                              </div>
                              <button 
                                onClick={() => handleDeleteCategory(col.id, col.name)}
                                className="text-white/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-white/60 pl-7">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={col.isVisibleInAssemblies} 
                                  onChange={(e) => toggleCategoryVisibility(col.id, 'is_visible_in_assemblies', e.target.checked)}
                                  className="accent-orange-500 rounded bg-white/10 border-transparent focus:ring-0" 
                                />
                                📦 Сборки
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={col.isVisibleInRecipe} 
                                  onChange={(e) => toggleCategoryVisibility(col.id, 'is_visible_in_recipe', e.target.checked)}
                                  className="accent-orange-500 rounded bg-white/10 border-transparent focus:ring-0" 
                                />
                                📋 Рецепт
                              </label>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {col.items.map(item => (
                              <div key={item.id} className="bg-[#242424] rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <span 
                                    onClick={() => setEditItemModal({isOpen: true, item, catId: col.id})} 
                                    className="font-bold text-sm leading-tight hover:underline cursor-pointer"
                                  >
                                    {item.name}
                                  </span>
                                  <span className="text-[11px] text-white/40 whitespace-nowrap ml-2">{item.price} ₪/{item.unit}</span>
                                </div>
                                <div className="flex items-center">
                                  <button 
                                    onClick={() => updateItemQuantity(item.id, Math.max(0, item.quantity - 1))}
                                    className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                  >
                                    —
                                  </button>
                                  <div 
                                    onClick={() => setQtyModalItem(item)}
                                    className="w-14 text-center font-bold text-base bg-white/5 py-1 rounded mx-2 cursor-pointer hover:bg-white/10 transition-colors"
                                  >
                                    {item.quantity}
                                  </div>
                                  <button 
                                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                    className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                  >
                                    +
                                  </button>
                                  <div className="ml-auto text-xs text-white/40">{item.unit}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Item Button */}
                          <div className="p-2 border-t border-white/5">
                            <button 
                              onClick={() => setEditItemModal({isOpen: true, item: null, catId: col.id})}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white/80"
                            >
                              <Plus className="w-4 h-4" />
                              Добавить товар
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setAddCatModalOpen(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setAddCatModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">Новая категория</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Название категории</label>
                <input 
                  type="text"
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 transition-colors"
                  placeholder="Например: Соусы"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                />
              </div>
              <button 
                onClick={handleAddCategory}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-sm transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      <InventoryItemModal 
        isOpen={editItemModal.isOpen} 
        onClose={() => setEditItemModal({isOpen: false, item: null, catId: ""})} 
        item={editItemModal.item} 
        categoryId={editItemModal.catId} 
      />
      
      <QuantityModal 
        isOpen={qtyModalItem !== null} 
        onClose={() => setQtyModalItem(null)} 
        item={qtyModalItem} 
      />

      {confirmDeleteCat && (
        <ConfirmModal
          title="Удалить категорию?"
          message={`Точно удалить категорию "${confirmDeleteCat.name}" со всеми товарами?`}
          onConfirm={() => deleteCategory(confirmDeleteCat.id)}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}
    </div>
  );
}
