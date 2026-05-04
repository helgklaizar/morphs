import { X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onCancel} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 font-bold text-sm transition-colors text-white">
            Отмена
          </button>
          <button onClick={() => { onConfirm(); onCancel(); }} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 font-bold text-sm transition-colors text-white">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
