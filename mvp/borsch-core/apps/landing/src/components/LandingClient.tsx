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
import LanguageModal from "./LanguageModal";
import MenuGrid from "./MenuGrid";
import CategoriesBar from "./CategoriesBar";
import BottomCart from "./BottomCart";
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
      
      <BottomCart cartCount={cartCount} setIsOpen={setIsOpen} t={t} cartItems={cartItems} />

      <Hero heroY={heroY} landingSettings={landingSettings} />

      <CategoriesBar 
        t={t} 
        locale={locale} 
        categories={categories} 
        selectedCategory={selectedCategory} 
        setSelectedCategory={setSelectedCategory} 
      />

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

      <MenuGrid 
        filteredItems={filteredItems} 
        forceTomorrow={forceTomorrow} 
        reservationDateOffset={reservationDateOffset} 
        landingSettings={landingSettings} 
        cartItems={cartItems} 
        addItem={addItem} 
        removeItem={removeItem} 
        t={t} 
        handleShare={handleShare} 
        getFallbackImage={getFallbackImage} 
      />

      <LanguageModal showLanguageModal={showLanguageModal} handleLangSelect={handleLangSelect} locale={locale} />

      <CartSheet landingSettings={landingSettings as any} />
    </main>
  );
}
