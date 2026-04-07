"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ShoppingBag, MapPin, Phone, Info, Share2, Truck, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import CartSheet from "@/components/CartSheet";
import { useLocaleStore, translate, LOCAL_TRANSLATIONS, Locale } from "@/store/localeStore";

// Steam Animation
const SteamAnimation = () => {
  return (
    <div className="absolute left-[50%] top-[40%] -translate-x-[50%] -translate-y-[50%] flex gap-2 sm:gap-4 pointer-events-none z-40 w-full justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
           key={i}
           className="w-16 sm:w-20 h-28 sm:h-40 bg-white/70 blur-[10px] sm:blur-[14px] rounded-full mix-blend-screen"
           animate={{
             y: [0, -140],
             x: i === 1 ? [0, -40, 15, -25] : i === 2 ? [0, 25, -25, 20] : [0, -20, 30, -25],
             opacity: [0, 0.95, 0],
             scale: [1, 3.5]
           }}
           transition={{
             duration: 3.5 + i * 0.5,
             repeat: Infinity,
             ease: "easeInOut",
             delay: i * 0.4,
           }}
        />
      ))}
    </div>
  )
}

interface MenuItem { id: string; name: string; name_en?: string; name_he?: string; name_uk?: string; price: number; is_poll?: boolean; category_id?: string; description?: string; description_en?: string; description_he?: string; description_uk?: string; stock: number; image_url?: string; composition?: string; }
interface Category { id: string; name: string; name_en?: string; name_he?: string; name_uk?: string; }
interface LandingSettingsType { is_preorder_mode?: boolean; is_delivery_enabled?: boolean; is_pickup_enabled?: boolean; hero_title?: string; hero_title_en?: string; hero_title_he?: string; hero_title_uk?: string; contact_phone?: string; address?: string; is_taking_orders?: boolean; hero_subtitle?: string; hero_subtitle_en?: string; hero_subtitle_he?: string; hero_subtitle_uk?: string; about_text?: string; about_text_en?: string; about_text_he?: string; about_text_uk?: string; show_loyalty_block?: boolean; show_promo_block?: boolean; }
interface SysTranslation { key: string; ru: string; en?: string; he?: string; uk?: string; }

export default function LandingClient({ menuItems, landingSettings, categories, systemTranslations }: { menuItems: MenuItem[], landingSettings: LandingSettingsType, categories: Category[], systemTranslations: SysTranslation[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [tableNum, setTableNum] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setTableNum(sp.get('table'));
    }
  }, []);

  const { items: cartItems, addItem, removeItem, setIsOpen } = useCartStore();
  const reservationDateOffset = useCartStore((state) => state.reservationDateOffset);
  const setReservationDateOffset = useCartStore((state) => state.setReservationDateOffset);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [isPastLastSlot, setIsPastLastSlot] = useState(false);
  useEffect(() => {
    setIsPastLastSlot(new Date().getHours() >= 20);
  }, []);

  const forceTomorrow = landingSettings?.is_preorder_mode || (!landingSettings?.is_delivery_enabled && !landingSettings?.is_pickup_enabled) || isPastLastSlot;

  useEffect(() => {
    if ((forceTomorrow || isPastLastSlot) && reservationDateOffset === 0) {
      setReservationDateOffset(1);
    }
  }, [isPastLastSlot, forceTomorrow, reservationDateOffset, setReservationDateOffset]);

  const { locale, systemTranslations: storeSysTranslations, setLocale, setSystemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = storeSysTranslations.find(x => x.key === key) || systemTranslations?.find(x => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (systemTranslations && systemTranslations.length > 0) {
      if (JSON.stringify(systemTranslations) !== JSON.stringify(storeSysTranslations)) {
        setSystemTranslations(systemTranslations);
      }
    }
    if (typeof window !== "undefined" && localStorage.getItem("has_picked_loc") !== "true") {
      setShowLanguageModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemTranslations]);
  
  const handleLangSelect = (lang: Locale) => {
    setLocale(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_picked_loc", "true");
    }
    setShowLanguageModal(false);
  };

  const getFallbackImage = (name: string) => {
    if (name.toLowerCase().includes("борщ") || name.toLowerCase().includes("rms")) return "/assets/images/rms.jpg";
    if (name.toLowerCase().includes("котлет") || name.toLowerCase().includes("пюр")) return "/assets/images/kotlety.jpg";
    return "";
  };

  const handleShare = async (item: MenuItem) => {
    const title = translate(locale, item.name, item.name_en, item.name_he, item.name_uk);
    const desc = translate(locale, item.description ?? '', item.description_en, item.description_he, item.description_uk);
    const text = `🔥 ${title}\n${desc ? desc + "\n" : ""}${t("price", "Цена")}: ${item.price} ₪\n\n${t("menu_and_order", "Меню и заказ тут")}: https://rms.shop/`;
    if (navigator.share) {
      navigator.share({ title: title, text, url: "https://rms.shop/" }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(t("link_copied", "Ссылка скопирована"));
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCategory === "POLL") return menuItems?.filter(i => i.is_poll);
    if (!selectedCategory || selectedCategory === "all") return menuItems;
    return menuItems?.filter(i => i.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  return (
    <main className="min-h-screen w-full relative overflow-clip pb-32 bg-zinc-950 font-inter text-white">

      {/* Unified Fixed Header */}
      <header 
        className="fixed top-0 inset-x-0 z-[60] px-4 sm:px-6 py-3 flex items-start justify-between transition-colors duration-300 pointer-events-none"
        style={{ backgroundColor: scrollY > 50 ? "rgba(9,9,11,0.95)" : "transparent", backdropFilter: scrollY > 50 ? "blur(12px)" : "none", borderBottom: scrollY > 50 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
      >
        {/* Left: Logo */}
        <div 
          className="flex items-center transition-opacity duration-200 pointer-events-auto mt-1"
          style={{ opacity: scrollY > 100 ? 1 : 0, pointerEvents: scrollY > 100 ? "auto" : "none" }}
        >
          <div className="w-[30px] h-[30px] rounded-xl overflow-hidden mr-3 shrink-0 bg-[#ff6b00]/20 border border-[#ff6b00]/50 flex items-center justify-center">
            <span className="font-outfit font-black text-[#ff6b00] text-[14px]">B.</span>
          </div>
          <span className="font-outfit font-black text-[18px] tracking-tight">
            {translate(locale, landingSettings?.hero_title || "RMS AI OS", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 pointer-events-auto mt-1">
          <a 
            href={`tel:${landingSettings?.contact_phone?.replace(/\D/g, '') || "0549587707"}`}
            title={t("call_us", "Позвонить")}
            className="flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
          >
            <Phone className="w-[16px] h-[16px] text-white/90" />
          </a>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(landingSettings?.address || "Ha-Ne'emanim St 15, Haifa")}`}
            target="_blank"
            title={t("our_address", "Наш адрес")}
            className="flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
          >
            <MapPin className="w-[16px] h-[16px] text-white/90" />
          </a>
          
          <div title={t("delivery", "Доставка")} className={`flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_delivery_enabled ? "border-[#00C853]/50 text-[#00C853]" : "border-red-500/50 text-red-500"}`}>
            <Truck className="w-[16px] h-[16px]" />
          </div>
          <div title={t("pickup", "Самовывоз")} className={`flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_pickup_enabled ? "border-[#00C853]/50 text-[#00C853]" : "border-red-500/50 text-red-500"}`}>
            <ShoppingBag className="w-[16px] h-[16px]" />
          </div>

          <button 
            onClick={() => setShowLanguageModal(true)}
            className="flex items-center justify-center bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 px-2.5 h-[36px] rounded-xl active:scale-95 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <span className="text-[14px] leading-none mt-[1px]">
              {locale === 'ru' ? '🇷🇺' : locale === 'he' ? '🇮🇱' : locale === 'uk' ? '🇺🇦' : '🇺🇸'}
            </span>
          </button>
        </div>
      </header>
      
      {/* Table Badge */}
      <AnimatePresence>
        {tableNum && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] pointer-events-none"
          >
            <div className="bg-orange-500 text-white font-bold px-6 py-2 rounded-full shadow-lg border border-orange-400 flex items-center gap-2 whitespace-nowrap">
              <span className="text-xl">🙌</span> Вы находитесь за столом №{tableNum}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Bottom Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div className="fixed bottom-6 left-4 right-4 md:left-[50%] md:-translate-x-[50%] md:w-[600px] z-[80] flex justify-center pointer-events-none">
            <motion.button 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="pointer-events-auto w-full bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] shadow-xl shadow-[#ff6b00]/30 hover:brightness-110 text-white py-4 px-5 rounded-xl flex items-center justify-between font-bold border border-[#ff6b00]/20 transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <span className="bg-white/20 w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shadow-sm">
                  {cartCount}
                </span>
                <span className="text-[15px]">{t('cart', 'Корзина')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black">{cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)} ₪</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Hero Background - RMS Premium Classic */}
      <div className="relative w-full flex flex-col min-h-[500px] sm:min-h-[600px] bg-[#09090b] overflow-hidden">
        {/* Top Image Section with subtle parallax */}
        <motion.div style={{ y: heroY }} className="absolute inset-x-0 top-0 h-[75%] sm:h-[80%] z-0">
          <Image src="/assets/images/black-hero.jpg" alt="Background" width={1200} height={800} className="w-full h-full object-cover select-none scale-[1.15]" priority />
          <SteamAnimation />
        </motion.div>

        {/* Gradient fades image into black background */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent pointer-events-none z-0" />
        {/* Overlay on top */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#09090b]/80 to-transparent pointer-events-none z-0" />

        {/* Bottom Editorial Text Section */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-end flex-1 pt-[65%] sm:pt-[400px]">
          <div className="px-4 sm:px-6 md:px-12 pb-6 sm:pb-8 w-full flex flex-col items-start text-left">
            
            {landingSettings?.is_taking_orders === false && (
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg bg-red-500/10 text-red-500 border border-red-500/20 py-3 px-6 rounded-2xl mb-6 flex items-center gap-3 font-semibold relative z-20">
                 <Info size={18} /> {t('closed', 'К сожалению, мы сейчас не принимаем заказы.')}
               </motion.div>
            )}

            <h1 className="text-[48px] sm:text-[64px] lg:text-[88px] font-outfit font-black tracking-tighter leading-[0.95] text-transparent bg-clip-text bg-gradient-to-br from-white via-[#EFEFEF] to-[#777] mb-6 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] pr-4 max-w-4xl">
              {translate(locale, landingSettings?.hero_title || "RMS be Shhuna", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
            </h1>

            {/* Hero Text Layout */}
            <div className="flex flex-col gap-6 w-full max-w-2xl mt-4">
              <div className="flex flex-col w-full">
                <div className="w-12 h-[4px] rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] mb-4 shadow-[0_0_12px_rgba(255,107,0,0.5)]" />
                <p className="text-[#ff6b00] text-[15px] sm:text-[16px] font-[800] tracking-[0.1em] uppercase m-0 leading-snug drop-shadow-md">
                  {translate(locale, landingSettings?.hero_subtitle || "Вкусная домашняя кухня", landingSettings?.hero_subtitle_en, landingSettings?.hero_subtitle_he, landingSettings?.hero_subtitle_uk)}
                </p>
              </div>

              <p className="text-white/90 text-[15px] sm:text-[16px] leading-[1.6] font-medium m-0 whitespace-pre-line drop-shadow-lg">
                {translate(locale, landingSettings?.about_text || "Мы тут на районе наварили шикарного домашнего борща и приглашаем всех желающих вкусно и сытно откушать!\n\nГотовили с душой, как для себя! Порции наливаем от души, идеально, чтобы плотно пообедать.", landingSettings?.about_text_en, landingSettings?.about_text_he, landingSettings?.about_text_uk)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Header: Subscription Banner + Categories */}
      <section className="sticky top-[60px] z-[50] py-4 sm:py-5 bg-[#09090b]/95 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
          
          {/* Subscription Banner */}
          <div className="w-full">
            <Link 
              href="/subscription"
              className="w-full bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] shadow-lg shadow-[#ff6b00]/30 hover:brightness-110 text-white font-black py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-[#ff6b00]/20"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
              <span className="text-[13px] sm:text-[15px] uppercase tracking-wider relative top-[1px] text-shadow-sm font-bold">
                {t("weekly_sub_discount", "Заказ на неделю со скидкой")}
              </span>
            </Link>
          </div>

          {/* Categories and Preorder Switcher */}
          <div className="flex flex-col xl:flex-row items-center gap-4 w-full">
            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar snap-x hide-scrollbar w-full">
            <button
               onClick={() => {
                  setSelectedCategory("all");
                  window.scrollTo({ top: 400, behavior: 'smooth' });
               }}
               className={`snap-start whitespace-nowrap px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-[14px] transition-all border ${selectedCategory === "all" || selectedCategory === null ? "bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] text-white shadow-md shadow-[#ff6b00]/30 border-[#ff6b00]/20" : "bg-[#1c1c1e] border-white/5 text-zinc-400 hover:text-white"}`}
            >
               {t("full_menu", "Всё меню")}
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                   setSelectedCategory(cat.id);
                   window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className={`snap-start whitespace-nowrap px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-[14px] transition-all border ${selectedCategory === cat.id ? "bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] text-white shadow-md shadow-[#ff6b00]/30 border-[#ff6b00]/20" : "bg-[#1c1c1e] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"}`}
              >
                {translate(locale, cat.name, cat.name_en, cat.name_he, cat.name_uk)}
              </button>
            ))}
            <button
               onClick={() => {
                  setSelectedCategory("POLL");
                  window.scrollTo({ top: 400, behavior: 'smooth' });
               }}
               className={`snap-start whitespace-nowrap px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-[14px] transition-all border ${selectedCategory === "POLL" ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md shadow-purple-500/20" : "bg-[#1c1c1e] border-white/5 text-purple-400/80 hover:text-purple-300 hover:border-purple-500/30"}`}
            >
            </button>
            </div>

          </div>
        </div>
      </section>

      {/* Marketing Banners */}
      <section className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {landingSettings?.show_promo_block && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-orange-500/20 to-rose-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div>
                <h3 className="text-orange-400 font-black text-lg mb-1">{t("promo_title", "Скидка на заказ!")}</h3>
                <p className="text-white/80 text-sm">{t("promo_desc", "Используйте код WELCOME10 в корзине и получите 10% скидку.")}</p>
              </div>
              <div className="bg-orange-500 text-white font-black px-4 py-2 rounded-xl text-lg tracking-wider transform -rotate-2 border border-orange-400/50 shadow-md">
                WELCOME10
              </div>
            </motion.div>
          )}

          {landingSettings?.show_loyalty_block && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-lg">
              <div className="bg-purple-500/20 text-purple-400 p-3 rounded-xl shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-purple-400 font-black text-lg mb-1">{t("loyalty_title", "Программа кэшбека")}</h3>
                <p className="text-white/80 text-sm">
                  {t("loyalty_desc", "Мы возвращаем 5% с каждого заказа! Просто укажите телефон в корзине.")}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Items Grid with Massive Food Images */}
      <section className="px-4 sm:px-6 md:px-12 max-w-7xl mx-auto mt-6 sm:mt-8 min-h-[40vh]">
        {filteredItems?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900/40 rounded-3xl border border-white/5 h-64 mx-auto max-w-2xl">
            <ShoppingBag size={48} className="mb-4 text-zinc-600" />
            <p className="text-xl font-bold font-outfit text-white mb-2">{t("nothing_here", "Тут пока ничего нет")}</p>
            <p className="text-zinc-500 max-w-sm">{t("empty_category_desc", "Мы скоро добавим вкусные позиции в этот раздел. Заглядывайте позже!")}</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredItems?.map((item) => {
                 const isOutOfStock = (item.stock === 0 && !item.is_poll && !forceTomorrow && reservationDateOffset === 0);
                 const canOrder = landingSettings?.is_taking_orders !== false;
                 return (
                  <motion.div 
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                    className={`bg-[#1c1c1e] border-none rounded-2xl overflow-hidden relative group flex flex-col w-full`}
                  >
                    
                    {/* Share Button Overlay */}
                    <button onClick={() => handleShare(item)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center z-[25] backdrop-blur-sm transition-all cursor-pointer group/share pointer-events-auto">
                      <Share2 size={13} className="text-white/80 group-hover/share:text-white" />
                    </button>

                    {/* Left badges */}
                    {isOutOfStock && <div className="absolute top-3 left-3 z-[25] text-[11px] font-bold bg-red-500/90 backdrop-blur-md shadow-md text-white py-1 px-2.5 rounded-xl">{t("out_of_stock", "Закончилось")}</div>}
                    {Boolean(item.is_poll) && <div className="absolute top-3 left-3 z-[25] text-[11px] font-bold uppercase tracking-wider bg-purple-500/90 backdrop-blur-md shadow-md text-white py-1 px-2.5 rounded-xl">{t("poll", "Опрос")}</div>}

                    {/* Image Header - Edge to Edge */}
                    <div className="w-full aspect-[4/3] relative bg-zinc-800 shrink-0">
                      {(item.image_url || getFallbackImage(item.name)) ? (
                          <img src={item.image_url || getFallbackImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <span className="text-4xl opacity-40">🍽️</span>
                          </div>
                      )}
                      
                      {/* Price Badge Over Image (Bottom Left) */}
                      {!item.is_poll && (
                        <div className="absolute bottom-2 left-2 z-[20] flex items-center">
                          <span className="font-outfit font-black text-[14px] text-[#ff6b00] tracking-wide drop-shadow bg-[#2a1708]/90 px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-[#ff6b00]/20">
                            {item.price} <span className="text-[11px]">₪</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col flex-1 px-3 pt-3 pb-3 z-20 relative">
                       <h3 className="font-outfit font-bold text-[15px] text-white leading-tight mb-1.5">
                         {translate(locale, item.name, item.name_en, item.name_he, item.name_uk)}
                       </h3>
                       {item.description && (
                          <p className="text-[#8e8e93] text-[12px] leading-[1.3] line-clamp-3 mb-2">
                            {translate(locale, item.description, item.description_en, item.description_he, item.description_uk)}
                          </p>
                       )}
                       {item.composition && (
                          <p className="text-zinc-500 text-[11px] mb-4 line-clamp-2">
                            <span className="font-semibold">{t("composition", "Состав:")} </span> 
                            {item.composition}
                          </p>
                       )}
                       
                       <div className="flex-1" />
                       
                       {/* Add to Cart Actions */}
                       <div className="mt-auto">
                        {item.is_poll ? (
                          <button className="w-full py-3 sm:py-2.5 rounded-xl border border-purple-500/30 bg-purple-600/90 hover:bg-purple-600 text-white text-[13px] sm:text-[14px] font-bold text-center active:scale-95 transition-all shadow-md shadow-purple-600/20">
                            {t("want_in_menu_btn", "Хочу в меню!")}
                          </button>
                        ) : !canOrder ? (
                          <button disabled className="bg-white/5 text-white/30 px-6 py-3 sm:py-2.5 rounded-xl w-full font-bold cursor-not-allowed text-[13px] sm:text-[14px]">
                            {t('closed', 'Закрыто')}
                          </button>
                        ) : (
                          (() => {
                            const cartItem = cartItems.find(i => i.id === item.id);
                            const quantity = cartItem?.quantity || 0;
                            
                            if (quantity > 0) {
                              return (
                                <div className="flex overflow-hidden bg-[#141414] border border-white/10 rounded-xl h-[42px] sm:h-[40px] shadow-sm">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                    className="w-[50px] shrink-0 bg-transparent hover:bg-white/5 text-white flex items-center justify-center font-bold text-[18px] transition-colors"
                                  >
                                    −
                                  </button>
                                  <div className="flex-1 flex items-center justify-center text-[13px] sm:text-[14px] font-bold text-white">
                                    {quantity} {t("pieces_short", "шт")}
                                  </div>
                                  <button 
                                    disabled={isOutOfStock}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      addItem({
                                        id: item.id,
                                        name: translate(locale, item.name, item.name_en, item.name_he, item.name_uk),
                                        price: item.price,
                                        image_url: item.image_url || getFallbackImage(item.name),
                                        stock: (forceTomorrow || reservationDateOffset > 0) ? 999 : item.stock,
                                        is_poll: item.is_poll,
                                        quantity: 1
                                      }); 
                                    }}
                                    className={`w-[50px] shrink-0 flex items-center justify-center font-bold text-[18px] transition-colors ${isOutOfStock ? "bg-red-500/10 text-red-500/50 cursor-not-allowed" : "bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] hover:brightness-110 text-white shadow-lg shadow-[#ff6b00]/30 border-l border-[#ff6b00]/20"}`}
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            }
                            
                            return (
                              <button 
                                disabled={isOutOfStock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addItem({
                                    id: item.id,
                                    name: translate(locale, item.name, item.name_en, item.name_he, item.name_uk),
                                    price: item.price,
                                    image_url: item.image_url || getFallbackImage(item.name),
                                    stock: (forceTomorrow || reservationDateOffset > 0) ? 999 : item.stock,
                                    is_poll: item.is_poll,
                                    quantity: 1
                                  });
                                }}
                                className={`w-full py-3 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-[14px] flex items-center justify-center transition-all active:scale-95 border ${isOutOfStock ? "bg-red-500/10 border-red-500/20 text-red-500/50 cursor-not-allowed" : "bg-gradient-to-r from-[#ff6b00] to-[#ff8c38] shadow-md shadow-[#ff6b00]/30 hover:brightness-110 text-white border-[#ff6b00]/20"}`}
                              >
                                {isOutOfStock ? t("out_of_stock_btn", "Нет в наличии") : `+ ${t("add_to_cart", "В корзину")}`}
                              </button>
                            );
                          })()
                        )}
                       </div>
                    </div>
                  </motion.div>
                 )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

       {/* Language Modal */}
       <AnimatePresence>
        {showLanguageModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-zinc-900 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              <div className="p-5 text-center border-b border-white/5 bg-black/20">
                <h3 className="text-white font-bold font-outfit text-xl tracking-tight">Select Language</h3>
              </div>
              <div className="p-3 gap-1 flex flex-col">
                <button onClick={() => handleLangSelect("he")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-2xl flex items-center justify-between group">
                  <span className="text-white text-lg font-bold group-hover:text-brand transition-colors">🇮🇱 עברית</span>
                  {locale === 'he' && <span className="text-brand">✓</span>}
                </button>
                <button onClick={() => handleLangSelect("ru")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-2xl flex items-center justify-between group">
                  <span className="text-white text-lg font-bold group-hover:text-brand transition-colors">🇷🇺 Русский</span>
                  {locale === 'ru' && <span className="text-brand">✓</span>}
                </button>
                <button onClick={() => handleLangSelect("uk")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-2xl flex items-center justify-between group">
                  <span className="text-white text-lg font-bold group-hover:text-brand transition-colors">🇺🇦 Українська</span>
                  {locale === 'uk' && <span className="text-brand">✓</span>}
                </button>
                <button onClick={() => handleLangSelect("en")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-2xl flex items-center justify-between group">
                  <span className="text-white text-lg font-bold group-hover:text-brand transition-colors">🇺🇸 English</span>
                  {locale === 'en' && <span className="text-brand">✓</span>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet landingSettings={landingSettings as any} />
    </main>
  );
}
