import { useState, useEffect } from "react";
import { X, Plus, Minus, Search } from "lucide-react";
import { Order, OrderItem, useOrdersStore } from "@/store/useOrdersStore";
import { useMenuStore } from "@/store/useMenuStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function OrderEditModal({ isOpen, onClose, order }: Props) {
  const { updateOrderFull } = useOrdersStore();
  const { items: menuItems } = useMenuStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isDelivery, setIsDelivery] = useState(false);
  const [payment, setPayment] = useState("cash");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [search, setSearch] = useState("");
  const [resDateObj, setResDateObj] = useState("");

  useEffect(() => {
    if (isOpen && order) {
      if (order.customerName.includes("(Доставка:")) {
        const parts = order.customerName.split("(Доставка:");
        setName(parts[0].trim());
        setAddress(parts[1].replace(")", "").trim());
        setIsDelivery(true);
      } else {
        setName(order.customerName);
        setAddress("");
        setIsDelivery(false);
      }
      setPhone(order.customerPhone || "");
      setPayment(order.paymentMethod || "cash");
      // deep copy
      setItems(order.items.map(i => ({ ...i })));
      setShowAddItem(false);
      setSearch("");
      
      if (order.reservationDate) {
         const d = new Date(order.reservationDate);
         const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
         setResDateObj(localStr);
      } else {
         setResDateObj("");
      }
    }
  }, [isOpen, order]);

  if (!isOpen || order === null) return null; // Added check for order to satisfy TS

  const handleSave = async () => {
    const finalName = isDelivery ? `${name.trim()} (Доставка: ${address.trim()})` : name.trim();
    const newTotal = items.reduce((sum, item) => sum + (item.priceAtTime || 0) * item.quantity, 0);

    const finalReservationDate = resDateObj ? new Date(resDateObj).toISOString() : undefined;

    await updateOrderFull({
      ...order,
      customerName: finalName,
      customerPhone: phone.trim(),
      paymentMethod: payment,
      items,
      totalAmount: newTotal,
      reservationDate: finalReservationDate,
    });
    onClose();
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity += delta;
    if (newItems[index].quantity <= 0) {
      newItems.splice(index, 1);
    }
    setItems(newItems);
  };

  const currentTotal = items.reduce((sum, item) => sum + (item.priceAtTime || 0) * item.quantity, 0);

  const filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1a1a1a] flex flex-col rounded-2xl w-full max-w-md max-h-[90vh] border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200 overflow-hidden">
        
        {showAddItem ? (
          <div className="flex flex-col h-full bg-[#1e1e1e]">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-[#111]">
              <button onClick={() => setShowAddItem(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold flex-1">Добавить позицию</h3>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-white/30" />
                <input 
                  type="text" placeholder="Поиск блюда..." 
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
               <button 
                  onClick={() => {
                    setItems([...items, { id: Date.now().toString(), menuItemName: "Доставка", quantity: 1, priceAtTime: 30, menuItemId: "delivery" }]);
                    setShowAddItem(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 text-sm flex justify-between font-bold text-orange-400"
                >
                  <span>Доставка (+30 ₪)</span>
                </button>
               <button 
                  onClick={() => {
                    setItems([...items, { id: Date.now().toString(), menuItemName: "Хлеб 🍞", quantity: 1, priceAtTime: 0, menuItemId: null as any }]);
                    setShowAddItem(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 text-sm flex justify-between font-bold text-yellow-500"
                >
                  <span>Хлеб 🍞</span>
                  <span className="text-white/50">Бесплатно</span>
                </button>
               <button 
                  onClick={() => {
                    setItems([...items, { id: Date.now().toString(), menuItemName: "🍴 Приборы", quantity: 1, priceAtTime: 0, menuItemId: null as any }]);
                    setShowAddItem(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 text-sm flex justify-between font-bold text-blue-400"
                >
                  <span>🍴 Приборы</span>
                  <span className="text-white/50">Бесплатно</span>
                </button>
               {filteredMenu.map(m => (
                 <button 
                  key={m.id}
                  onClick={() => {
                    setItems([...items, { id: Date.now().toString(), menuItemName: m.name, quantity: 1, priceAtTime: m.price, menuItemId: m.id }]);
                    setShowAddItem(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 text-sm flex justify-between"
                >
                  <span>{m.name}</span>
                  <span className="text-white/50">{m.price} ₪</span>
                </button>
               ))}
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Редактировать заказ</h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Имя клиента</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 border border-white/5" />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Телефон</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 border border-white/5" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                   <input type="checkbox" id="deliv" checked={isDelivery} onChange={e => setIsDelivery(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                   <label htmlFor="deliv" className="text-sm cursor-pointer">Доставка</label>
                </div>

                {isDelivery && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs text-white/50 mb-1 block">Адрес</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 border border-white/5" />
                  </div>
                )}

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Оплата</label>
                  <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 border border-white/5">
                    <option value="cash">Наличные</option>
                    <option value="bit">Bit / Безнал</option>
                  </select>
                </div>

                <div className="animate-in fade-in zoom-in duration-200">
                  <label className="text-xs text-white/50 mb-1 block">Дата и время заказа</label>
                  <input 
                    type="datetime-local" 
                    value={resDateObj} 
                    onChange={e => setResDateObj(e.target.value)} 
                    className="w-full bg-[#242424] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 border border-white/5" 
                  />
                  <div className="text-[10px] text-white/40 mt-1">Оставьте пустым для "как можно скорее"</div>
                </div>

                <div className="my-6 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">Позиции ({items.length})</h3>
                    <button onClick={() => setShowAddItem(true)} className="text-xs text-orange-500 font-bold bg-orange-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Добавить
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {items.length === 0 && <div className="text-xs text-red-400">Корзина пуста</div>}
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#242424] p-3 rounded-xl border border-white/5">
                        <div className="flex-1 mr-2">
                           <div className="text-sm font-medium leading-tight">{item.menuItemName}</div>
                           <div className="text-[11px] text-white/40 mt-0.5">{(item.priceAtTime || 0)} ₪ x {item.quantity} = {(item.priceAtTime || 0) * item.quantity} ₪</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(i, -1)} className="w-7 h-7 bg-white/5 rounded-md flex items-center justify-center hover:bg-white/10 text-red-400"><Minus className="w-4 h-4"/></button>
                          <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(i, 1)} className="w-7 h-7 bg-white/5 rounded-md flex items-center justify-center hover:bg-white/10 text-green-400"><Plus className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-[#111] p-5 shrink-0 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-white/50">Итого к оплате:</span>
                <span className="text-xl font-bold text-orange-500">{currentTotal.toFixed(0)} ₪</span>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors">
                  Отмена
                </button>
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white shadow-lg shadow-orange-500/20">
                  Сохранить
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
