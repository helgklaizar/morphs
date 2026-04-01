"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Globe, Phone, MapPin, Truck, ShoppingBag } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import CartSheet from "./CartSheet";
import { useCartStore } from "@/store/cartStore";
import { useLocaleStore, translate, translateKey, SystemTranslation, LOCAL_TRANSLATIONS } from "@/store/localeStore";

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



type Locale = 'ru' | 'en' | 'he' | 'uk';

interface MenuItem {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  name_uk?: string;
  description?: string;
  description_en?: string;
  description_he?: string;
  description_uk?: string;
  image_url?: string;
  price: number;
  stock: number;
  is_active: boolean;
  is_poll?: boolean;
  poll_votes?: number;
  category_id?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  name_uk?: string;
}

interface LandingSettings {
  hero_title?: string;
  hero_title_en?: string;
  hero_title_he?: string;
  hero_title_uk?: string;
  hero_subtitle?: string;
  hero_subtitle_en?: string;
  hero_subtitle_he?: string;
  hero_subtitle_uk?: string;
  about_text?: string;
  about_text_en?: string;
  about_text_he?: string;
  about_text_uk?: string;
  hero_image?: string;
  contact_phone?: string;
  address?: string;
  address_en?: string;
  address_he?: string;
  address_uk?: string;
  is_delivery_enabled?: boolean;
  is_pickup_enabled?: boolean;
  is_taking_orders?: boolean;
  is_only_preorder?: boolean;
}

export default function StorefrontClient({ menuItems, landingSettings, categories, systemTranslations }: {
  menuItems: MenuItem[];
  landingSettings: LandingSettings;
  categories: MenuCategory[];
  systemTranslations?: SystemTranslation[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const cart = useCartStore((state) => state.items);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const reservationDateOffset = useCartStore((state) => state.reservationDateOffset);
  
  const forceTomorrow = landingSettings?.is_only_preorder || (!landingSettings?.is_delivery_enabled && !landingSettings?.is_pickup_enabled);

  const { locale, systemTranslations: storeSystemTranslations, setLocale, setSystemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = storeSystemTranslations.find(x => x.key === key) || systemTranslations?.find(x => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const mountedRef = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    setHasMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    
    if (systemTranslations && systemTranslations.length > 0) {
      setSystemTranslations(systemTranslations);
    }
    
    if (typeof window !== "undefined" && localStorage.getItem("has_picked_loc") !== "true") {
      setShowLanguageModal(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [systemTranslations, setSystemTranslations]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalInCart = cart.reduce((acc, c) => acc + c.quantity, 0);
  const cartTotal = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);

  const activeItems = menuItems?.filter((i: MenuItem) => {
    if (selectedCategory === "POLL") return i.is_poll;
    if (selectedCategory && i.category_id !== selectedCategory) return false;
    return true;
  }) || [];

  const getFallbackImage = (name: string) => {
    if (name.toLowerCase().includes("борщ") || name.toLowerCase().includes("borsch")) return "/assets/images/borsch.jpg";
    if (name.toLowerCase().includes("котлет") || name.toLowerCase().includes("пюр")) return "/assets/images/kotlety.jpg";
    return "";
  };

  const handleShare = async (item: MenuItem) => {
    const title = translate(locale, item.name, item.name_en, item.name_he, item.name_uk);
    const desc = translate(locale, item.description ?? '', item.description_en, item.description_he, item.description_uk);
    const priceText = t("price", "Цена");
    const linkText = t("menu_and_order", "Меню и заказ тут");
    
    const text = `🔥 ${title}\n${desc ? desc + "\n" : ""}${priceText}: ${item.price} ₪\n\n${linkText}: https://borsch.shop/`;
    if (navigator.share) {
      navigator.share({ title: title, text, url: "https://borsch.shop/" }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(t("link_copied", "Ссылка скопирована"));
    }
  };

  const handleLangSelect = (lang: Locale) => {
    setLocale(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_picked_loc", "true");
    }
    setShowLanguageModal(false);
  };

  if (!hasMounted) return null;

  return (
    <div className="min-h-[100dvh] bg-[#080808] text-white pb-32 relative">
      
      {/* Top Banner (SliverAppBar simulation) */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 px-4 pt-[18px] pb-4 flex items-center justify-between transition-colors duration-300"
        style={{
          backgroundColor: scrollY > 100 ? "rgba(0,0,0,1)" : "transparent",
        }}
      >
        <div 
          className="flex items-center transition-opacity duration-200"
          style={{ opacity: scrollY > 100 ? 1 : 0, pointerEvents: scrollY > 100 ? "auto" : "none" }}
        >
          <div className="w-[28px] h-[28px] rounded-full overflow-hidden mr-2.5 shrink-0">
            <Image src="/assets/images/logo.jpg" alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-[16px]">
            {translate(locale, landingSettings?.hero_title || "Borsch Shop", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
          </span>
        </div>
      </div>

      {/* Top Bar (Icons + Language) */}
      <div className="fixed top-[12px] right-4 z-50 flex items-center justify-end pointer-events-none gap-2">
        
        {/* Phone */}
        <a 
          href={`tel:${landingSettings?.contact_phone?.replace(/\D/g, '') || "0549587707"}`}
          title={t("call_us", "Позвонить")}
          className="pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/50 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-white/10"
        >
          <Phone className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </a>

        {/* Address */}
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Ha-Ne'emanim St 15, Haifa")}`}
          target="_blank"
          rel="noopener noreferrer"
          title={t("our_address", "Наш адрес")}
          className="pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/50 backdrop-blur-md border border-white/10 active:scale-95 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-white/10"
        >
          <MapPin className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </a>

        {/* Delivery */}
        <div 
          title={t("delivery", "Доставка")}
          className={`pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/50 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_delivery_enabled ? "border-[#00C853] shadow-[0_0_10px_rgba(0,200,83,0.4)] hover:shadow-[0_0_15px_rgba(0,200,83,0.7)]" : "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]"}`}
        >
          <Truck className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </div>

        {/* Pickup */}
        <div 
          title={t("pickup", "Самовывоз")}
          className={`pointer-events-auto flex items-center justify-center h-[34px] w-[34px] rounded-full bg-black/50 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_pickup_enabled ? "border-[#00C853] shadow-[0_0_10px_rgba(0,200,83,0.4)] hover:shadow-[0_0_15px_rgba(0,200,83,0.7)]" : "border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]"}`}
        >
          <ShoppingBag className="w-[16px] h-[16px] text-white/90 drop-shadow-md" />
        </div>

        {/* Right Side: Language Switcher */}
        <button 
          onClick={() => setShowLanguageModal(true)}
          className="pointer-events-auto flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 px-2.5 h-[34px] rounded-full active:scale-95 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:bg-white/10 shrink-0"
        >
          <span className="text-[14px] leading-none mr-1.5 mt-[1px] drop-shadow-md">
            {locale === 'ru' ? '🇷🇺' : locale === 'he' ? '🇮🇱' : locale === 'uk' ? '🇺🇦' : '🇺🇸'}
          </span>
        </button>

      </div>

      {/* Immersive Hero Background */}
      <div className="relative w-full flex flex-col min-h-[500px] bg-[#050505] overflow-hidden">
        
        {/* Top Image Section with subtle parallax */}
        <motion.div style={{ y: heroY }} className="absolute inset-x-0 top-0 h-[65%] sm:h-[75%] z-0">
          <img src="/assets/images/black-hero.jpg" alt="Background" width={1200} height={800} className="w-full h-full object-cover select-none scale-[1.15]" />
          {/* Steam over the main hot dish */}
          <SteamAnimation />
        </motion.div>

        {/* Gradient that fades image into black background (fixed to container, not parallax) */}
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pointer-events-none z-0" />
        {/* Slight dark overlay on top to ensure the TopBar icons are fully legible */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050505]/80 to-transparent pointer-events-none z-0" />

        {/* Bottom Editorial Text Section */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col mt-auto pt-[85%] sm:pt-[450px]">
          <div className="px-5 pb-8 sm:pb-12 w-full flex flex-col">
            
            {/* Massive Editorial Title */}
            <h1 className="text-[52px] sm:text-[72px] lg:text-[88px] font-[900] tracking-[-0.04em] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-br from-white via-[#EFEFEF] to-[#777] mb-6 drop-shadow-sm pr-4 max-w-4xl">
              {translate(locale, landingSettings?.hero_title || "Borsch be Shhuna", landingSettings?.hero_title_en, landingSettings?.hero_title_he, landingSettings?.hero_title_uk)}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 lg:gap-16">
              
              <div className="flex flex-col max-w-md">
                <div className="w-12 h-[4px] rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] mb-4 shadow-[0_0_12px_rgba(255,107,0,0.5)]" />
                <p className="text-[#FF6B00] text-[15px] sm:text-[17px] font-[700] tracking-[0.1em] uppercase m-0 leading-none mb-3">
                  {translate(locale, landingSettings?.hero_subtitle || "Вкусная домашняя кухня", landingSettings?.hero_subtitle_en, landingSettings?.hero_subtitle_he, landingSettings?.hero_subtitle_uk)}
                </p>
              </div>

              <p className="text-white/60 text-[14px] sm:text-[16px] leading-[1.65] max-w-[500px] font-[400] m-0">
                {translate(locale, landingSettings?.about_text || "Мы тут на районе наварили шикарного домашнего борща и приглашаем всех желающих вкусно и сытно откушать!\n\nГотовили с душой, как для себя! Порции наливаем от души, идеально, чтобы плотно пообедать.", landingSettings?.about_text_en, landingSettings?.about_text_he, landingSettings?.about_text_uk)}
              </p>

            </div>
          </div>
        </div>
      </div>

      {/* Sticky Categories */}
      <div className="sticky top-[52px] z-30 bg-[#080808] py-4 shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
        <div className="flex items-center px-4 w-full overflow-x-auto hide-scrollbar gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center px-4 py-1.5 rounded-full text-[15px] font-medium transition-colors border shrink-0 ${
                selectedCategory === null 
                  ? "bg-transparent text-white border-transparent pl-3" 
                  : "bg-white/10 text-white/70 border-transparent"
              }`}
               style={selectedCategory === null ? { color: "white", fontWeight: 700 } : {}}
            >
              {selectedCategory === null && (
                 <div className="w-[4px] h-[16px] bg-[#FF6B00] rounded-full mr-2 shrink-0" />
              )}
              {t("full_menu", "Всё меню")}
            </button>
            {categories?.map((c: MenuCategory) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border shrink-0 ${
                  selectedCategory === c.id 
                    ? "bg-transparent text-[#FF6B00] font-bold border-transparent" 
                    : "bg-white/10 text-white/70 border-transparent"
                }`}
              >
                <span className={selectedCategory === c.id ? "text-white font-[700]" : ""}>
                   {translate(locale, c.name, c.name_en, c.name_he, c.name_uk)}
                </span>
              </button>
            ))}
            <button
              onClick={() => setSelectedCategory("POLL")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap border shrink-0 ${
                selectedCategory === "POLL" 
                  ? "bg-transparent text-[#E91E63] font-bold border-transparent" 
                  : "bg-white/10 text-white/70 border-transparent"
              }`}
            >
               <span className={selectedCategory === "POLL" ? "text-white font-[800]" : ""}>
                   {t("want_in_menu", "🔥 Хочу в меню")}
               </span>
            </button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {activeItems.map((item: MenuItem) => {
            const isOutOfStock = (item.stock === 0 && !item.is_poll && !forceTomorrow && reservationDateOffset === 0);
            const canOrder = landingSettings?.is_taking_orders !== false;
            return (
              <div key={item.id} className="group bg-[#141414] rounded-[18px] border border-white/5 overflow-hidden flex flex-col pt-0 pb-2.5 px-0 transition-all duration-500 hover:border-[#FF6B00]/40 hover:shadow-[0_12px_30px_rgba(255,107,0,0.2)] hover:-translate-y-2">
                {/* Image Area */}
                <div className="w-full aspect-[1/0.95] relative bg-[#1E1E1E] overflow-hidden">
                  {(item.image_url || getFallbackImage(item.name)) ? (
                    <Image
                      src={item.image_url || getFallbackImage(item.name) || "/assets/images/borsch.jpg"}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full"><span className="text-3xl text-white/20">🍔</span></div>
                  )}

                  {/* Out of Stock (Top Left) */}
                  {isOutOfStock && (
                    <div className="absolute top-[10px] left-[10px] bg-red-500/90 text-white px-2 py-1 rounded-full text-[10px] font-bold z-10 backdrop-blur-sm shadow-md">
                      {t("out_of_stock", "Закончилось на сегодня")}
                    </div>
                  )}
                  {item.is_poll && (
                     <div className="absolute top-[10px] left-[10px] bg-purple-500/90 text-white px-2 py-1 rounded-full text-[10px] font-bold z-10 uppercase backdrop-blur-sm shadow-md">
                      {t("poll", "Опрос")}
                    </div>
                  )}

                  {/* Share button (Top Right) */}
                  <button 
                    onClick={() => handleShare(item)}
                    className="absolute top-[10px] right-[10px] w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>

                  {/* Price Bubble (Bottom Left) */}
                  {!item.is_poll && (
                    <div className="absolute bottom-[10px] left-[10px] bg-black/75 border border-[#FF6B00]/50 text-[#FF6B00] font-[800] px-2.5 py-1.5 rounded-[20px] text-[14px] z-10 backdrop-blur-sm">
                      {item.price.toFixed(0)} ₪
                    </div>
                  )}
                </div>

                {/* Info Text Area */}
                <div className="p-3 pt-2.5 pb-[6px] flex flex-col flex-1">
                  <h3 className="text-[14px] font-[700] text-white leading-tight mb-1 truncate">
                    {translate(locale, item.name, item.name_en, item.name_he, item.name_uk)}
                  </h3>
                  {item.description && (
                    <p className="text-white/45 text-[11px] leading-[1.4] line-clamp-2 mt-1 mb-2">
                       {translate(locale, item.description, item.description_en, item.description_he, item.description_uk)}
                    </p>
                  )}
                  <div className="flex-1" />
                </div>

                {/* Button Container */}
                <div className="px-2.5">
                  {item.is_poll ? (
                    <button className="w-full py-[11px] rounded-xl bg-gradient-to-r from-[#E91E63] to-[#C2185B] text-white text-[13px] font-[700] text-center shadow-lg">
                      {t("want_in_menu_btn", "Хочу в меню!")} ({item.poll_votes})
                    </button>
                  ) : !canOrder ? (
                    <button disabled className="w-full py-[11px] rounded-[14px] bg-white/5 text-white/30 cursor-not-allowed font-[700] text-[14px] shadow-sm flex items-center justify-center">
                      {t('closed', 'Закрыто / Closed')}
                    </button>
                  ) : (
                    <AddToCartButton item={{
                       id: item.id,
                       name: translate(locale, item.name, item.name_en ?? '', item.name_he ?? '', item.name_uk ?? ''),
                       price: item.price,
                       image_url: item.image_url ?? '',
                       quantity: 0,
                       stock: (forceTomorrow || reservationDateOffset > 0) ? 999 : item.stock,
                       is_poll: item.is_poll,
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-[#141414] rounded-[24px] border border-white/5 mx-4 mt-6 shadow-inner">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
               <ShoppingBag className="w-10 h-10 text-white/20" />
             </div>
             <h3 className="text-white text-xl font-bold mb-2">
               {t("nothing_here", "Тут пока ничего нет")}
             </h3>
             <p className="text-white/40 text-sm max-w-[280px]">
               {t("empty_category_desc", "Мы скоро добавим вкусные позиции в этот раздел. Заглядывайте позже!")}
             </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 z-50 SafeArea-bottom bg-[#080808]/90 backdrop-blur-md">
          <button 
            onClick={toggleCart}
            className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C38] rounded-[18px] px-5 py-4 flex items-center shadow-[0_4px_16px_rgba(255,107,0,0.4)] transition-transform active:scale-95"
          >
            <div className="bg-white/20 rounded-xl px-2.5 py-1 min-w-[32px] text-center mr-3 backdrop-blur-sm">
              <span className="text-white font-[800] text-[14px]">{totalInCart}</span>
            </div>
            <span className="flex-1 text-left text-white font-[700] text-[16px]">
               {t("cart", "Корзина")}
            </span>
            <span className="text-white font-[800] text-[16px]">{cartTotal.toFixed(0)} ₪</span>
          </button>
        </div>
      )}

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1C1C1E] w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-4 text-center border-b border-white/10 bg-black/20">
              <h3 className="text-white font-bold text-[16px]">Язык / Language / שפה / Мова</h3>
            </div>
            <div className="p-2">
              <button onClick={() => handleLangSelect("he")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-xl flex items-center justify-between">
                <span className="text-white text-[18px] font-medium">🇮🇱 עברית</span>
                {locale === 'he' && <span className="text-[#FF6B00]">✓</span>}
              </button>
              <button onClick={() => handleLangSelect("ru")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-xl flex items-center justify-between">
                <span className="text-white text-[18px] font-medium">🇷🇺 Русский</span>
                {locale === 'ru' && <span className="text-[#FF6B00]">✓</span>}
              </button>
              <button onClick={() => handleLangSelect("uk")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-xl flex items-center justify-between">
                <span className="text-white text-[18px] font-medium">🇺🇦 Українська</span>
                {locale === 'uk' && <span className="text-[#FF6B00]">✓</span>}
              </button>
              <button onClick={() => handleLangSelect("en")} className="w-full text-left px-5 py-4 hover:bg-white/5 transition rounded-xl flex items-center justify-between">
                <span className="text-white text-[18px] font-medium">🇺🇸 English</span>
                {locale === 'en' && <span className="text-[#FF6B00]">✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      <CartSheet settings={landingSettings} />
    </div>
  );
}
