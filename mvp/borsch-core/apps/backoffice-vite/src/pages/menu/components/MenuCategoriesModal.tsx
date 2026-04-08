import { useState, useEffect } from "react";
import { X, Plus, GripVertical, Trash2, Edit2, Check, Save } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToastStore, useCategoriesQuery } from '@rms/core';
import { useQueryClient } from "@tanstack/react-query";

interface Category {
  id: string;
  name: string;
}

export function MenuCategoriesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: categories = [], isLoading, refetch } = useCategoriesQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await fetch('http://localhost:3002/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTitle.trim() })
      });
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: ['menu_categories'] });
      refetch();
    } catch (error: any) {
      useToastStore.getState().error("Ошибка при добавлении: " + error.message);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Category>) => {
    try {
      await fetch(`http://localhost:3002/api/menu/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['menu_categories'] });
      refetch();
    } catch (error: any) {
      useToastStore.getState().error("Ошибка: " + error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmDelete({ id, name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await fetch(`http://localhost:3002/api/menu/categories/${confirmDelete.id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['menu_categories'] });
      refetch();
      setConfirmDelete(null);
    } catch (error: any) {
      useToastStore.getState().error("Ошибка при удалении: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Категории меню</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading ? (
            <div className="flex justify-center py-10 opacity-50"><div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/></div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm">Нет категорий. Создайте первую ниже.</div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 bg-[#242424] p-3 rounded-xl border border-white/5 group">
                <GripVertical className="w-4 h-4 text-white/20 cursor-grab active:cursor-grabbing hover:text-white/60 shrink-0" />
                
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-[#1A1A1A] px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-white"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(cat.id, { name: editTitle })}
                    />
                    <button onClick={() => handleUpdate(cat.id, { name: editTitle })} className="p-1.5 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30">
                      <Save className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-white/10 text-white/60 rounded-md hover:bg-white/20">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                       <span className="font-semibold text-sm text-white">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setEditingId(cat.id); setEditTitle(cat.name); }}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add form */}
        <div className="p-5 border-t border-white/5 bg-[#141414] shrink-0 rounded-b-2xl">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Новая категория..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
            />
            <button 
              onClick={handleAdd}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить категорию?"
          message={`Полностью удалить категорию "${confirmDelete.name}"?`}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
