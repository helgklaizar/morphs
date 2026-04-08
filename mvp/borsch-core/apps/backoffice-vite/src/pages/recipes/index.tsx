import { useState } from "react";
import { Plus, BookOpen, Trash2, Edit2, X, PlusCircle } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { 
  useRecipesQuery, 
  useInventoryQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
  useToastStore,
  recipeSchema
} from "@rms/core";
import { MenuSharedHeader } from "@/components/MenuSharedHeader";

export default function RecipesPage() {
  const { data: recipes = [], isLoading: recipesLoading } = useRecipesQuery();
  const { data: inventory = [], isLoading: invLoading } = useInventoryQuery();

  const createMut = useCreateRecipeMutation();
  const updateMut = useUpdateRecipeMutation();
  const deleteMut = useDeleteRecipeMutation();
  const toast = useToastStore();

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        await updateMut.mutateAsync({ id: data.id, payload: data });
      } else {
        await createMut.mutateAsync(data);
      }
      setIsModalOpen(false);
      toast.success("Рецепт сохранен");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <MenuSharedHeader />
      
      <div className="flex items-center justify-between pb-6 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-black uppercase tracking-widest text-white/90">Книга рецептов</h2>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">Нормы списания и состав блюд</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-2xl text-[11px] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5 uppercase tracking-widest"
        >
          <PlusCircle className="w-4 h-4" /> Создать техкарту
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-10">
        {recipesLoading || invLoading ? (
          <div className="flex justify-center py-20 opacity-20"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/></div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/5 border border-dashed border-white/5 rounded-3xl">
            <BookOpen className="w-20 h-20 mb-4 opacity-50" />
            <p className="font-black tracking-[0.4em] uppercase text-xs">Нет активных рецептов</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {recipes.map((r: any) => (
              <div key={r.id} className="bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 group flex flex-col justify-between hover:border-white/10 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black text-xl leading-tight group-hover:text-orange-500 transition-colors uppercase tracking-tight">{r.name}</h3>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                      <span className="text-[10px] font-black text-white/40 uppercase">Выход:</span>
                      <span className="text-xs font-black text-white">{r.yield}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {r.ingredients?.map((ing: any) => (
                      <div key={ing.id} className="flex justify-between items-center group/ing">
                        <span className="text-xs font-bold text-white/40 group-hover/ing:text-white/60 transition-colors">{ing.inventoryItem?.name}</span>
                        <div className="h-[1px] flex-1 mx-4 bg-white/[0.03] border-t border-dashed border-white/5" />
                        <span className="text-xs font-black text-white/80 tabular-nums">{ing.quantity} <span className="text-[10px] text-white/20 ml-1">{ing.inventoryItem?.unit}</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingItem(r); setIsModalOpen(true); }} 
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Edit2 className="w-3 h-3 text-white/40"/>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Правка</span>
                    </button>
                    <button 
                      onClick={() => setConfirmDelete({ id: r.id, name: r.name })} 
                      className="p-2 text-white/10 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <RecipeModal
          item={editingItem}
          inventory={inventory}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
        />
      )}

      {confirmDelete && (
        <ConfirmModal 
          title="Архивировать рецепт?" 
          message={`Точно удалить "${confirmDelete.name}"? Это действие необратимо и повлияет на расчет складских остатков.`} 
          onConfirm={async () => {
            await deleteMut.mutateAsync(confirmDelete.id);
            setConfirmDelete(null);
            toast.success("Рецепт удален");
          }} 
          onCancel={() => setConfirmDelete(null)} 
        />
      )}
    </div>
  );
}

function RecipeModal({ item, inventory, onClose, onSave, isSaving }: any) {
  const [name, setName] = useState(item?.name || "");
  const [recipeYield, setRecipeYield] = useState(item?.yield?.toString() || "1");
  const [ingredients, setIngredients] = useState<any[]>(
    item?.ingredients?.map((ing: any) => ({
      inventoryItemId: ing.inventoryItemId,
      quantity: ing.quantity,
      id: ing.id // To keep track if editing
    })) || []
  );

  const addIngredient = () => {
    setIngredients([...ingredients, { inventoryItemId: "", quantity: 0 }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setIngredients(newIngs);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const payload = {
      id: item?.id,
      name,
      yield: parseFloat(recipeYield) || 1,
      ingredients: ingredients.filter(i => i.inventoryItemId && i.quantity > 0)
    };

    const val = recipeSchema.safeParse(payload);
    if (!val.success) {
      alert("Ошибка: " + val.error.errors[0].message);
      return;
    }

    onSave(val.data);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#050505] w-full max-w-lg rounded-[3rem] border border-white/10 shadow-3xl p-10 max-h-[90vh] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600" />
        
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-widest">{item ? 'Редактор техкарты' : 'Новый рецепт'}</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="space-y-8 overflow-auto custom-scrollbar pr-4 flex-1 pb-10">
            <div className="grid grid-cols-4 gap-6">
              <div className="col-span-3">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Название блюда</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Выход</label>
                <input required type="number" step="0.1" value={recipeYield} onChange={e => setRecipeYield(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-center focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end mb-4">
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Состав и граммовки</label>
                <button type="button" onClick={addIngredient} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400">+ Добавить</button>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center group/item animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="col-span-7">
                    <select 
                      value={ing.inventoryItemId} 
                      onChange={e => updateIngredient(idx, 'inventoryItemId', e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3.5 text-xs focus:outline-none focus:border-orange-500 appearance-none"
                    >
                      <option value="">Выбрать продукт...</option>
                      {inventory.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      step="0.001" 
                      value={ing.quantity} 
                      onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                      className="w-full bg-white/10 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-black text-center focus:outline-none focus:border-orange-500" 
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button type="button" onClick={() => removeIngredient(idx)} className="p-2 text-white/10 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
              
              {ingredients.length === 0 && (
                <div className="text-center py-10 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                   <p className="text-[10px] font-black text-white/20 uppercase tracking-widest uppercase">Список пуст</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-8 mt-4 border-t border-white/5 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-5 text-xs font-black rounded-[1.5rem] bg-white/5 hover:bg-white/10 transition-colors uppercase tracking-widest text-white/50">Отмена</button>
            <button 
              type="submit" 
              disabled={isSaving} 
              className="flex-2 py-5 px-10 text-xs font-black rounded-[1.5rem] bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-2xl shadow-orange-600/20 uppercase tracking-[0.2em]"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить техкарту'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

