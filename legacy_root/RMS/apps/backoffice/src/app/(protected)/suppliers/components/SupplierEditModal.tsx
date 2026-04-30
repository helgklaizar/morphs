"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Supplier, useSuppliersStore } from "@/store/useSuppliersStore";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierEditModal({ isOpen, onClose, supplier }: Props) {
  const { addSupplier, updateSupplier, deleteSupplier } = useSuppliersStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [address, setAddress] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("ru");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(supplier?.name || "");
      setPhone(supplier?.phone || "");
      setHours(supplier?.hours || "");
      setAddress(supplier?.address || "");
      setPreferredLanguage(supplier?.preferred_language || "ru");
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), phone: phone.trim(), hours: hours.trim(), address: address.trim(), preferred_language: preferredLanguage };
    if (supplier) {
      await updateSupplier(supplier.id, payload);
    } else {
      await addSupplier(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!supplier) return;
    setConfirmDelete(true);
  };

  const confirmAndExecuteDelete = async () => {
    if (!supplier) return;
    await deleteSupplier(supplier.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-bold mb-6">{supplier ? 'Редактировать' : 'Новый поставщик'}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Название компании/индивидуала *</label>
            <input 
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Телефон</label>
            <input 
              type="text" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Часы работы</label>
            <input 
              type="text" value={hours} onChange={e => setHours(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Адрес</label>
            <textarea 
              rows={2} value={address} onChange={e => setAddress(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Язык заказов в Telegram</label>
            <select 
              value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)}
              className="w-full bg-[#242424] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 border border-white/5"
            >
              <option value="ru">Русский</option>
              <option value="he">Иврит</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
          {supplier ? (
            <button onClick={handleDelete} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors text-white/80">
              Отмена
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 font-bold text-sm transition-colors text-white">
              Сохранить
            </button>
          </div>
        </div>
      </div>
      
      {confirmDelete && (
        <ConfirmModal
          title="Удалить поставщика?"
          message={`Точно удалить поставщика "${supplier?.name}"?`}
          onConfirm={confirmAndExecuteDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
