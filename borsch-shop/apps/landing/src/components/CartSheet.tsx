"use client";

import { useCartStore } from "@/store/cartStore";
import { useState, useEffect, useMemo, useRef } from "react";
import { X, Minus, Plus, ShoppingBag, Loader2, MapPin } from "lucide-react";
import { useLocaleStore, translate, LOCAL_TRANSLATIONS } from "@/store/localeStore";

export default function CartSheet({ settings }: { settings?: any }) {
  const { locale, systemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = systemTranslations.find(x => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const reservationDateOffset = useCartStore((state) => state.reservationDateOffset);
  const setReservationDateOffset = useCartStore((state) => state.setReservationDateOffset);
  const orderButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setOrderId(null);
    }
  }, [isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // If both delivery and pickup are disabled, it implies we are closed for today, so only allow preorder.
  const forceTomorrow = settings?.is_preorder_mode || (!settings?.is_delivery_enabled && !settings?.is_pickup_enabled);

  useEffect(() => {
    if (forceTomorrow && reservationDateOffset === 0) setReservationDateOffset(1);
  }, [forceTomorrow, reservationDateOffset, setReservationDateOffset]);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apt, setApt] = useState("");
  const [payment, setPayment] = useState("cash");
  const [type, setType] = useState<"delivery" | "pickup">("delivery");

  useEffect(() => {
    if (settings) {
      if (!settings.is_delivery_enabled && settings.is_pickup_enabled && type === "delivery") {
        setType("pickup");
      } else if (settings.is_delivery_enabled && !settings.is_pickup_enabled && type === "pickup") {
        setType("delivery");
      }
    }
  }, [settings, type]);

  const [timeSlot, setTimeSlot] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<any[]>([]);
  const [lastTotal, setLastTotal] = useState(0);
  const [includeBread, setIncludeBread] = useState(false);
  const [includeCutlery, setIncludeCutlery] = useState(false);

  const TIME_SLOTS = [
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
    "20:00 - 21:00"
  ];

  // Generate date options
  const dateOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentHour = now.getHours();
    const isPastLastSlot = currentHour >= 20;
    
    const daysLeft = 14;
    
    for (let i = 0; i <= daysLeft; i++) {
      if (i === 0 && (forceTomorrow || isPastLastSlot)) continue;
      
      let hasOverstock = false;
      if (i === 0) {
        hasOverstock = items.some(cartItem => cartItem.quantity > cartItem.stock);
        if (hasOverstock) continue;
      }

      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dayStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      
      let label = dayStr;
      const todayText = t('today', 'Сегодня');
      const tomorrowText = t('tomorrow', 'Завтра');
      
      if (i === 0) label = `${todayText} (${dayStr})`;
      if (i === 1) label = `${tomorrowText} (${dayStr})`;

      options.push({ value: i, label });
    }
    return options;
  }, [forceTomorrow, items, t]);

  // Filter time slots for current day
  const availableTimeSlots = useMemo(() => {
    const currentHour = new Date().getHours();
    return TIME_SLOTS.filter(slot => {
      if (reservationDateOffset > 0) return true;
      const slotHour = parseInt(slot.split(":")[0], 10);
      return slotHour > currentHour;
    });
  }, [reservationDateOffset]);

  // Ensure selected values are valid
  useEffect(() => {
    if (dateOptions.length > 0 && !dateOptions.some(opt => opt.value === reservationDateOffset)) {
      setReservationDateOffset(dateOptions[0].value);
    }
  }, [dateOptions, reservationDateOffset, setReservationDateOffset]);

  useEffect(() => {
    if (timeSlot && !availableTimeSlots.includes(timeSlot)) {
      setTimeSlot("");
    }
  }, [availableTimeSlots, timeSlot]);

  if (!isOpen) return null;

  const total = getTotalPrice();
  const deliveryFee = type === "delivery" ? 30 : 0;
  const finalTotal = total + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);

    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://borsch.shop';
    const formattedAddress = type === "delivery" ? `Haifa, ${street} ${house}${apt ? ', apt. ' + apt : ''}` : "Самовывоз из Ha-Ne'emanim St 15, Haifa";
    const displayName = `${name} (${type === "delivery" ? "Доставка: " + formattedAddress : "Самовывоз"})`;

    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + reservationDateOffset);
    
    if (timeSlot) {
      const hour = parseInt(timeSlot.split(":")[0], 10);
      if (!isNaN(hour)) {
        dateObj.setHours(hour, 0, 0, 0);
      }
    }
    const isoDate = dateObj.toISOString();

    const orderData = {
      customer_name: displayName,
      customer_phone: phone,
      total_amount: finalTotal,
      status: "new",
      payment_method: payment,
      reservation_date: isoDate,
    };

    try {
      // 1. Insert Order
      const orderRes = await fetch(`${pbUrl}/api/collections/orders/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      
      if (!orderRes.ok) {
        throw new Error(await orderRes.text());
      }
      
      const order = await orderRes.json();

      if (order?.id) {
        setOrderId(order.id);
        // 2. Insert Order Items
        const orderItems: any[] = items.map((item) => ({
          order_id: order.id,
          menu_item_id: item.id,
          menu_item_name: item.name,
          quantity: item.quantity,
          price_at_time: item.price,
        }));

        if (type === "delivery") {
          orderItems.push({
            order_id: order.id,
            menu_item_name: "Доставка",
            quantity: 1,
            price_at_time: 30,
          } as any);
        }
        
        if (includeBread) {
          orderItems.push({ order_id: order.id, menu_item_name: "🍞 Хлеб", quantity: 1, price_at_time: 0 } as any);
        }
        if (includeCutlery) {
          orderItems.push({ order_id: order.id, menu_item_name: "🍴 Приборы", quantity: 1, price_at_time: 0 } as any);
        }

        for (const i of orderItems) {
            if (!i.menu_item_id) delete i.menu_item_id;
            const itemRes = await fetch(`${pbUrl}/api/collections/order_items/records`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(i)
            });
            if (!itemRes.ok) console.error("Failed to insert item:", await itemRes.text());
        }

        // 4. Upsert Client
        try {
            const clientQuery = await fetch(`${pbUrl}/api/collections/clients/records?filter=(phone='${encodeURIComponent(phone)}')`);
            const clientData = clientQuery.ok ? await clientQuery.json() : null;
            const existingClient = clientData?.items?.[0] || null;
            
            const upsertData: any = { phone: phone, name: name };
            if (type === "delivery" && formattedAddress) upsertData.address = formattedAddress;
            
            if (existingClient) {
                await fetch(`${pbUrl}/api/collections/clients/records/${existingClient.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(upsertData)
                });
            } else {
                await fetch(`${pbUrl}/api/collections/clients/records`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(upsertData)
                });
            }
        } catch (clientErr) {
            console.error("Client err:", clientErr);
        }

        // 5. Send Telegram
        let itemsText = items.map((i) => `• ${i.name} (x${i.quantity})`).join("\n");
        if (includeBread) itemsText += "\n• 🍞 Хлеб (x1)";
        if (includeCutlery) itemsText += "\n• 🍴 Приборы (x1)";
        
        const delivType = type === "delivery" ? `🚚 <b>ДОСТАВКА</b>: ${formattedAddress}` : "🛒 <b>САМОВЫВОЗ</b>";
        const paymentStr = payment === "cash" ? "💵 Наличные" : "📱 Bit / Перевод";
        
        let dateStrForTg = "";
        if (reservationDateOffset === 0) dateStrForTg = "⚡️ <b>НА СЕГОДНЯ</b>";
        else if (reservationDateOffset === 1) dateStrForTg = "🚀 <b>НА ЗАВТРА</b>";
        else {
           const d = new Date();
           d.setDate(d.getDate() + reservationDateOffset);
           dateStrForTg = `🗓 <b>НА ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</b>`;
        }

        const msg = `🔔 <b>НОВЫЙ ЗАКАЗ</b>\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n${delivType}\n${dateStrForTg} (${timeSlot})\n💳 Оплата: <b>${paymentStr}</b>\n💰 Сумма: <b>${finalTotal} ₪</b>\n\n<b>Состав заказа:</b>\n${itemsText}`;

        // Send via internal API
        fetch("/api/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, phone: phone, address: type === "delivery" ? formattedAddress : "" })
        }).catch(tgErr => console.error("Telegram error:", tgErr));
      }

      setSuccess(true);
      setLastOrderItems([...items]);
      setLastTotal(finalTotal);
      clearCart();
    } catch (err: unknown) {
      console.error(err);
      let errorMsg = "Неизвестная ошибка";
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === "object" && err !== null && "message" in err) {
         errorMsg = String((err as any).message);
      }
      alert(`Не удалось оформить заказ. Ошибка: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={toggleCart}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-[#111111] border-l border-white/10 shadow-2xl flex flex-col pt-6 transform transition-transform animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-6 border-b border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#FF6B00]" />
            {t('cart', 'Ваша корзина')}
          </h2>
          <button onClick={toggleCart} className="p-2 bg-[#1A1A1A] rounded-full hover:bg-neutral-800 transition">
            <X className="w-5 h-5 text-neutral-400 hover:text-white" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center animate-bounce">
              <ShoppingBag className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-bold text-white">{t('order_success', 'Заказ принят!')}</h3>
            <p className="text-neutral-400">{t('order_success_desc', 'Наш менеджер скоро свяжется с вами или вы получите уведомление в Telegram.')}</p>
            
            {/* PICKUP: Map Link first */}
            {type === "pickup" && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Ha-Ne'emanim St 15, Haifa")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-neutral-300 bg-[#FF6B00]/10 p-4 rounded-xl border border-[#FF6B00]/20 flex items-center justify-between gap-3 mt-2 animate-in fade-in duration-300 w-full shadow-lg hover:bg-[#FF6B00]/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <MapPin className="w-8 h-8 text-[#FF6B00] shrink-0" />
                  <div className="leading-snug">
                     {t('pickup_address_text', 'Заберите заказ по нашему адресу:')}<br/>
                     <strong className="text-white text-[15px] font-bold mt-1 inline-block border-b border-[#FF6B00]/50 pb-0.5">Ha-Ne&apos;emanim St 15, Haifa</strong>
                  </div>
                </div>
              </a>
            )}
            
            {/* DELIVERY: Telegram Button first */}
            {type === "delivery" && orderId && (
              <a 
                href={`https://t.me/borschordersbot?start=${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full flex items-center justify-center gap-2 bg-[#0088CC] hover:bg-[#0077b5] text-white font-bold py-4 rounded-xl transition shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.198 2.008a2.807 2.807 0 0 0-3.23-.49L2.953 8.653c-1.38.583-1.396 2.508-.024 3.111l4.904 2.158 2.112 6.516a1.5 1.5 0 0 0 2.656.326l2.915-3.52 4.469 3.298c1.171.865 2.863.266 3.14-1.186L23.951 3.51a2.809 2.809 0 0 0-2.753-1.502Z"/><path d="m10.15 13.924 9.42-8.318c.28-.246.685.158.423.42l-7.794 7.793c-.473.472-.734 1.114-.734 1.782v3.084"/></svg>
                {t('track_order', 'Следить в Telegram')}
              </a>
            )}

            {/* ORDER DETAILS */}
            {lastOrderItems.length > 0 && (
              <div className="w-full bg-white/5 rounded-xl border border-white/10 p-4 text-left space-y-3 mt-4 animate-in fade-in duration-300">
                <h4 className="text-white font-bold opacity-80 uppercase tracking-wider text-[11px] mb-2">{t('your_order', 'Ваш заказ')}</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                  {lastOrderItems.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-[13px]">
                      <span className="text-neutral-300 pr-2 leading-tight">
                        <span className="text-white/50 mr-1.5">{item.quantity}x</span>
                        {item.name}
                      </span>
                      <span className="text-white font-medium whitespace-nowrap">{item.price * item.quantity} ₪</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center text-[15px] font-bold">
                  <span className="text-white">{t('total', 'Итого')}</span>
                  <span className="text-[#00E676]">{lastTotal} ₪</span>
                </div>
              </div>
            )}

            {/* IF PICKUP: Also show telegram button, but at the end */}
            {type === "pickup" && orderId && (
              <a 
                href={`https://t.me/borschordersbot?start=${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[#0088CC]/20 border border-[#0088CC]/40 hover:bg-[#0088CC]/40 text-[#0088CC] hover:text-white font-bold py-3 rounded-xl transition shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.198 2.008a2.807 2.807 0 0 0-3.23-.49L2.953 8.653c-1.38.583-1.396 2.508-.024 3.111l4.904 2.158 2.112 6.516a1.5 1.5 0 0 0 2.656.326l2.915-3.52 4.469 3.298c1.171.865 2.863.266 3.14-1.186L23.951 3.51a2.809 2.809 0 0 0-2.753-1.502Z"/><path d="m10.15 13.924 9.42-8.318c.28-.246.685.158.423.42l-7.794 7.793c-.473.472-.734 1.114-.734 1.782v3.084"/></svg>
                {t('track_order', 'Следить в Telegram')}
              </a>
            )}

            <button 
              onClick={toggleCart}
              className="mt-4 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition w-full"
            >
              {t('back_to_menu', 'Вернуться к меню')}
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 shadow-inner">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
                  <ShoppingBag className="w-16 h-16 opacity-20" />
                  <p>{t('empty_cart', 'Корзина пока пуста')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white mb-2">{t('cart', 'Корзина')} {items.length}</h3>
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 bg-[#1A1A1A] p-3 rounded-2xl border border-white/5 items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-neutral-800" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-white leading-tight">{item.name}</h4>
                        <p className="text-[#FF6B00] font-bold mt-1">{item.price} ₪</p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-[#000000] px-2 py-1.5 rounded-full border border-white/10">
                        <button onClick={() => decrement(item.id)} className="p-1 hover:text-white text-neutral-400 transition">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-4 text-center text-sm font-bold text-white">{item.quantity}</span>
                        <button onClick={() => increment(item.id)} className="p-1 hover:text-white text-neutral-400 transition">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout Form & Total */}
            {items.length > 0 && (
              <div className="p-6 bg-[#1A1A1A] border-t border-white/10 space-y-6">
                
                {/* Options Delivery/Pickup */}
                <div className="flex gap-2">
                  {settings?.is_delivery_enabled && (
                    <button 
                      type="button" 
                      onClick={() => setType("delivery")} 
                      className={`flex-1 py-2 text-sm font-bold rounded-xl border transition ${type === "delivery" ? "bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]" : "bg-black border-white/10 text-neutral-400"}`}
                    >
                      {t('delivery', 'Доставка')} (+30 ₪)
                    </button>
                  )}
                  {settings?.is_pickup_enabled && (
                    <button 
                      type="button" 
                      onClick={() => setType("pickup")} 
                      className={`flex-1 py-2 text-sm font-bold rounded-xl border transition ${type === "pickup" ? "bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]" : "bg-black border-white/10 text-neutral-400"}`}
                    >
                      {t('pickup', 'Самовывоз')} (0 ₪)
                    </button>
                  )}
                </div>

                {/* Pickup address was moved to Success Popup */}

                {/* Options Today/Tomorrow removed (handled by dropdown at the top of cart) */}

                <form onSubmit={handleCheckout} className="space-y-3">
                  <div className="flex flex-col gap-3 pb-3 pt-1">
                    <span className="text-sm font-bold text-white uppercase tracking-wider opacity-90">{t('addons_free', 'Дополнения (бесплатно):')}</span>
                    <div className="flex flex-row items-center gap-6 flex-wrap whitespace-nowrap bg-white/5 p-3 rounded-xl border border-white/5">
                      <label className="flex items-center gap-3 cursor-pointer w-fit group">
                        <input type="checkbox" checked={includeBread} onChange={(e) => setIncludeBread(e.target.checked)} className="w-[18px] h-[18px] accent-[#FF6B00] rounded" />
                        <span className="text-[15px] font-medium text-white">{t('bread', 'Хлеб 🍞')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={includeCutlery} onChange={(e) => setIncludeCutlery(e.target.checked)} className="w-[18px] h-[18px] accent-[#FF6B00] rounded" />
                        <span className="text-[15px] font-medium text-white">{t('cutlery', 'Приборы 🍴')}</span>
                      </label>
                    </div>
                  </div>

                  <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder={`${t('name', 'Имя')} *`} className="w-full bg-[#111111] text-white border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition" />
                  <input required value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} type="tel" placeholder={`${t('phone', 'Телефон')} *`} className="w-full bg-[#111111] text-white border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition" />
                  
                  {type === "delivery" && (
                     <div className="grid grid-cols-4 gap-2">
                       <input required value={street} onChange={e => setStreet(e.target.value)} type="text" placeholder={`${t('street', 'Улица')} *`} className="col-span-2 bg-[#111111] text-white border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition" />
                       <input required value={house} onChange={e => setHouse(e.target.value)} type="text" placeholder={`${t('house', 'Дом')} *`} className="col-span-1 min-w-0 bg-[#111111] text-white border border-white/10 px-3 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition text-center" />
                       <input value={apt} onChange={e => setApt(e.target.value)} type="text" placeholder={t('apt', 'Кв.')} className="col-span-1 min-w-0 bg-[#111111] text-white border border-white/10 px-3 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition text-center" />
                     </div>
                  )}

                  <div className="flex gap-2">
                    <select 
                      required
                      value={reservationDateOffset}
                      onChange={(e) => setReservationDateOffset(parseInt(e.target.value, 10))}
                      className="w-full bg-[#111111] text-white border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition appearance-none"
                    >
                      {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>

                    <select 
                      required
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full bg-[#111111] text-white border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:border-[#FF6B00] transition appearance-none"
                    >
                      <option value="" disabled>{t('time', 'Время')} *</option>
                      {availableTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pb-2">
                     <label className={`flex items-center gap-2 flex-1 cursor-pointer bg-[#111111] border px-4 py-3 rounded-xl transition ${payment === "cash" ? "border-[#FF6B00] text-white" : "border-white/10 text-neutral-400"}`}>
                        <input type="radio" checked={payment === "cash"} onChange={() => setPayment("cash")} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payment === "cash" ? "border-[#FF6B00]" : "border-neutral-500"}`}>
                          {payment === "cash" && <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                        </div>
                        <span className="text-[13px] font-medium leading-none mt-0.5">{t('payment_cash', 'Наличными')}</span>
                     </label>
                     <label className={`flex items-center gap-2 flex-1 cursor-pointer bg-[#111111] border px-4 py-3 rounded-xl transition ${payment === "bit" ? "border-[#FF6B00] text-white" : "border-white/10 text-neutral-400"}`}>
                        <input type="radio" checked={payment === "bit"} onChange={() => setPayment("bit")} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payment === "bit" ? "border-[#FF6B00]" : "border-neutral-500"}`}>
                          {payment === "bit" && <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                        </div>
                        <span className="text-[13px] font-medium leading-none mt-0.5">{t('payment_bit', 'Bit / Перевод')}</span>
                     </label>
                  </div>

                  <div className="flex justify-between items-center py-2 text-white">
                    <span className="text-neutral-400 font-medium">{t('total', 'Итого')}:</span>
                    <span className="text-3xl font-extrabold">{finalTotal} ₪</span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_4px_16px_rgba(255,107,0,0.4)]"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('checkout_btn', 'Оформить заказ')}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
