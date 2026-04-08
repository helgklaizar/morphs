import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useLocaleStore, translate, LOCAL_TRANSLATIONS } from "@/store/localeStore";

interface MenuItem { id: string; name: string; name_en?: string; name_he?: string; name_uk?: string; price: number; is_poll?: boolean; category_id?: string; description?: string; description_en?: string; description_he?: string; description_uk?: string; stock: number; image_url?: string; composition?: string; }

export default function ProductCard({ 
  item, 
  isOutOfStock, 
  canOrder, 
  forceTomorrow, 
  reservationDateOffset, 
  cartItems, 
  addItem, 
  removeItem, 
  handleShare, 
  getFallbackImage 
}: { 
  item: MenuItem;
  isOutOfStock: boolean;
  canOrder: boolean;
  forceTomorrow: boolean;
  reservationDateOffset: number;
  cartItems: any[];
  addItem: any;
  removeItem: any;
  handleShare: any;
  getFallbackImage: any;
}) {
  const { locale, systemTranslations } = useLocaleStore();
  const t = (key: string, fallback: string) => {
    const tr = systemTranslations.find(x => x.key === key) || LOCAL_TRANSLATIONS.find(x => x.key === key);
    return translate(locale, tr?.ru || fallback, tr?.en, tr?.he, tr?.uk);
  };

  const cartItem = cartItems.find((i: any) => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
      className={`bg-[#1c1c1e] border-none rounded-2xl overflow-hidden relative group flex flex-col w-full`}
    >
      <button onClick={() => handleShare(item)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center z-[25] backdrop-blur-sm transition-all cursor-pointer group/share pointer-events-auto">
        <Share2 size={13} className="text-white/80 group-hover/share:text-white" />
      </button>

      {isOutOfStock && <div className="absolute top-3 left-3 z-[25] text-[11px] font-bold bg-red-500/90 backdrop-blur-md shadow-md text-white py-1 px-2.5 rounded-xl">{t("out_of_stock", "Закончилось")}</div>}
      {Boolean(item.is_poll) && <div className="absolute top-3 left-3 z-[25] text-[11px] font-bold uppercase tracking-wider bg-purple-500/90 backdrop-blur-md shadow-md text-white py-1 px-2.5 rounded-xl">{t("poll", "Опрос")}</div>}

      <div className="w-full aspect-[4/3] relative bg-zinc-800 shrink-0">
        {((item as any).imageUrl || item.image_url || getFallbackImage(item.name)) ? (
            <img src={(item as any).imageUrl || item.image_url || getFallbackImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center relative">
              <span className="text-4xl opacity-40">🍽️</span>
            </div>
        )}
        
        {!item.is_poll && (
          <div className="absolute bottom-2 left-2 z-[20] flex items-center">
            <span className="font-outfit font-black text-[14px] text-[#ff6b00] tracking-wide drop-shadow bg-[#2a1708]/90 px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-[#ff6b00]/20">
              {item.price} <span className="text-[11px]">₪</span>
            </span>
          </div>
        )}
      </div>

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
}
