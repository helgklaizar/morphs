"use client";

import { useCartStore } from "@/store/useCartStore";
import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Minus, Plus, ShoppingBag, Loader2, MapPin, CheckCircle, ChevronRight } from "lucide-react";
import { useLocaleStore, translate, LOCAL_TRANSLATIONS } from "@/store/localeStore";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function CartSheet({ landingSettings }: { landingSettings?: Record<string, unknown> }) {
  const { locale, systemTranslations } = useLocaleStore();
  const t = useCallback((key: string, fallback: string) => {
    const tr = systemTranslations.find(x => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  }, [locale, systemTranslations]);
  
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const clearCart = useCartStore((state) => state.clearCart);
  const reservationDateOffset = useCartStore((state) => state.reservationDateOffset);
  const setReservationDateOffset = useCartStore((state) => state.setReservationDateOffset);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setOrderId(null);
    }
  }, [isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const forceTomorrow = landingSettings?.is_only_preorder || (!landingSettings?.is_delivery_enabled && !landingSettings?.is_pickup_enabled);

  useEffect(() => {
    if (forceTomorrow && reservationDateOffset === 0) setReservationDateOffset(1);
  }, [forceTomorrow, reservationDateOffset, setReservationDateOffset]);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('rms_user_name');
      const savedPhone = localStorage.getItem('rms_user_phone');
      if (savedName) setName(savedName);
      if (savedPhone) setPhone(savedPhone);
    }
  }, []);
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("Хайфа");
  const [payment, setPayment] = useState("cash");
  const [type, setType] = useState<"delivery" | "pickup">("delivery");

  useEffect(() => {
    if (landingSettings) {
      if (!landingSettings.is_delivery_enabled && landingSettings.is_pickup_enabled && type === "delivery") {
        setType("pickup");
      } else if (landingSettings.is_delivery_enabled && !landingSettings.is_pickup_enabled && type === "pickup") {
        setType("delivery");
      }
    }
  }, [landingSettings, type]);

  const [timeSlot, setTimeSlot] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<Array<{ id: string, name: string, quantity: number, price: number }>>([]);
  const [lastTotal, setLastTotal] = useState(0);
  const [includeBread, setIncludeBread] = useState(false);
  const [includeCutlery, setIncludeCutlery] = useState(false);
  const [tableNum, setTableNum] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tbl = sp.get('table');
      setTableNum(tbl);
      if (tbl) setType('pickup');
    }
  }, []);

  // Time slots are defined outside useMemo below

  const dateOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentHour = now.getHours();
    const isPastLastSlot = currentHour >= 20;
    
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    
    for (let i = 0; i <= daysLeft; i++) {
      if (i === 0 && (forceTomorrow || isPastLastSlot)) continue;
      
      let hasOverstock = false;
      if (i === 0) {
        hasOverstock = items.some(cartItem => cartItem.quantity > cartItem.stock && !cartItem.is_poll);
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

  const availableTimeSlots = useMemo(() => {
    const TIME_SLOTS = [
      "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
      "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00"
    ];
    const currentHour = new Date().getHours();
    return TIME_SLOTS.filter(slot => {
      if (reservationDateOffset > 0) return true;
      const slotHour = parseInt(slot.split(":")[0], 10);
      return slotHour > currentHour;
    });
  }, [reservationDateOffset]);

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
    setErrorMsg(null);

    const searchParams = new URLSearchParams(window.location.search);
    const tableNum = searchParams.get('table');

    const pbUrl = process.env.NEXT_PUBLIC_PB_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://rms.shop';
    const formattedAddress = type === "delivery" ? `${city}, ${street} ${house}${apt ? ', apt. ' + apt : ''}` : "Самовывоз из Ha-Ne'emanim St 15, Haifa";
    
    let displayName = `${name} (${type === "delivery" ? "Доставка: " + formattedAddress : "Самовывоз"})`;
    if (tableNum) {
      displayName = `${name || 'Гость'} (В ЗАЛ: Стол №${tableNum})`;
    }

    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + reservationDateOffset);
    
    if (timeSlot) {
      const hour = parseInt(timeSlot.split(":")[0], 10);
      if (!isNaN(hour)) {
        dateObj.setHours(hour, 0, 0, 0);
      }
    }
    const isoDate = dateObj.toISOString();

    const orderData: Record<string, unknown> = {
      customer_name: displayName,
      customer_phone: phone || "QR-Menu",
      total_amount: finalTotal,
      status: "new",
      payment_method: payment,
      reservation_date: isoDate,
    };

    try {
      const orderRes = await fetch(`${pbUrl}/api/collections/orders/records`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData)
      });
      if (!orderRes.ok) throw new Error(await orderRes.text());
      const order = await orderRes.json();

      if (order?.id) {
        setOrderId(order.id);
        const orderItems: Record<string, unknown>[] = items.map((item) => ({
          order_id: order.id, menu_item_id: item.id, menu_item_name: item.name, quantity: item.quantity, price_at_time: item.price,
        }));

        if (type === "delivery") orderItems.push({ order_id: order.id, menu_item_name: "Доставка", quantity: 1, price_at_time: 30 });
        if (includeBread) orderItems.push({ order_id: order.id, menu_item_name: "🍞 Хлеб", quantity: 1, price_at_time: 0 });
        if (includeCutlery) orderItems.push({ order_id: order.id, menu_item_name: "🍴 Приборы", quantity: 1, price_at_time: 0 });

        for (const i of orderItems) {
            if (!i.menu_item_id) delete i.menu_item_id;
            await fetch(`${pbUrl}/api/collections/order_items/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(i) });
        }

        try {
            const clientQuery = await fetch(`${pbUrl}/api/collections/clients/records?filter=(phone='${encodeURIComponent(phone)}')`);
            const clientData = clientQuery.ok ? await clientQuery.json() : null;
            const existingClient = clientData?.items?.[0] || null;
            const upsertData: Record<string, unknown> = { phone: phone, name: name };
            if (type === "delivery" && formattedAddress) upsertData.address = formattedAddress;
            
            if (existingClient) {
                await fetch(`${pbUrl}/api/collections/clients/records/${existingClient.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upsertData) });
            } else {
                await fetch(`${pbUrl}/api/collections/clients/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upsertData) });
            }
        } catch (clientErr) { console.error(clientErr); }

        // Fixes Logical Bug 4: Call custom endpoint so Telegram Notification has all order_items
        try {
          await fetch(`${pbUrl}/api/webhooks/order_submit/${order.id}`, { method: "POST" });
        } catch (webhookErr) {
          console.error("Failed to trigger telegram webhook:", webhookErr);
        }
      }

      setSuccess(true);
      setLastOrderItems([...items]);
      setLastTotal(finalTotal);
      if (name) localStorage.setItem('rms_user_name', name);
      if (phone) localStorage.setItem('rms_user_phone', phone);

      clearCart();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || (typeof err === 'string' ? err : "Ошибка: " + JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />
      
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-zinc-950 border-l border-white/5 z-[110] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-lg z-10 relative">
          <h2 className="text-2xl font-black font-outfit text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" /> {t('cart', 'Ваша корзина')}
          </h2>
          <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5 text-neutral-400 hover:text-white" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 overflow-y-auto">
            <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center animate-bounce border border-green-500/20">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black font-outfit text-white tracking-tight">{t('order_success', 'Заказ принят!')}</h3>
            <p className="text-neutral-400">{t('order_success_desc', 'Наш менеджер скоро свяжется с вами или вы получите уведомление в Telegram.')}</p>
            
            {type === "pickup" && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Ha-Ne'emanim St 15, Haifa")}`} target="_blank" rel="noopener noreferrer" className="text-[14px] text-neutral-300 bg-brand/10 p-4 rounded-3xl border border-brand/20 flex items-center justify-between gap-3 mt-2 animate-in fade-in duration-300 w-full shadow-lg hover:bg-brand/20 transition cursor-pointer">
                <div className="flex items-center gap-3 text-left">
                  <MapPin className="w-8 h-8 text-brand shrink-0" />
                  <div className="leading-snug">
                     {t('pickup_address_text', 'Заберите заказ по нашему адресу:')}<br/>
                     <strong className="text-white text-[15px] font-bold mt-1 inline-block border-b border-brand/50 pb-0.5">Ha-Ne&apos;emanim St 15, Haifa</strong>
                  </div>
                </div>
              </a>
            )}
            
            {orderId && (
              <a href={`https://t.me/rmsordersbot?start=${orderId}`} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex flex-row items-center justify-center gap-3 bg-[#0088CC] hover:bg-[#0077b5] text-white font-bold py-4 rounded-2xl transition shadow-lg">
                <Image src="/assets/images/telegram.png" width={24} height={24} alt="telegram" className="brightness-0 invert" />
                {t('track_order', 'Следить в Telegram')}
              </a>
            )}

            {lastOrderItems.length > 0 && (
              <div className="w-full bg-white/5 rounded-3xl border border-white/5 p-5 text-left space-y-3 mt-4 animate-in fade-in duration-300">
                <h4 className="text-white font-bold opacity-80 uppercase tracking-wider text-[11px] mb-2">{t('your_order', 'Ваш заказ')}</h4>
                <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                  {lastOrderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-[14px]">
                      <span className="text-neutral-300 pr-2 leading-tight">
                        <span className="text-white/40 mr-2 font-mono">{item.quantity}x</span> {item.name}
                      </span>
                      <span className="text-white font-bold whitespace-nowrap">{item.price * item.quantity} ₪</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-4 flex justify-between items-center text-[16px] font-bold">
                  <span className="text-white">{t('total', 'Итого')}</span>
                  <span className="text-brand font-black text-xl">{lastTotal} ₪</span>
                </div>
              </div>
            )}

            <button onClick={() => setIsOpen(false)} className="mt-4 px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition w-full">
              {t('back_to_menu', 'Вернуться к меню')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4 pt-10">
                  <ShoppingBag className="w-16 h-16 opacity-20" />
                  <p className="text-lg font-outfit text-white/40">{t('empty_cart', 'Корзина пока пуста')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} key={item.id} className="flex gap-4 bg-zinc-900/60 p-3 rounded-[1.5rem] border border-white/5 items-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-20 h-20 relative rounded-2xl bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
                            {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-brand font-black text-2xl">{item.name.charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-bold text-sm text-white leading-tight mb-2 truncate">{item.name}</h4>
                          <div className="flex justify-between items-center relative z-10">
                            <p className="text-brand font-black">{item.price} ₪</p>
                            <div className="flex items-center gap-3 bg-black/60 px-2 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                              <button onClick={() => decrement(item.id)} className="p-0.5 hover:text-white text-neutral-400 transition">
                                {item.quantity === 1 ? <X className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                              </button>
                              <span className="w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
                              <button onClick={() => increment(item.id)} className="p-0.5 hover:text-white text-neutral-400 transition"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-zinc-950/90 border-t border-white/5 space-y-5 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] relative z-20">
                
                {/* Options Delivery/Pickup */}
                {!tableNum && (
                  <div className="flex gap-2">
                    {Boolean(landingSettings?.is_delivery_enabled) && (
                      <button type="button" onClick={() => setType("delivery")} className={`flex-1 py-2.5 text-sm font-bold rounded-2xl border transition ${type === "delivery" ? "bg-brand/10 text-brand border-brand/50" : "bg-white/5 border-transparent text-neutral-400"}`}>
                        {t('delivery', 'Доставка')} (+30 ₪)
                      </button>
                    )}
                    {Boolean(landingSettings?.is_pickup_enabled) && (
                      <button type="button" onClick={() => setType("pickup")} className={`flex-1 py-2.5 text-sm font-bold rounded-2xl border transition ${type === "pickup" ? "bg-brand/10 text-brand border-brand/50" : "bg-white/5 border-transparent text-neutral-400"}`}>
                        {t('pickup', 'Самовывоз')} (0 ₪)
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleCheckout} className="space-y-3">
                  <div className="flex flex-col gap-2.5 pb-2">
                    <div className="flex flex-row items-center gap-4 flex-wrap bg-white/5 p-3 rounded-2xl border border-white/5">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeBread} onChange={(e) => setIncludeBread(e.target.checked)} className="w-[18px] h-[18px] accent-brand rounded" />
                        <span className="text-[14px] font-medium text-white group-hover:text-brand transition-colors">{t('bread', 'Хлеб 🍞')}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeCutlery} onChange={(e) => setIncludeCutlery(e.target.checked)} className="w-[18px] h-[18px] accent-brand rounded" />
                        <span className="text-[14px] font-medium text-white group-hover:text-brand transition-colors">{t('cutlery', 'Приборы 🍴')}</span>
                      </label>
                    </div>
                  </div>

                  {tableNum && (
                    <div className="bg-brand/10 border border-brand/30 rounded-2xl p-4 text-center">
                       <span className="text-brand font-black text-lg block mb-1">Стол №{tableNum}</span>
                       <span className="text-neutral-400 text-sm">Ваш заказ будет моментально отправлен на кухню. Пожалуйста, укажите имя, чтобы мы знали, как к вам обращаться.</span>
                    </div>
                  )}

                  <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder={`${t('name', 'Имя')} *`} className="w-full bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition" />
                  <input required value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} type="tel" placeholder={`${t('phone', 'Телефон')} *`} className="w-full bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition" />
                  
                  {!tableNum && type === "delivery" && (
                     <div className="flex flex-col gap-2">
                       <select required value={city} onChange={e => setCity(e.target.value)} className="w-full bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition appearance-none">
                         <option value="Хайфа" className="bg-zinc-900">Хайфа</option>
                         <option value="Нешер" className="bg-zinc-900">Нешер</option>
                         <option value="Тират Кармель" className="bg-zinc-900">Тират Кармель</option>
                         <option value="Крайот" className="bg-zinc-900">Крайот</option>
                       </select>
                       <div className="grid grid-cols-4 gap-2">
                         <input required value={street} onChange={e => setStreet(e.target.value)} type="text" placeholder={`${t('street', 'Улица')} *`} className="col-span-2 bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition" />
                         <input required value={house} onChange={e => setHouse(e.target.value)} type="text" placeholder={`${t('house', 'Дом')} *`} className="col-span-1 min-w-0 bg-zinc-900/50 text-white border border-white/10 px-3 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition text-center" />
                         <input value={apt} onChange={e => setApt(e.target.value)} type="text" placeholder={t('apt', 'Кв.')} className="col-span-1 min-w-0 bg-zinc-900/50 text-white border border-white/10 px-3 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition text-center" />
                       </div>
                     </div>
                  )}

                  <div className="flex gap-2">
                    <select required value={reservationDateOffset} onChange={(e) => setReservationDateOffset(parseInt(e.target.value, 10))} className="w-full bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition appearance-none">
                      {dateOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>)}
                    </select>

                    <select required value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full bg-zinc-900/50 text-white border border-white/10 px-4 py-3.5 rounded-2xl focus:outline-none focus:border-brand transition appearance-none">
                      <option value="" disabled className="bg-zinc-900">{t('time', 'Время')} *</option>
                      {availableTimeSlots.map((slot) => <option key={slot} value={slot} className="bg-zinc-900">{slot}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2 pb-2">
                     <label className={`flex items-center gap-2 flex-1 cursor-pointer border px-4 py-3 rounded-2xl transition ${payment === "cash" ? "border-brand bg-brand/10 text-white" : "bg-zinc-900/50 border-white/5 text-neutral-400"}`}>
                        <input type="radio" checked={payment === "cash"} onChange={() => setPayment("cash")} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payment === "cash" ? "border-brand" : "border-neutral-500"}`}>
                          {payment === "cash" && <div className="w-2 h-2 rounded-full bg-brand" />}
                        </div>
                        <span className="text-[13px] font-bold mt-0.5">{t('payment_cash', 'Наличными')}</span>
                     </label>
                     <label className={`flex items-center gap-2 flex-1 cursor-pointer border px-4 py-3 rounded-2xl transition ${payment === "bit" ? "border-brand bg-brand/10 text-white" : "bg-zinc-900/50 border-white/5 text-neutral-400"}`}>
                        <input type="radio" checked={payment === "bit"} onChange={() => setPayment("bit")} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payment === "bit" ? "border-brand" : "border-neutral-500"}`}>
                          {payment === "bit" && <div className="w-2 h-2 rounded-full bg-brand" />}
                        </div>
                        <span className="text-[13px] font-bold mt-0.5">{t('payment_bit', 'Bit / Перевод')}</span>
                     </label>
                  </div>

                  <div className="flex justify-between items-center pt-2 pb-4 text-white">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-sm">{t('total', 'Итого')}:</span>
                    <span className="text-4xl font-black font-outfit text-white tracking-tight">{finalTotal} ₪</span>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm mb-2 break-words">
                      <span className="font-bold">Ошибка:</span> {errorMsg}
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting} className="w-full bg-brand text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-3 transition disabled:opacity-50 hover:bg-brand/80 active:scale-95 shadow-[0_4px_20px_rgba(255,46,86,0.3)] hover:shadow-[0_4px_30px_rgba(255,46,86,0.5)] z-30">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('checkout_btn', 'Оформить заказ')}
                    {!isSubmitting && <ChevronRight className="w-5 h-5 opacity-70" />}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}
