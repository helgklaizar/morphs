import { useState } from "react";
import { Plus, Package, Trash2, FolderOpen, X } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { 
  useInventoryQuery, 
  useInventoryCategoriesQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useCreateInventoryCategoryMutation,
  useDeleteInventoryCategoryMutation,
  useToastStore,
  inventoryItemSchema
} from "@rms/core";
import type { InventoryItem, InventoryCategory } from "@rms/types";
import { MenuSharedHeader } from "@/components/MenuSharedHeader";


export default function InventoryPage() {

  const { data: categories = [] } = useInventoryCategoriesQuery();
  const { data: items = [], isLoading } = useInventoryQuery();

  const createItemMut = useCreateInventoryItemMutation();
  const updateItemMut = useUpdateInventoryItemMutation();
  const deleteItemMut = useDeleteInventoryItemMutation();

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  const toast = useToastStore();

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        await updateItemMut.mutateAsync({ id: data.id, data });
      } else {
        await createItemMut.mutateAsync(data);
      }
      setIsModalOpen(false);
      toast.success("Данные обновлены");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredItems = selectedCat === 'all'
    ? items
    : selectedCat === 'uncategorized'
    ? items.filter(i => !i.categoryId)
    : items.filter(i => i.categoryId === selectedCat);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MenuSharedHeader />

      <div className="flex items-center justify-between gap-4 pb-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 flex-1 min-w-0">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors shrink-0 ${selectedCat === 'all' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
          >
            Все ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors shrink-0 ${selectedCat === cat.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              {cat.name} ({items.filter(i => i.categoryId === cat.id).length})
            </button>
          ))}
          <button
            onClick={() => setSelectedCat('uncategorized')}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap uppercase tracking-wider transition-colors shrink-0 ${selectedCat === 'uncategorized' ? 'bg-white/20 text-white shadow-lg' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
          >
            Без категории ({items.filter(i => !i.categoryId).length})
          </button>
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors shrink-0"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-orange-500/20 uppercase tracking-[0.2em] shrink-0"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-20 opacity-20"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/></div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/10">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold tracking-[0.3em] uppercase text-xs">Склад пуст</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className="bg-[#141414] border border-white/5 rounded-2xl p-5 hover:border-orange-500/30 transition-all group flex flex-col justify-between cursor-pointer" 
                onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors uppercase tracking-tight">{item.name}</h3>
                    <div className="flex bg-neutral-800 text-neutral-400 text-[10px] px-2 py-1 rounded font-black shrink-0 uppercase tracking-widest">{item.unit}</div>
                  </div>
                  {item.category && (
                    <span className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.2em]">{item.category.name}</span>
                  )}
                  <div className="flex gap-6 mt-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Запас</span>
                      <span className={`text-xl font-black tabular-nums ${item.stock <= item.minStock ? 'text-red-500' : 'text-neutral-200'}`}>{item.stock}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-1">Себест.</span>
                      <span className="text-xl font-black text-neutral-500 tabular-nums">{item.costPerUnit} <span className="text-[10px]">₪</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                   <span className="text-[10px] text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-all tracking-widest uppercase">Изменить</span>
                   <button 
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: item.id, name: item.name }); }} 
                    className="p-2 -m-2 text-white/10 hover:text-red-500 transition-colors"
                   >
                    <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <InventoryModal
          item={editingItem}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          isSaving={createItemMut.isPending || updateItemMut.isPending}
        />
      )}

      {isCatModalOpen && (
        <InventoryCategoriesModal
          categories={categories}
          onClose={() => setIsCatModalOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Списать ингредиент?"
          message={`Точно удалить "${confirmDelete.name}"? Это действие может повлиять на расчет себестоимости рецептов.`}
          onConfirm={async () => {
             await deleteItemMut.mutateAsync(confirmDelete.id);
             setConfirmDelete(null);
             toast.success("Ингредиент удален");
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function InventoryModal({ item, categories, onClose, onSave, isSaving }: {
  item: InventoryItem | null;
  categories: InventoryCategory[];
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(item?.name || "");
  const [unit, setUnit] = useState(item?.unit || "кг");
  const [stock, setStock] = useState(item?.stock?.toString() || "0");
  const [cost, setCost] = useState(item?.costPerUnit?.toString() || "0");
  const [minStock, setMinStock] = useState(item?.minStock?.toString() || "0");
  const [categoryId, setCategoryId] = useState(item?.categoryId || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      id: item?.id,
      name: name.trim(),
      unit,
      stock: parseFloat(stock) || 0,
      costPerUnit: parseFloat(cost) || 0,
      minStock: parseFloat(minStock) || 0,
      categoryId: categoryId || null,
    };

    const validation = inventoryItemSchema.safeParse(payload);
    if (!validation.success) {
      alert("Ошибка: " + validation.error.format().name?._errors[0]);
      return;
    }

    onSave(validation.data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#111] w-full max-w-sm rounded-3xl border border-white/10 shadow-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
        <h2 className="text-xl font-black mb-8 uppercase tracking-widest">{item ? 'Изменить данные' : 'Новое поступление'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Название ингредиента</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Категория хранения</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                <option value="">— Без категории —</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Ед. изм.</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                  <option value="кг">Килограмм (кг)</option>
                  <option value="л">Литр (л)</option>
                  <option value="шт">Штука (шт)</option>
                  <option value="упак">Упаковка</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Себест. (₪)</label>
                <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">На складе</label>
                <input type="number" step="0.01" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Крит. лимит</label>
                <input type="number" step="0.01" value={minStock} onChange={e => setMinStock(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black rounded-2xl bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-widest text-white/50">Отмена</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-4 text-xs font-black rounded-2xl bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-xl shadow-orange-500/10 uppercase tracking-widest">
              {isSaving ? '⏳' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InventoryCategoriesModal({ categories, onClose }: {
  categories: InventoryCategory[];
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const createCatMut = useCreateInventoryCategoryMutation();
  const deleteCatMut = useDeleteInventoryCategoryMutation();

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createCatMut.mutateAsync({ name: newName.trim() });
    setNewName("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#111] w-full max-w-sm rounded-3xl border border-white/10 shadow-3xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black uppercase tracking-widest">Категории</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2 mb-8 max-h-64 overflow-auto custom-scrollbar pr-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-white/5 px-5 py-4 rounded-2xl border border-white/5 group">
              <span className="font-bold text-sm uppercase tracking-tight">{cat.name}</span>
              <button 
                onClick={() => deleteCatMut.mutate(cat.id)} 
                className="text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-white/10 text-xs text-center py-8 uppercase tracking-[0.3em]">Пусто</p>}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Название..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button 
            onClick={handleAdd} 
            disabled={createCatMut.isPending}
            className="w-12 h-12 flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition-all shadow-lg shadow-orange-500/10"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

