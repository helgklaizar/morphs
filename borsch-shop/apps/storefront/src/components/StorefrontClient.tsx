"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ShoppingBag, ChevronRight, MapPin, Phone, Info, Share2, Truck } from "lucide-react";
import Image from "next/image";
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

export default function StorefrontClient({ menuItems, landingSettings, categories, systemTranslations }: { menuItems: Record<string, any>[], landingSettings: Record<string, any>, categories: Record<string, any>[], systemTranslations: Record<string, any>[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const { items: cartItems, addItem, setIsOpen } = useCartStore();
  const reservationDateOffset = useCartStore((state) => state.reservationDateOffset);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const forceTomorrow = landingSettings?.is_only_preorder || (!landingSettings?.is_delivery_enabled && !landingSettings?.is_pickup_enabled);

  const { locale, systemTranslations: storeSysTranslations, setLocale, setSystemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = storeSysTranslations.find(x => x.key === key) || systemTranslations?.find((x: Record<string, any>) => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
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
      setSystemTranslations(systemTranslations);
    }
    if (typeof window !== "undefined" && localStorage.getItem("has_picked_loc") !== "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowLanguageModal(true);
    }
  }, [systemTranslations, setSystemTranslations]);
  
  const handleLangSelect = (lang: Locale) => {
    setLocale(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_picked_loc", "true");
    }
    setShowLanguageModal(false);
  };

  const getFallbackImage = (name: string) => {
    if (name.toLowerCase().includes("борщ") || name.toLowerCase().includes("borsch")) return "/assets/images/borsch.jpg";
    if (name.toLowerCase().includes("котлет") || name.toLowerCase().includes("пюр")) return "/assets/images/kotlety.jpg";
    return "";
  };

  const handleShare = async (item: Record<string, any>) => {
    const title = translate(locale, item.name, item.name_en, item.name_he, item.name_uk);
    const desc = translate(locale, item.description ?? '', item.description_en, item.description_he, item.description_uk);
    const text = `🔥 ${title}\n${desc ? desc + "\n" : ""}${t("price", "Цена")}: ${item.price} ₪\n\n${t("menu_and_order", "Меню и заказ тут")}: https://borsch.shop/`;
    if (navigator.share) {
      navigator.share({ title: title, text, url: "https://borsch.shop/" }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(t("link_copied", "Ссылка скопирована"));
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCategory === "POLL") return menuItems?.filter((i: Record<string, any>) => i.is_poll);
    if (!selectedCategory || selectedCategory === "all") return menuItems;
    return menuItems?.filter((i: Record<string, any>) => i.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  return (
    <main className="min-h-screen w-full relative overflow-x-hidden pb-32 bg-zinc-950 font-inter text-white">

      {/* Top Banner Status */}
      <div 
        className="fixed top-0 left-0 right-0 z-[60] px-4 pt-[18px] pb-4 flex items-center justify-between transition-colors duration-300 pointer-events-none"
        style={{
          backgroundColor: scrollY > 100 ? "rgba(9,9,11,1)" : "transparent",
        }}
      >
        <div 
          className="flex items-center transition-opacity duration-200 pointer-events-auto"
          style={{ opacity: scrollY > 100 ? 1 : 0, pointerEvents: scrollY > 100 ? "auto" : "none" }}
        >
          <div className="w-[28px] h-[28px] rounded-full overflow-hidden mr-2.5 shrink-0 bg-brand/20 border border-brand/50 flex items-center justify-center">
            <span className="font-outfit font-black text-brand text-[12px]">B.</span>
          </div>
          <span className="font-outfit font-black text-[16px] tracking-tight">
            {translate(locale, landingSettings?.hero_title || "Borsch Shop", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
          </span>
        </div>
      </div>

      {/* Floating Header Icons */}
      <div className="fixed top-[12px] right-4 z-[70] flex items-center justify-end pointer-events-none gap-2">
        <a 
          href={`tel:${landingSettings?.contact_phone?.replace(/\D/g, '') || "0549587707"}`}
          title={t("call_us", "Позвонить")}
          className="pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/60 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,107,0,0.5)] cursor-pointer"
        >
          <Phone className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </a>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(landingSettings?.address || "Ha-Ne'emanim St 15, Haifa")}`}
          target="_blank"
          title={t("our_address", "Наш адрес")}
          className="pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/60 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,107,0,0.5)] cursor-pointer"
        >
          <MapPin className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </a>
        
        <div title={t("delivery", "Доставка")} className={`pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/60 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_delivery_enabled ? "border-[#00C853] shadow-[0_0_10px_rgba(0,200,83,0.4)] hover:shadow-[0_0_15px_rgba(0,200,83,0.7)]" : "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]"}`}>
          <Truck className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </div>
        <div title={t("pickup", "Самовывоз")} className={`pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/60 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_pickup_enabled ? "border-[#00C853] shadow-[0_0_10px_rgba(0,200,83,0.4)] hover:shadow-[0_0_15px_rgba(0,200,83,0.7)]" : "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]"}`}>
          <ShoppingBag className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </div>

        {/* Right Side: Language Switcher */}
        <button 
          onClick={() => setShowLanguageModal(true)}
          className="pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 px-2.5 h-[34px] rounded-full active:scale-95 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-white/10 shrink-0"
        >
          <span className="text-[14px] leading-none drop-shadow-md mt-[1px]">
            {locale === 'ru' ? '🇷🇺' : locale === 'he' ? '🇮🇱' : locale === 'uk' ? '🇺🇦' : '🇺🇸'}
          </span>
        </button>
      </div>
      
      {/* Floating Bottom Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div className="fixed bottom-6 left-4 right-4 md:left-[50%] md:-translate-x-[50%] md:w-auto md:min-w-[400px] z-[80] flex justify-center pointer-events-none">
            <motion.button 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="pointer-events-auto w-full bg-gradient-to-r from-brand to-[#ff8c38] text-white p-4 rounded-2xl shadow-[0_4px_25px_rgba(255,107,0,0.5)] flex items-center justify-between font-bold group hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl relative">
                  <ShoppingBag size={24} />
                  <span className="absolute -top-2 -right-2 bg-white text-brand w-6 h-6 flex items-center justify-center rounded-full text-xs font-black shadow-sm">
                    {cartCount}
                  </span>
                </div>
                <div className="text-left leading-tight">
                  <span className="block text-[13px] opacity-90">{t('your_order', 'Ваш заказ')}</span>
                  <span className="block text-lg font-black">{cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)} ₪</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl group-hover:bg-white/30 transition">
                <span>{t('checkout_btn', 'Оформить')}</span>
                <ChevronRight size={18} />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Hero Background - Borsch Premium Classic */}
      <div className="relative w-full flex flex-col min-h-[500px] bg-[#050505] overflow-hidden">
        {/* Top Image Section with subtle parallax */}
        <motion.div style={{ y: heroY }} className="absolute inset-x-0 top-0 h-[65%] sm:h-[75%] z-0">
          <Image src="/assets/images/black-hero.jpg" alt="Background" width={1200} height={800} className="w-full h-full object-cover select-none scale-[1.15]" priority />
          <SteamAnimation />
        </motion.div>

        {/* Gradient fades image into black background */}
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none z-0" />
        {/* Overlay on top */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050505]/80 to-transparent pointer-events-none z-0" />

        {/* Bottom Editorial Text Section */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col mt-auto pt-[85%] sm:pt-[450px]">
          <div className="px-5 pb-8 sm:pb-12 w-full flex flex-col items-start text-left">
            
            {landingSettings?.is_taking_orders === false && (
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg bg-red-500/10 text-red-500 border border-red-500/20 py-3 px-6 rounded-2xl mb-6 flex items-center gap-3 font-semibold relative z-20">
                 <Info size={18} /> {t('closed', 'К сожалению, мы сейчас не принимаем заказы.')}
               </motion.div>
            )}

            <h1 className="text-[52px] sm:text-[72px] lg:text-[88px] font-outfit font-black tracking-tighter leading-[0.95] text-transparent bg-clip-text bg-gradient-to-br from-white via-[#EFEFEF] to-[#777] mb-6 drop-shadow-sm pr-4 max-w-4xl">
              {translate(locale, landingSettings?.hero_title || "Borsch be Shhuna", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 lg:gap-16 w-full pr-4">
              <div className="flex flex-col max-w-md">
                <div className="w-12 h-[4px] rounded-full bg-gradient-to-r from-brand to-[#FF8C38] mb-4 shadow-[0_0_12px_rgba(255,107,0,0.5)]" />
                <p className="text-brand text-[15px] sm:text-[17px] font-[700] tracking-[0.1em] uppercase m-0 leading-none mb-3">
                  {translate(locale, landingSettings?.hero_subtitle || "Вкусная домашняя кухня", landingSettings?.hero_subtitle_en, landingSettings?.hero_subtitle_he, landingSettings?.hero_subtitle_uk)}
                </p>
              </div>

              <p className="text-white/60 text-[14px] sm:text-[16px] leading-[1.65] max-w-[500px] font-medium m-0 whitespace-pre-line">
                {translate(locale, landingSettings?.about_text || "Мы тут на районе наварили шикарного домашнего борща и приглашаем всех желающих вкусно и сытно откушать!\n\nГотовили с душой, как для себя! Порции наливаем от души, идеально, чтобы плотно пообедать.", landingSettings?.about_text_en, landingSettings?.about_text_he, landingSettings?.about_text_uk)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <section className="px-6 max-w-7xl mx-auto mt-6 md:mt-12 relative z-[50] py-4 bg-zinc-950/95 backdrop-blur-xl -mx-6 md:mx-auto md:border-transparent md:bg-transparent border-y border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] md:shadow-none">
         <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-2 px-6 md:px-0 hide-scrollbar">
           <button
              onClick={() => setSelectedCategory("all")}
              className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-all border ${selectedCategory === "all" || selectedCategory === null ? "bg-brand text-white shadow-lg shadow-brand/30 border-brand" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"}`}
           >
              {t("full_menu", "Всё меню")}
           </button>
           {categories?.map((cat: Record<string, any>) => (
             <button
               key={cat.id}
               onClick={() => setSelectedCategory(cat.id)}
               className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-all border ${selectedCategory === cat.id ? "bg-brand/10 text-brand shadow-lg shadow-brand/20 border-brand/50" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"}`}
             >
               {translate(locale, cat.name, cat.name_en, cat.name_he, cat.name_uk)}
             </button>
           ))}
           <button
              onClick={() => setSelectedCategory("POLL")}
              className={`snap-start whitespace-nowrap px-6 py-2.5 rounded-full font-bold transition-all border ${selectedCategory === "POLL" ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/10" : "bg-zinc-900 border-white/5 text-purple-400/80 hover:text-purple-300 hover:border-purple-500/30"}`}
           >
              {t("want_in_menu", "🔥 Хочу в меню")}
           </button>
         </div>
      </section>

      {/* Items Grid with Massive Food Images */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mt-6 min-h-[40vh]">
        {filteredItems?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900/40 rounded-3xl border border-white/5 h-64 mx-auto max-w-2xl">
            <ShoppingBag size={48} className="mb-4 text-zinc-600" />
            <p className="text-xl font-bold font-outfit text-white mb-2">{t("nothing_here", "Тут пока ничего нет")}</p>
            <p className="text-zinc-500 max-w-sm">{t("empty_category_desc", "Мы скоро добавим вкусные позиции в этот раздел. Заглядывайте позже!")}</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredItems?.map((item: Record<string, any>) => {
                 const isOutOfStock = (item.stock === 0 && !item.is_poll && !forceTomorrow && reservationDateOffset === 0);
                 const canOrder = landingSettings?.is_taking_orders !== false;
                 return (
                  <motion.div 
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
                    className={`bg-zinc-900/60 backdrop-blur-md border ${isOutOfStock ? "border-red-500/30" : "border-white/5 hover:border-brand/40"} rounded-[32px] p-2.5 relative group flex flex-col w-full transition-all hover:shadow-[0_12px_44px_rgba(255,107,0,0.15)] hover:-translate-y-1`}
                  >
                    
                    {/* Share Button Overlay */}
                    <button onClick={() => handleShare(item)} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/50 border border-white/10 hover:border-white/40 hover:bg-black/70 flex items-center justify-center z-[25] backdrop-blur-sm transition-all cursor-pointer group/share pointer-events-auto shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                      <Share2 size={15} className="text-white/80 group-hover/share:text-white" />
                    </button>

                    {/* Left badges */}
                    {isOutOfStock && <div className="absolute top-5 left-5 z-[25] text-[11px] font-bold bg-red-500/90 backdrop-blur-md shadow-md text-white py-1.5 px-3 rounded-full border border-red-500/20">{t("out_of_stock", "Закончилось")}</div>}
                    {Boolean(item.is_poll) && <div className="absolute top-5 left-5 z-[25] text-[11px] font-bold uppercase tracking-wider bg-purple-500/90 backdrop-blur-md shadow-md text-white py-1.5 px-3 rounded-full border border-purple-500/20">{t("poll", "Опрос")}</div>}

                    {/* Massive Image Header - Inset Premium Style */}
                    <div className="w-full aspect-[1/0.95] relative bg-zinc-800 overflow-hidden rounded-[24px] z-10 shrink-0">
                      <div className="absolute inset-0 bg-black/10 z-[15] pointer-events-none group-hover:bg-black/0 transition-colors" />
                      {(item.image_url || getFallbackImage(item.name)) ? (
                          <Image sizes="(max-width: 768px) 100vw, 50vw" src={item.image_url || getFallbackImage(item.name)} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <span className="text-5xl opacity-40">🍽️</span>
                          </div>
                      )}
                      
                      {/* Price Badge Over Image */}
                      {!item.is_poll && (
                        <div className="absolute bottom-3 left-3 z-[20] flex items-center">
                          <span className="font-outfit font-black text-[22px] text-white tracking-tight drop-shadow-md bg-black/60 px-3 py-1 rounded-2xl border border-white/10 backdrop-blur-md">{item.price} <span className="text-[14px] font-bold text-brand">₪</span></span>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col flex-1 px-3 pt-4 pb-2 lg:px-4 z-20 relative">
                       <h3 className="font-outfit font-black text-xl text-white group-hover:text-brand transition-colors leading-[1.2] mb-2.5">
                         {translate(locale, item.name, item.name_en, item.name_he, item.name_uk)}
                       </h3>
                       {item.description && (
                          <p className="text-zinc-400 text-[13px] leading-[1.5] line-clamp-2 md:line-clamp-3 mb-6">
                            {translate(locale, item.description, item.description_en, item.description_he, item.description_uk)}
                          </p>
                       )}
                       
                       <div className="flex-1" />
                       
                       {/* Add to Cart Actions */}
                       <div className="mt-auto pt-2">
                        {item.is_poll ? (
                          <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-[15px] font-bold text-center shadow-[0_4px_15px_rgba(147,51,234,0.3)] active:scale-95 transition-transform flex justify-center gap-2 items-center hover:from-purple-500 hover:to-purple-700">
                            {t("want_in_menu_btn", "Хочу в меню!")} {/* <span className="text-white/80 font-mono">({item.poll_votes})</span> */}
                          </button>
                        ) : !canOrder ? (
                          <button disabled className="bg-white/5 text-white/30 px-6 py-4 rounded-2xl w-full font-bold cursor-not-allowed text-[15px]">
                            {t('closed', 'Закрыто')}
                          </button>
                        ) : (
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
                                is_poll: item.is_poll
                              });
                            }}
                            className={`w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95 ${isOutOfStock ? "bg-red-500/10 text-red-500/50 cursor-not-allowed border border-red-500/20" : "bg-brand text-white hover:bg-brand/80 shadow-[0_8px_20px_rgba(255,107,0,0.3)] hover:shadow-[0_8px_30px_rgba(255,107,0,0.6)]"}`}
                          >
                            {isOutOfStock ? t("out_of_stock_btn", "Нет в наличии") : t("add_to_cart", "Беру")} {(!isOutOfStock) && <ChevronRight size={18} className="opacity-80" />}
                          </button>
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

      <CartSheet landingSettings={landingSettings} />
    </main>
  );
}
