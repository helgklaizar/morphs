import { Phone, MapPin, Truck, ShoppingBag } from "lucide-react";
import { useLocaleStore, translate, Locale } from "@/store/localeStore";
import { Dispatch, SetStateAction } from "react";

export default function Header({ 
  scrollY, 
  landingSettings, 
  setShowLanguageModal 
}: { 
  scrollY: number, 
  landingSettings: any, 
  setShowLanguageModal: Dispatch<SetStateAction<boolean>> 
}) {
  const { locale, systemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = systemTranslations.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };

  return (
    <header 
      className="fixed top-0 inset-x-0 z-[60] px-4 sm:px-6 py-3 flex items-start justify-between transition-colors duration-300 pointer-events-none"
      style={{ backgroundColor: scrollY > 50 ? "rgba(9,9,11,0.95)" : "transparent", backdropFilter: scrollY > 50 ? "blur(12px)" : "none", borderBottom: scrollY > 50 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
    >
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
        
        <div title={t("delivery", "Доставка")} className={`flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_delivery_enabled !== false ? "border-[#00C853]/50 text-[#00C853]" : "border-red-500/50 text-red-500"}`}>
          <Truck className="w-[16px] h-[16px]" />
        </div>
        <div title={t("pickup", "Самовывоз")} className={`flex items-center justify-center h-[36px] w-[36px] rounded-xl bg-[#1c1c1e]/80 backdrop-blur-md transition-all hover:bg-white/10 cursor-help border ${landingSettings?.is_pickup_enabled !== false ? "border-[#00C853]/50 text-[#00C853]" : "border-red-500/50 text-red-500"}`}>
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
  );
}
