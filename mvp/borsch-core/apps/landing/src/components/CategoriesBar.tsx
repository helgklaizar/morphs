import Link from "next/link";
import { Calendar } from "lucide-react";
import { translate } from "@/store/localeStore";

export default function CategoriesBar({
  t,
  locale,
  categories,
  selectedCategory,
  setSelectedCategory
}: any) {
  return (
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
          {categories?.map((cat: any) => (
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
  );
}
