import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save } from "lucide-react";
import { useToastStore } from "@rms/core";

interface LandingSettingsData {
  heroTitle: string;
  heroSubtitle: string;
  contactPhone: string;
  address: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['landing_settings'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3002/api/system/settings');
      const json = await res.json();
      const s = json.items?.[0] || {};
      return {
        heroTitle: s.hero_title ?? s.heroTitle ?? 'BORSCH',
        heroSubtitle: s.hero_subtitle ?? s.heroSubtitle ?? '',
        contactPhone: s.contact_phone ?? s.contactPhone ?? '',
        address: s.address ?? '',
      } as LandingSettingsData;
    }
  });

  const [form, setForm] = useState<LandingSettingsData | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (settings: LandingSettingsData) => {
      const res = await fetch('http://localhost:3002/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('error');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing_settings'] });
      useToastStore.getState().success("Настройки сохранены!");
    },
    onError: () => useToastStore.getState().error("Ошибка сохранения")
  });

  if (isLoading || !form) return (
    <div className="flex justify-center py-20 opacity-50">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between pb-6 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <Settings className="w-7 h-7 text-neutral-500" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-neutral-300 to-white bg-clip-text text-transparent uppercase tracking-wider">
            Настройки лендинга
          </h1>
        </div>
        <button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest"
        >
          <Save className="w-4 h-4" />
          {saveMut.isPending ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-10 mt-4">
        <div className="max-w-xl flex flex-col gap-3">
          {([
            { key: 'heroTitle', label: 'Заголовок Hero' },
            { key: 'heroSubtitle', label: 'Подзаголовок' },
            { key: 'contactPhone', label: 'Телефон' },
            { key: 'address', label: 'Адрес' },
          ] as { key: keyof LandingSettingsData, label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={e => setForm(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
