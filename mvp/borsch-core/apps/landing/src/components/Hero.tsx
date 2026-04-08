import { motion, MotionValue } from "framer-motion";
import Image from "next/image";
import { Info } from "lucide-react";
import { useLocaleStore, translate } from "@/store/localeStore";

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

export default function Hero({ 
  heroY, 
  landingSettings 
}: { 
  heroY: MotionValue<number>, 
  landingSettings: any 
}) {
  const { locale, systemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = systemTranslations.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };

  return (
    <div className="relative w-full flex flex-col min-h-[500px] sm:min-h-[600px] bg-[#09090b] overflow-hidden">
      <motion.div style={{ y: heroY }} className="absolute inset-x-0 top-0 h-[75%] sm:h-[80%] z-0">
        <Image src="/assets/images/black-hero.jpg" alt="Background" width={1200} height={800} className="w-full h-full object-cover select-none scale-[1.15]" priority />
        <SteamAnimation />
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent pointer-events-none z-0" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#09090b]/80 to-transparent pointer-events-none z-0" />

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
  );
}
