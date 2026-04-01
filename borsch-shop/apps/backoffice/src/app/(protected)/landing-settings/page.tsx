"use client";

import { useEffect, useState } from "react";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";
import { Loader2, Save, Globe } from "lucide-react";

export default function LandingSettingsPage() {
  const { settings, isLoading, fetchSettings, updateSettings } = useLandingSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData);
      alert("Настройки успешно сохранены!");
    } catch (err: any) {
      alert("Ошибка при сохранении: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center text-muted-foreground mt-10">Настройки лендинга не найдены в базе.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки Лендинга</h1>
          <p className="text-muted-foreground">Управление главным экраном, контактами и режимами приема заказов</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Сохранить
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Главный экран */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-orange-500">
            <Globe className="w-6 h-6" />
            <h2 className="text-xl font-semibold text-white">Главный экран</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Главный заголовок (RU)</label>
              <input type="text" name="hero_title" value={formData.hero_title || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Подзаголовок (RU)</label>
              <input type="text" name="hero_subtitle" value={formData.hero_subtitle || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">О нас (RU)</label>
              <textarea name="about_text" value={formData.about_text || ""} onChange={handleChange} rows={4} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 resize-none" />
            </div>
          </div>
        </div>

        {/* Контакты */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white mb-6">Контакты и Адрес</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Телефон</label>
              <input type="text" name="contact_phone" value={formData.contact_phone || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
              <input type="text" name="contact_email" value={formData.contact_email || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Адрес</label>
              <input type="text" name="address" value={formData.address || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Часы работы</label>
              <input type="text" name="working_hours" value={formData.working_hours || ""} onChange={handleChange} className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
