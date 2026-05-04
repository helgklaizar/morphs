"use client";

import { Languages, CheckCircle, AlertTriangle, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslationsStore, TranslationItem } from "@/store/useTranslationsStore";

export default function TranslationsPage() {
  const { items, isLoading, fetchTranslations, updateTranslation } = useTranslationsStore();
  const [activeTab, setActiveTab] = useState<'menu' | 'category'>('menu');
  const [editingItem, setEditingItem] = useState<TranslationItem | null>(null);

  const [form, setForm] = useState({ nameEn: '', nameHe: '', nameUk: '', descEn: '', descHe: '', descUk: '' });

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  const openEditor = (item: TranslationItem) => {
    setEditingItem(item);
    setForm({
      nameEn: item.nameEn, nameHe: item.nameHe, nameUk: item.nameUk,
      descEn: item.descEn || '', descHe: item.descHe || '', descUk: item.descUk || ''
    });
  };

  const handleSave = async () => {
    if (!editingItem) return;
    await updateTranslation(editingItem.id, editingItem.type, form);
    setEditingItem(null);
  };

  const filteredItems = items.filter(i => i.type === activeTab);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Переводы</h1>
          <p className="text-sm text-muted-foreground mt-1">Локализация текстов приложения</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('menu')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'menu' ? 'border-orange-500 font-bold text-orange-500' : 'border-transparent text-white/50 hover:text-white'}`}>Блюда меню</button>
        <button onClick={() => setActiveTab('category')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'category' ? 'border-orange-500 font-bold text-orange-500' : 'border-transparent text-white/50 hover:text-white'}`}>Категории меню</button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center w-full">
             <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mb-4" />
             <p className="text-xl font-semibold text-gray-500">Сбор строк...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map(item => {
              const needsTranslation = !item.nameEn || !item.nameHe || !item.nameUk || (item.type === 'menu' && (!item.descEn || !item.descHe || !item.descUk));
              return (
                <div key={item.id} onClick={() => openEditor(item)} className="bg-[#141414] border border-white/5 hover:border-orange-500/50 cursor-pointer rounded-xl p-4 transition-colors relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base truncate pr-6">{item.originalName}</h3>
                    {needsTranslation ? <AlertTriangle className="w-4 h-4 text-orange-500 absolute right-4 top-4" /> : <CheckCircle className="w-4 h-4 text-green-500 absolute right-4 top-4" />}
                  </div>
                  <div className="text-xs text-white/40 space-y-1">
                    <p>🇮🇱 {item.nameHe || '---'}</p>
                    <p>🇺🇸 {item.nameEn || '---'}</p>
                    <p>🇺🇦 {item.nameUk || '---'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setEditingItem(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Languages className="w-5 h-5 text-orange-500"/> Перевод: {editingItem.originalName}</h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/80 border-b border-white/5 pb-1">Названия</h3>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Иврит 🇮🇱</label>
                  <input type="text" value={form.nameHe} onChange={e => setForm({...form, nameHe: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Английский 🇺🇸</label>
                  <input type="text" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Украинский 🇺🇦</label>
                  <input type="text" value={form.nameUk} onChange={e => setForm({...form, nameUk: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5" />
                </div>
              </div>

              {editingItem.type === 'menu' && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-white/80 border-b border-white/5 pb-1">Описания (Состав)</h3>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Оригинал: <span className="text-white"> {editingItem.originalDesc || '---'} </span></label>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Иврит 🇮🇱</label>
                    <textarea value={form.descHe} onChange={e => setForm({...form, descHe: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5 min-h-[60px]" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Английский 🇺🇸</label>
                    <textarea value={form.descEn} onChange={e => setForm({...form, descEn: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5 min-h-[60px]" />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Украинский 🇺🇦</label>
                    <textarea value={form.descUk} onChange={e => setForm({...form, descUk: e.target.value})} className="w-full bg-[#242424] rounded-lg px-3 py-2 text-sm border border-white/5 min-h-[60px]" />
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleSave} className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-sm transition-colors flex justify-center items-center gap-2">
              <Save className="w-4 h-4" /> Сохранить переводы
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
