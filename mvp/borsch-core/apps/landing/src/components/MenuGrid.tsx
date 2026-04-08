import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import ProductCard from "./ProductCard";

export default function MenuGrid({
  filteredItems,
  forceTomorrow,
  reservationDateOffset,
  landingSettings,
  cartItems,
  addItem,
  removeItem,
  t,
  handleShare,
  getFallbackImage
}: any) {
  return (
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
            {filteredItems?.map((item: any) => {
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
  );
}
