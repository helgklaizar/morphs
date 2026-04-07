"use client";

import { useEffect, useState } from "react";
import { useOrdersQuery, useInventoryStore, useMenuStore, useRecipesStore } from "@rms/core";
import { ShoppingCart, Package, ArrowRight, Truck, BrainCircuit, ListOrdered } from "lucide-react";
import { MenuSharedHeader } from "@/components/MenuSharedHeader";

export default function PurchasesPage() {
  const { items: inventoryItems, fetchInventory, suppliers, supplierProducts, supplierOrders, fetchSuppliers } = useInventoryStore();
  const { data: orders = [] } = useOrdersQuery();
  const { items: menuItems, fetchMenuItems } = useMenuStore();
  const { recipes, fetchRecipes } = useRecipesStore();

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchSuppliers();
    fetchMenuItems();
    fetchRecipes();
  }, [fetchInventory, fetchSuppliers, fetchMenuItems, fetchRecipes]);

  const handleGenerateOrders = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Calculate Required amounts based on ALL active orders
      const requiredAmounts: Record<string, number> = {};
      
      const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && !o.is_archived);
      
      activeOrders.forEach(o => {
         if (!o.items) return;
         o.items.forEach((orderItem: any) => {
             const menuItem = menuItems.find(m => m.id === orderItem.menuItemId);
             if (!menuItem || !menuItem.recipeId) return;
             
             const recipe = recipes.find(r => r.id === menuItem.recipeId);
             if (recipe && recipe.ingredients) {
                const portions = recipe.portions || 1;
                const multiplier = orderItem.quantity / portions;
                
                recipe.ingredients.forEach(ing => {
                   if (ing.inventoryItemId) {
                      requiredAmounts[ing.inventoryItemId] = (requiredAmounts[ing.inventoryItemId] || 0) + (ing.quantity * multiplier);
                   }
                });
             }
         });
      });

      // 2. Identify deficiences grouped by Supplier
      const newSupplierDrafts: Record<string, { id: string, name: string, quantity: number, price: number }[]> = {};
      
      for (const [invId, requiredQty] of Object.entries(requiredAmounts)) {
         const invObj = inventoryItems.find((i: any) => i.id === invId);
         if (!invObj) continue;

         const currentStock = invObj.quantity || 0;
         const deficit = requiredQty - currentStock;

         // We only order if deficit is > 0 (or you could set a buffer like deficit + 10)
         if (deficit > 0) {
             const supProd = supplierProducts.find(sp => sp.inventoryItemId === invId);
             let supplierId = supProd?.supplierId;

             if (!supplierId && invObj.supplier) {
                const sup = suppliers.find(s => s.name.toLowerCase() === invObj.supplier?.toLowerCase());
                if (sup) supplierId = sup.id;
             }

             // If still no supplier found, map to a phantom "Unknown" supplier or ignore.
             // For now, let's group to 'unknown' if no supplier.
             const finalSupplierId = supplierId || 'unknown';

             if (!newSupplierDrafts[finalSupplierId]) {
                 newSupplierDrafts[finalSupplierId] = [];
             }
             
             newSupplierDrafts[finalSupplierId].push({
                 id: invId,
                 name: invObj.name || 'Товар',
                 quantity: Number(deficit.toFixed(2)),
                 price: invObj.price || 0 
             });
         }
      }

      const draftsCount = Object.keys(newSupplierDrafts).length;
      if (draftsCount === 0) {
         alert("Генерация отменена: На складе достаточно ингредиентов для всех активных заказов!");
         setIsGenerating(false);
         return;
      }

      // 3. Create Drafts in DB
      const saveSupplierOrder = useInventoryStore.getState().saveSupplierOrder;
      
      for (const [supId, items] of Object.entries(newSupplierDrafts)) {
         if (supId === 'unknown') continue; // Realistically we should probably warn about unmapped items
         
         const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
         await saveSupplierOrder({
            supplierId: supId,
            status: 'draft',
            items: items,
            totalAmount: totalAmount
         });
      }

      alert(`Успех! Сформировано ${draftsCount} новых черновиков закупок на основе заказов.`);
    } catch (e) {
      console.error(e);
      alert("Ошибка при генерации заказов");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <MenuSharedHeader />
      
      <div className="flex justify-between items-center px-4 py-2 mt-2 -mb-2">
        <span className="text-white/50 text-sm font-bold uppercase">Раздел в разработке...</span>
        <button 
           onClick={handleGenerateOrders}
           disabled={isGenerating}
           className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
         >
           <BrainCircuit className={`w-4 h-4 shrink-0 ${isGenerating ? 'animate-spin' : ''}`} />
           <span className="hidden md:inline">{isGenerating ? 'Вычисляю...' : 'Сгенерировать заказ'}</span>
         </button>
      </div>

      <div className="flex-1 overflow-auto pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suppliers List */}
          <div className="col-span-1 border border-white/10 bg-[#141414] rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Поставщики
            </h2>
            <div className="flex flex-col gap-3">
              {suppliers.map(sup => (
                <div key={sup.id} className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <h3 className="font-black text-lg max-w-[200px] truncate">{sup.name}</h3>
                  <div className="text-xs text-white/40 mt-1">{sup.phone || 'Нет телефона'}</div>
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/60">
                   Товаров привязано: <strong className="text-white">{supplierProducts.filter(sp => sp.supplierId === sup.id).length}</strong>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && <div className="text-white/30 text-sm mt-4">Нет поставщиков</div>}
            </div>
          </div>

          {/* Current / Draft Orders */}
          <div className="col-span-2 border border-white/10 bg-[#141414] rounded-2xl p-6">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Активные ордеры (Черновики)
            </h2>
            
            <div className="flex flex-col gap-4">
              {supplierOrders.length > 0 ? supplierOrders.filter(so => so.status !== 'received').map(order => {
                const sup = suppliers.find(s => s.id === order.supplierId);
                return (
                  <div key={order.id} className="border border-white/10 bg-[#0a0a0a] rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <span className="font-bold text-lg text-emerald-400">{sup?.name || 'Неизвестный поставщик'}</span>
                       <span className="px-3 py-1 bg-white/10 text-white/60 rounded-lg text-xs font-bold uppercase">{order.status}</span>
                    </div>
                    <div className="text-sm text-white/70">
                      Здесь будут позиции, вычисленные алгоритмом... (на сумму {order.totalAmount || 0} ₪)
                    </div>
                    <button className="self-end mt-2 flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold transition-all">
                      Отправить заказ в Telegram <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              }) : (
                <div className="flex flex-col justify-center items-center h-[300px] text-white/30 gap-4">
                   <Truck className="w-16 h-16 opacity-20" />
                   <span>Нет активных заказов поставщикам</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
