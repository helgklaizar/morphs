import { motion, AnimatePresence } from "framer-motion";
import { Locale } from "@/store/localeStore";

export default function LanguageModal({
  showLanguageModal,
  handleLangSelect,
  locale
}: {
  showLanguageModal: boolean;
  handleLangSelect: (lang: Locale) => void;
  locale: Locale;
}) {
  return (
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
  );
}
