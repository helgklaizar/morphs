"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ShoppingBag, MapPin, Phone, Info, Share2, Truck, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import CartSheet from "@/components/CartSheet";
import { useLocaleStore, translate, LOCAL_TRANSLATIONS, Locale } from "@/store/localeStore";

import Header from "./Header";
import Hero from "./Hero";
import ProductCard from "./ProductCard";
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

      <Header scrollY={scrollY} landingSettings={landingSettings} setShowLanguageModal={setShowLanguageModal} />
      
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

      <Hero heroY={heroY} landingSettings={landingSettings} />

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
                  <ProductCard 
                    key={item.id}
                    item={item}
                    isOutOfStock={isOutOfStock}
                    canOrder={canOrder}
                    forceTomorrow={forceTomorrow}
                    reservationDateOffset={reservationDateOffset}
                    cartItems={cartItems}
                    addItem={addItem}
                    removeItem={removeItem}
                    handleShare={handleShare}
                    getFallbackImage={getFallbackImage}
                  />
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
