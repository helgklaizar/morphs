"use client";

import { useState, useMemo } from "react";


interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

export default function SubscriptionClient({ items }: { items: MenuItem[] }) {
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [frequency, setFrequency] = useState<"daily" | "3days">("daily");
  
  // Selection array based on days
  const [selections, setSelections] = useState<Record<number, Record<string, number>>>({});
  const [breadRequired, setBreadRequired] = useState(false);
  const [cutleryRequired, setCutleryRequired] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cash" | "bit">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [startDateOption, setStartDateOption] = useState<"tomorrow" | "next_week">("tomorrow");


  const subscriptionDaysInfo = useMemo(() => {
    const dates: { date: Date, label: string }[] = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // set generic noon time
    
    // Select Start Date based on option
    const startDate = new Date(tomorrow);
    if (startDateOption === "next_week") {
      // Find the next Sunday (0)
      while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

    if (frequency === "daily") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push({
          date: d,
          label: `${dayNames[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`
        });
      }
    } else {
      // 3 days: Sun(0), Tue(2), Thu(4)
      const allowedDays = [0, 2, 4];
      const current = new Date(startDate);
      while (dates.length < 3) {
        if (allowedDays.includes(current.getDay())) {
          dates.push({
            date: new Date(current),
             label: `${dayNames[current.getDay()]}, ${current.getDate().toString().padStart(2, '0')}.${(current.getMonth() + 1).toString().padStart(2, '0')}`
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return dates;
  }, [frequency, startDateOption]);

  // Helpers to add/remove items per day
  const handleItemChange = (dayIdx: number, itemId: string, diff: number) => {
    setSelections(prev => {
       const daySettings = prev[dayIdx] || {};
       const currentQty = daySettings[itemId] || 0;
       const newQty = Math.max(0, currentQty + diff);
       
       return {
         ...prev,
         [dayIdx]: {
           ...daySettings,
           [itemId]: newQty
         }
       };
    });
  };

  // Calculations
  const calcTotal = useMemo(() => {
    let totalItems = 0;
    let sum = 0;
    
    // items total
    Object.values(selections).forEach(daySelects => {
      Object.entries(daySelects).forEach(([itemId, qty]) => {
         totalItems += qty;
         const item = items.find(i => i.id === itemId);
         if (item) {
           sum += item.price * qty;
         }
      });
    });

    let discount = 0;
    if (totalItems >= 14) discount = 0.10;
    else if (totalItems >= 7) discount = 0.05;

    const totalPositionsPrice = sum * (1 - discount);

    // Delivery cost
    let deliveryCost = 0;
    if (deliveryMethod === "delivery") {
       deliveryCost = frequency === "daily" ? 190 : 80;
    }

    return {
      totalItems,
      discount,
      baseSum: sum,
      totalPositionsPrice,
      deliveryCost,
      finalTotal: totalPositionsPrice + deliveryCost
    };
  }, [selections, frequency, deliveryMethod, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calcTotal.totalItems < 7) {
      alert("Необходимо выбрать минимум 7 позиций в сумме для заказа подписки.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://rms.shop';
      const formattedAddress = deliveryMethod === "delivery" ? address : "Самовывоз";
      const baseDisplayName = `${name} (Подписка - ${deliveryMethod === "delivery" ? "Доставка: " + formattedAddress : "Самовывоз"})`;

      // Find days that actually have items
      const validDays = subscriptionDaysInfo.map((dayObj, idx) => {
        const daySelects = selections[idx] || {};
        let daySum = 0;
        const dayItems: Array<{item: MenuItem, qty: number}> = [];
        Object.entries(daySelects).forEach(([itemId, qty]) => {
          if (qty > 0) {
            const item = items.find(i => i.id === itemId);
            if (item) {
              daySum += item.price * qty;
              dayItems.push({ item, qty });
            }
          }
        });
        return { dayObj, dayItems, daySum, idx };
      }).filter(d => d.dayItems.length > 0);

      const deliveryPerDay = validDays.length > 0 ? (calcTotal.deliveryCost / validDays.length) : 0;

      for (let i = 0; i < validDays.length; i++) {
        const { dayObj, dayItems, daySum } = validDays[i];
        const dayDiscount = daySum * calcTotal.discount;
        const dayTotal = daySum - dayDiscount + deliveryPerDay;

        // Custom display name includes day info
        const displayName = `${baseDisplayName} [День ${i+1} из ${validDays.length}]`;
        const isoDate = dayObj.date.toISOString();

        const orderData = {
          customer_name: displayName,
          customer_phone: phone,
          total_amount: Math.round(dayTotal),
          status: "pending",
          payment_method: payment,
          reservation_date: isoDate,
        };

        const orderRes = await fetch(`${pbUrl}/api/collections/orders/records`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData)
        });
        if (!orderRes.ok) throw new Error(await orderRes.text());
        const order = await orderRes.json();

        if (order?.id) {
          // Items
          for (const { item, qty } of dayItems) {
            const finalPrice = item.price * (1 - calcTotal.discount); // Apply discount per item logically
            await fetch(`${pbUrl}/api/collections/order_items/records`, { 
              method: "POST", 
              headers: { "Content-Type": "application/json" }, 
              body: JSON.stringify({
                order_id: order.id, menu_item_id: item.id, menu_item_name: item.name, quantity: qty, price_at_time: Math.round(finalPrice)
              }) 
            });
          }

          // Delivery / Bread / Cutlery
          if (deliveryPerDay > 0) {
            await fetch(`${pbUrl}/api/collections/order_items/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, menu_item_name: "🚚 Доставка (часть подписки)", quantity: 1, price_at_time: Math.round(deliveryPerDay) }) });
          }
          if (breadRequired) {
            await fetch(`${pbUrl}/api/collections/order_items/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, menu_item_name: "🍞 Хлеб", quantity: 1, price_at_time: 0 }) });
          }
          if (cutleryRequired) {
            await fetch(`${pbUrl}/api/collections/order_items/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, menu_item_name: "🍴 Приборы", quantity: 1, price_at_time: 0 }) });
          }

          // Telegram webhook
          try {
            await fetch(`${pbUrl}/api/webhooks/order_submit/${order.id}`, { method: "POST" });
          } catch (e) {
            console.error("Webhook error: ", e);
          }
        }
      }

      setIsSuccess(true);
      window.scrollTo(0, 0);

      // Create/Update Client logic
      try {
        const clientQuery = await fetch(`${pbUrl}/api/collections/clients/records?filter=(phone='${encodeURIComponent(phone)}')`);
        const clientData = clientQuery.ok ? await clientQuery.json() : null;
        const existingClient = clientData?.items?.[0] || null;
        const upsertData: Record<string, unknown> = { phone: phone, name: name };
        if (deliveryMethod === "delivery" && formattedAddress) upsertData.address = formattedAddress;
        
        if (existingClient) {
            await fetch(`${pbUrl}/api/collections/clients/records/${existingClient.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upsertData) });
        } else {
            await fetch(`${pbUrl}/api/collections/clients/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upsertData) });
        }
      } catch (err) { console.error("Client upsert err:", err); }

    } catch (e) {
      console.error(e);
      alert("Ошибка при оформлении заказа. Попробуйте еще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFallbackImage = (name: string) => {
    if (name.toLowerCase().includes("борщ")) return "/assets/images/rms.jpg";
    if (name.toLowerCase().includes("котлет")) return "/assets/images/kotlety.jpg";
    return "";
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-2 animate-bounce">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-3xl font-black text-white">Супер! Подписка оформлена</h2>
        <p className="text-white/60 max-w-sm">Мы разбили ваш заказ на {frequency === "daily" ? 7 : 3} дней. Вскоре с вами свяжутся или уведомят в Telegram о каждом заказе!</p>
        <button onClick={() => window.location.href = "/"} className="mt-4 px-6 py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition">Вернуться в меню</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Intro */}
      <div className="bg-gradient-to-r from-[#FF6B00]/20 to-[#FF8C38]/10 p-5 rounded-[20px] border border-[#FF6B00]/50">
        <h2 className="text-xl font-black text-[#FF6B00] mb-2 uppercase tracking-wide">Мега-подписка на еду! 🔥</h2>
        <p className="text-sm text-white/80 leading-relaxed mb-3">
          Соберите свое меню. От 7 позиций — скидка 5%. От 14 позиций — скидка 10%. Заказы принимаются минимум за сутки.
        </p>
      </div>

      {/* Settings */}
      <div className="bg-[#141414] p-5 rounded-[20px] border border-white/10 flex flex-col gap-4">
        
        {/* Start Date Option */}
        <div>
          <h3 className="font-bold text-sm text-white/50 mb-2 px-1">Когда начать?</h3>
          <div className="flex bg-[#0A0A0A] p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => { setStartDateOption("tomorrow"); setSelections({}); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${startDateOption === "tomorrow" ? "bg-white/10 text-white shadow-md" : "text-white/40"}`}
            >
              С завтрашнего дня
            </button>
            <button 
              type="button"
              onClick={() => { setStartDateOption("next_week"); setSelections({}); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${startDateOption === "next_week" ? "bg-white/10 text-white shadow-md" : "text-white/40"}`}
            >
              С новой недели (Вс)
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-white/50 mb-2 px-1 mt-1">Формат питания</h3>
          <div className="flex bg-[#0A0A0A] p-1 rounded-xl mb-3">
            <button 
              type="button"
              onClick={() => setDeliveryMethod("delivery")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryMethod === "delivery" ? "bg-[#FF6B00] text-white shadow-md" : "text-white/50"}`}
            >
              Доставка
            </button>
            <button 
              type="button"
              onClick={() => setDeliveryMethod("pickup")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${deliveryMethod === "pickup" ? "bg-[#FF6B00] text-white shadow-md" : "text-white/50"}`}
            >
              Самовывоз
            </button>
          </div>

          <div className="flex bg-[#0A0A0A] p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => { setFrequency("daily"); setSelections({}); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${frequency === "daily" ? "bg-white/10 text-white shadow-md" : "text-white/40"}`}
            >
              <span className="font-bold text-sm">На каждый день (7)</span>
              <span className="text-xs mt-1 text-white/50">{deliveryMethod === "delivery" ? "+ 190 ₪" : "Бесплатно"}</span>
            </button>
            <button 
              type="button"
              onClick={() => { setFrequency("3days"); setSelections({}); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all ${frequency === "3days" ? "bg-white/10 text-white shadow-md" : "text-white/40"}`}
            >
              <span className="font-bold text-sm">3 дня (Вс, Вт, Чт)</span>
              <span className="text-xs mt-1 text-white/50">{deliveryMethod === "delivery" ? "+ 80 ₪" : "Бесплатно"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Days selections */}
      <div className="flex flex-col gap-5">
        {subscriptionDaysInfo.map((dayObj, idx) => {
          const isTomorrow = idx === 0 && (dayObj.date.getDate() === new Date(new Date().setDate(new Date().getDate() + 1)).getDate());
          return (
          <div key={idx} className="bg-[#141414] rounded-[20px] overflow-hidden border border-white/5">
            <div className="bg-[#1E1E1E] px-4 py-3 font-bold border-b border-white/5 flex items-center gap-2">
              {isTomorrow && <span className="text-[#FF6B00] border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-2 py-0.5 rounded-lg text-xs tracking-wider uppercase">Завтра</span>}
              <span className="text-white/90">{dayObj.label}</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {items.map(item => {
                const qty = selections[idx]?.[item.id] || 0;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden shrink-0 relative">
                        {(item.image_url || getFallbackImage(item.name)) && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={item.image_url || getFallbackImage(item.name)} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          </>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-sm truncate">{item.name}</p>
                       <p className="text-xs text-[#FF6B00]">{item.price} ₪</p>
                     </div>
                     <div className="flex items-center gap-3 bg-[#0A0A0A] rounded-full p-1 border border-white/10">
                        <button 
                          onClick={() => handleItemChange(idx, item.id, -1)}
                          className="w-7 h-7 rounded-full bg-white/5 text-white/80 flex items-center justify-center text-lg active:scale-95 disabled:opacity-30"
                          disabled={qty === 0}
                        >-</button>
                        <span className="w-4 text-center text-sm font-bold">{qty}</span>
                        <button 
                          onClick={() => handleItemChange(idx, item.id, 1)}
                          className="w-7 h-7 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-lg active:scale-95"
                        >+</button>
                     </div>
                  </div>
                )
              })}
            </div>
          </div>
          );
        })}
      </div>

      {/* Extras */}
      <div className="bg-[#141414] p-5 rounded-[20px] border border-white/10 flex flex-col gap-3">
        <h3 className="font-bold text-lg mb-1">Дополнения (бесплатно)</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={breadRequired} onChange={e => setBreadRequired(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-black text-[#FF6B00] focus:ring-[#FF6B00]" />
          <span className="text-sm">Класть хлеб ко всем дням</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={cutleryRequired} onChange={e => setCutleryRequired(e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-black text-[#FF6B00] focus:ring-[#FF6B00]" />
          <span className="text-sm">Одноразовые приборы нужны</span>
        </label>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[#141414] p-5 rounded-[20px] border border-white/10 flex flex-col gap-4">
        <h3 className="font-bold text-lg mb-1">Данные для заказа</h3>
        
        <div>
          <label className="block text-xs text-white/50 mb-1 ml-1">Имя</label>
          <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="Иван" />
        </div>
        
        <div>
          <label className="block text-xs text-white/50 mb-1 ml-1">Телефон</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="05x-xxxxxxx" />
        </div>

        {deliveryMethod === "delivery" && (
          <div>
            <label className="block text-xs text-white/50 mb-1 ml-1">Адрес доставки</label>
            <input required type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] transition-colors" placeholder="Город, улица, дом, кв" />
          </div>
        )}

        <div>
          <label className="block text-xs text-white/50 mb-1 ml-1">Способ оплаты</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPayment("cash")} className={`flex-1 py-3 text-sm font-bold border rounded-xl transition-colors ${payment === "cash" ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]" : "border-white/10 text-white/40"}`}>Наличные</button>
            <button type="button" onClick={() => setPayment("bit")} className={`flex-1 py-3 text-sm font-bold border rounded-xl transition-colors ${payment === "bit" ? "border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]" : "border-white/10 text-white/40"}`}>Bit / PayBox</button>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between text-sm text-white/60">
            <span>Позиций выбрано (мин. 7)</span>
            <span className={calcTotal.totalItems >= 7 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{calcTotal.totalItems} шт</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Еда ({calcTotal.baseSum} ₪)</span>
            <span>{calcTotal.totalPositionsPrice.toFixed(0)} ₪ {calcTotal.discount > 0 && <span className="text-[#FF6B00] text-xs">(-{calcTotal.discount * 100}%)</span>}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60">
            <span>Доставка</span>
            <span>{calcTotal.deliveryCost > 0 ? `${calcTotal.deliveryCost} ₪` : "Бесплатно"}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-white mt-2 pb-2">
            <span>Итого</span>
            <span>{calcTotal.finalTotal.toFixed(0)} ₪</span>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={calcTotal.totalItems < 7 || isSubmitting}
          className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale disabled:scale-100 mt-2 shadow-[0_4px_20px_rgba(255,107,0,0.4)] flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <span className="block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : calcTotal.totalItems < 7 ? (
            "Выберите еще " + (7 - calcTotal.totalItems) + " позиции"
          ) : (
            "Заказать подписку"
          )}
        </button>
      </form>
    </div>
  );
}
