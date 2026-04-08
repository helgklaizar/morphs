import { motion, AnimatePresence } from "framer-motion";

export default function BottomCart({
  cartCount,
  setIsOpen,
  t,
  cartItems
}: {
  cartCount: number;
  setIsOpen: (isOpen: boolean) => void;
  t: (key: string, fallback: string) => string;
  cartItems: any[];
}) {
  return (
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
  );
}
