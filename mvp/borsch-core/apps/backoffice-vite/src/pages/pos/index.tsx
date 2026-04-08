

import { useEffect, useState, useMemo } from "react";
import { 
  PlusCircle, 
  MinusCircle, 
  Trash2, 
  ShoppingBag, 
  User, 
  Phone, 
  CreditCard, 
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { useMenuStore, useCartStore, useToastStore, useCreateOrderMutation } from '@rms/core';
import { useDynamicPricing } from "../../hooks/useDynamicPricing";
import { Table } from "@rms/types";
import { motion, AnimatePresence } from "framer-motion";
import { StoreStatusControls } from "@/components/StoreStatusControls";

const DELIVERY_PRICES: Record<string, number> = {
  "Хайфа": 30,
  "Нешер": 40,
  "Тират Кармель": 40,
  "Кирьят Ям": 50,
  "Кирьят Ата": 50,
  "Кирьят Хаим": 50,
  "Кирьят Моцкин": 50,
  "Кирьят Биялик": 50
};

export default function CheckoutPage() {
  const { categories, items: allMenuItems, fetchMenuItems, isLoading: menuLoading } = useMenuStore();
  const { 
    items: cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    customerName,
    customerPhone,
    paymentMethod,
    setCustomer,
    setPaymentMethod,
    getTotal,
    orderType,
    setOrderType,
    customerAddress,
    toggleBread,
    toggleCutlery,
    wantsBread,
    wantsCutlery
  } = useCartStore();

  const [activeCategory, setActiveCategory] = useState<string | null>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [city, setCity] = useState("Хайфа");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apt, setApt] = useState("");

  const { getDynamicPrice, isPeakTime, isEnabled } = useDynamicPricing();

  const displayTotal = useMemo(() => {
    return getTotal() + (orderType === 'delivery' ? (DELIVERY_PRICES[city] || 30) : 0);
  }, [getTotal, orderType, city]);

  const filteredClients: any[] = [];

  const createOrderMutation = useCreateOrderMutation();

  useEffect(() => {
    fetch('http://localhost:3002/api/tables')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTables(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchMenuItems();
    useMenuStore.getState().fetchCategories();
  }, [fetchMenuItems]);

  const filteredItems = useMemo(() => {
    let items = allMenuItems;
    if (activeCategory && activeCategory !== 'all') {
      items = items.filter(i => i.categoryId === activeCategory);
    }
    if (searchQuery) {
      items = allMenuItems.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return items.filter(i => i.isActive);
  }, [allMenuItems, activeCategory, searchQuery]);

  const handleCreateOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    
    try {
      let extendedCustomerName = customerName || "Гость";
      const typeStr = orderType === 'delivery' ? 'Доставка' : orderType === 'pickup' ? 'Самовывоз' : 'На месте';
      extendedCustomerName += ` [${typeStr}]`;
      
      const formattedAddress = orderType === 'delivery' ? `${city}, ${street} ${house}${apt ? ', кв. ' + apt : ''}`.trim() : customerAddress;
      
      if (orderType === 'delivery' && formattedAddress) {
        extendedCustomerName += ` (Адрес: ${formattedAddress})`;
      }
      
      const extras = [];
      if (wantsBread) extras.push("Хлеб");
      if (wantsCutlery) extras.push("Приборы");
      if (extras.length > 0) {
        extendedCustomerName += ` | ${extras.join(', ')}`;
      }

      await createOrderMutation.mutateAsync({
        customerName: extendedCustomerName,
        customerPhone: customerPhone || "",
        status: "new",
        totalAmount: displayTotal,
        paymentMethod: paymentMethod as any,
        tableId: orderType === 'dine_in' && selectedTableId ? selectedTableId : undefined,
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          menuItemName: item.name,
          quantity: item.quantity,
          priceAtTime: item.price
        }))
      });

      clearCart();
      useToastStore.getState().success("Заказ успешно создан!");
    } catch (err: any) {
      console.error("DEBUG ORDER ERROR:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col gap-5 overflow-hidden pb-4">
      <div className="flex items-center pb-4 border-b border-white/10 shrink-0 gap-8 flex-wrap mt-0">
        <div className="flex items-center gap-6 shrink-0">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Касса</h1>
          {isEnabled && isPeakTime && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.2)]"
            >
              <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Peak Active</span>
            </motion.div>
          )}
        </div>
          
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar z-10 flex-1 min-w-[300px] shrink-0">
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery("");
              }}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all rounded-lg border ${
                activeCategory === 'all' 
                  ? 'bg-white/10 text-white shadow-lg border-white/10' 
                  : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'
              }`}
            >
              Все
            </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery("");
              }}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all rounded-lg border ${
                activeCategory === cat.id 
                  ? 'bg-white/10 text-white shadow-lg border-white/10' 
                  : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Payment Methods (In 2nd Header) */}
        <div className="flex gap-2 w-full sm:w-[380px] lg:w-[420px] shrink-0">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
              paymentMethod === 'cash' 
                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/10' 
                : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'
            }`}
          >
            <Banknote className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Наличные</span>
          </button>
          <button
            onClick={() => setPaymentMethod('bit')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] md:text-[13px] font-bold uppercase tracking-wider transition-all border ${
              paymentMethod === 'bit' 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10' 
                : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/5 bg-transparent'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">Bit / Карта</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 lg:gap-6 overflow-hidden min-h-0">
        {/* Left Column: Menu Items */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden relative pt-2">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Grid of Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 z-10">
          {menuLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 gap-4">
              <ShoppingBag className="w-16 h-16 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">Ничего не найдено</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5 pb-8"
            >
              <AnimatePresence>
                {filteredItems.map((item, i) => {
                  const dynamicPrice = getDynamicPrice(item.price);
                  const hasMarkup = dynamicPrice > item.price;
                  
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.02 }}
                      key={item.id}
                      onClick={() => addToCart({ 
                        id: item.id, 
                        name: item.name, 
                        price: dynamicPrice, 
                        menuItemId: item.id 
                      })}
                      className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-3xl p-3 flex flex-col items-start text-left hover:bg-white/10 hover:border-orange-500/30 transition-all duration-300 group active:scale-[0.97] relative overflow-hidden shadow-lg"
                    >
                      <div className="w-full aspect-square bg-black/40 rounded-2xl mb-4 overflow-hidden relative border border-white/5">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-4xl uppercase bg-gradient-to-br from-white/5 to-transparent">
                            {item.name.charAt(0)}
                          </div>
                        )}
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {hasMarkup && (
                          <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)] uppercase tracking-wider backdrop-blur-md">
                            🔥 ПИК
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col flex-1 w-full justify-between gap-2 px-1">
                        <h3 className="font-extrabold text-[13px] md:text-sm line-clamp-2 group-hover:text-orange-400 transition-colors uppercase tracking-tight leading-snug">{item.name}</h3>
                        
                        <div className="flex items-center justify-between w-full mt-auto">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-lg md:text-xl font-black tracking-tighter ${hasMarkup ? 'text-orange-500' : 'text-white'}`}>
                              {dynamicPrice} ₪
                            </span>
                            {hasMarkup && (
                              <span className="text-[11px] text-white/40 line-through font-bold">
                                {item.price}
                              </span>
                            )}
                          </div>
                          
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-orange-500 group-hover:text-white transition-all transform group-hover:rotate-90">
                            <PlusCircle className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className="w-[380px] lg:w-[420px] bg-black/20 backdrop-blur-3xl border border-white/5 flex flex-col overflow-hidden shadow-2xl shrink-0 relative">
        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Cart Items Area */}
        <div className="flex-1 max-h-[35vh] lg:max-h-[40vh] overflow-y-auto p-4 lg:p-6 space-y-3 custom-scrollbar z-10">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4 py-8">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5">
                <PlusCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Выберите блюда</p>
            </div>
          ) : (
            <AnimatePresence>
              {cartItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id} 
                  className="flex gap-3 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/5 relative overflow-hidden group"
                >
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-[13px] font-bold line-clamp-1 group-hover:text-orange-400 transition-colors">{item.name}</h4>
                    <p className="text-xs text-white/50 font-medium mt-1">{(item.price * item.quantity).toFixed(2)} ₪</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-black/40 rounded-xl px-2 py-1 border border-white/5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-white/50 hover:text-white transition-colors active:scale-90">
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <span className="font-black min-w-[20px] text-center text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-white/50 hover:text-white transition-colors active:scale-90">
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-red-500 to-transparent opacity-0 translate-x-full group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-end pr-3">
                    <button onClick={() => removeFromCart(item.id)} className="text-white hover:scale-110 transition-transform">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Client Config Area */}
        <div className="flex-none flex flex-col gap-2 overflow-y-auto px-4 lg:px-6 pb-3 lg:pb-4 pt-3 lg:pt-4 custom-scrollbar bg-white/5 border-t border-white/5 z-10">
          
          {/* Order Types */}
          <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            {(['dine_in', 'pickup', 'delivery'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all ${
                  orderType === type
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                {type === 'dine_in' ? 'В зале' : type === 'pickup' ? 'Самовывоз' : 'Доставка'}
              </button>
            ))}
          </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Имя клиента" 
                value={customerName}
                onFocus={() => setShowClientSuggestions(true)}
                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                onChange={(e) => {
                  setCustomer(e.target.value, customerPhone, customerAddress);
                  setShowClientSuggestions(true);
                }}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
              />
              {showClientSuggestions && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl max-h-[160px] overflow-y-auto custom-scrollbar shadow-2xl z-50 p-1 animate-in fade-in zoom-in duration-200">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      className="w-full text-left p-2 rounded-xl hover:bg-white/5 text-sm transition-colors border border-transparent hover:border-white/5 group"
                      onClick={() => {
                        setCustomer(client.name, client.phone || customerPhone, client.address || customerAddress);
                        setShowClientSuggestions(false);
                        if (client.address) {
                           // If we get full address from suggestions, place it to street so it's not lost
                           setStreet(client.address);
                           setHouse("");
                           setApt("");
                        }
                      }}
                    >
                      <div className="font-bold group-hover:text-amber-400 transition-colors">{client.name}</div>
                      <div className="text-[10px] text-white/50 flex gap-2 mt-0.5">
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.address && <span className="truncate">🏠 {client.address}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Телефон" 
                value={customerPhone}
                onChange={(e) => setCustomer(customerName, e.target.value, customerAddress)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
            
            {orderType === 'delivery' && (
              <div className="relative animate-in fade-in slide-in-from-top-2 flex flex-col gap-2">
                <select 
                  required 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  className="w-full bg-orange-500/10 border border-orange-500/30 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white appearance-none"
                >
                  {Object.entries(DELIVERY_PRICES).map(([cityName, price]) => (
                    <option key={cityName} value={cityName} className="bg-zinc-900 text-white">
                      {cityName} ({price} ₪)
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-4 gap-2">
                  <input 
                    required 
                    value={street} 
                    onChange={e => setStreet(e.target.value)} 
                    type="text" 
                    placeholder="Улица *" 
                    className="col-span-2 w-full bg-orange-500/10 border border-orange-500/30 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-orange-500/40 text-orange-100"
                  />
                  <input 
                    required 
                    value={house} 
                    onChange={e => setHouse(e.target.value)} 
                    type="text" 
                    placeholder="Дом *" 
                    className="col-span-1 min-w-0 w-full bg-orange-500/10 border border-orange-500/30 rounded-xl py-3 px-3 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-orange-500/40 text-orange-100 text-center"
                  />
                  <input 
                    value={apt} 
                    onChange={e => setApt(e.target.value)} 
                    type="text" 
                    placeholder="Кв." 
                    className="col-span-1 min-w-0 w-full bg-orange-500/10 border border-orange-500/30 rounded-xl py-3 px-3 text-sm focus:outline-none focus:border-orange-500 transition-colors placeholder:text-orange-500/40 text-orange-100 text-center"
                  />
                </div>
              </div>
            )}

            {orderType === 'dine_in' && (
              <div className="relative animate-in fade-in slide-in-from-top-2">
                <select
                  value={selectedTableId || ""}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full bg-[#141414] border border-white/5 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-orange-500 transition-colors text-white appearance-none"
                >
                  <option value="" disabled>
                    {tables.length === 0 ? "⚠️ Сначала создайте столы в меню Зал" : "Выберите стол..."}
                  </option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Стол №{t.number} ({t.seats} мест)
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Bread and Cutlery */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleBread()}
              className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                wantsBread 
                  ? 'bg-amber-500 border-amber-500 text-white' 
                  : 'bg-black/20 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Хлеб
            </button>
            <button
              onClick={() => toggleCutlery()}
              className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                wantsCutlery 
                  ? 'bg-amber-500 border-amber-500 text-white' 
                  : 'bg-black/20 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Приборы
            </button>
          </div>
        </div>

        {/* Footer: Summary and Pay */}
        <div className="p-3 lg:p-4 bg-black/40 backdrop-blur-xl border-t border-white/10 space-y-3 z-20 shrink-0">
          <div className="flex items-end justify-between py-1 border-b border-white/10 pb-2">
            <span className="text-base font-black text-white/60 uppercase tracking-widest">Тотал</span>
            <span className="text-3xl lg:text-4xl font-black tracking-tighter text-white">{displayTotal.toFixed(2)} ₪</span>
          </div>

          <button 
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleCreateOrder}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-white/5 disabled:to-white/5 disabled:text-white/30 text-white font-black py-3.5 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)] disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3 group text-base tracking-wider"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                ОФОРМИТЬ РАСЧЕТ
              </>
            )}
          </button>
        </div>
      </div>
     </div>
    </div>
  );
}
