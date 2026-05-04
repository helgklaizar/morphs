"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Bot, 
  Globe, 
  Languages, 
  Save, 
  Settings as SettingsIcon, 
  Cpu, 
  MessageSquare, 
  Key, 
  Bell, 
  Shield,
  Zap,
  Layers,
  Search,
  Plus,
  Trash2,
  Grid,
  Palette,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  X,
  ExternalLink,
  Filter,
  FileUp,
  Sparkles,
  Megaphone
} from "lucide-react";
import { useDocumentsStore, DocumentRecord } from "@/store/useDocumentsStore";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { pb } from "@/lib/pocketbase";
import { useMarketingStore } from "@/store/useMarketingStore";
import { useAiSettingsStore } from "@/store/useAiSettingsStore";
import { useLandingSettingsStore } from "@/store/useLandingSettingsStore";
import { useTranslationsStore } from "@/store/useTranslationsStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useModulesStore, SYSTEM_MODULES } from "@/store/useModulesStore";

type TabType = 'general' | 'ai' | 'translations' | 'security' | 'theme' | 'documents' | 'modules';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'general');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const { settings: aiSettings, fetchSettings: fetchAi, updateSettings: updateAi, isLoading: aiLoading } = useAiSettingsStore();
  const { settings: landingSettings, fetchSettings: fetchLanding, updateSettings: updateLanding, isLoading: landingLoading } = useLandingSettingsStore();
  const { translations, fetchTranslations, addTranslation, updateTranslation, deleteTranslation, isLoading: transLoading } = useTranslationsStore();

  const [tSearch, setTSearch] = useState("");

  useEffect(() => {
    fetchAi();
    fetchLanding();
    fetchTranslations();
  }, [fetchAi, fetchLanding, fetchTranslations]);

  const filteredTranslations = translations.filter(t => 
    t.key.toLowerCase().includes(tSearch.toLowerCase()) || 
    t.en.toLowerCase().includes(tSearch.toLowerCase()) || 
    t.uk.toLowerCase().includes(tSearch.toLowerCase())
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'general', label: 'Основные', icon: Globe },
    { id: 'theme', label: 'Дизайн (Цвета)', icon: Palette },
    { id: 'ai', label: 'ИИ и Автоматизация', icon: Bot },
    { id: 'translations', label: 'Переводы', icon: Languages },
    { id: 'documents', label: 'Документы', icon: FileText },
    { id: 'modules', label: 'Модули системы', icon: Grid },
    { id: 'security', label: 'Безопасность', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">Управление сайтом, ИИ и системой</p>
        </div>
      </div>

      <div className="flex bg-[#141414] border border-white/5 rounded-2xl p-1 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* TAB: General (Landing) */}
        {activeTab === 'general' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Контакты магазина" icon={<Globe className="w-5 h-5 text-orange-500" />}>
              <div className="space-y-4">
                <InputGroup label="Название магазина" defaultValue={landingSettings?.store_name} onSave={(val: string) => updateLanding({ store_name: val })} />
                <InputGroup label="Слоган" defaultValue={landingSettings?.store_description} onSave={(val: string) => updateLanding({ store_description: val })} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Телефон" defaultValue={landingSettings?.contact_phone} onSave={(val: string) => updateLanding({ contact_phone: val })} />
                  <InputGroup label="Email" defaultValue={landingSettings?.contact_email} onSave={(val: string) => updateLanding({ contact_email: val })} />
                </div>
                <InputGroup label="Адрес" defaultValue={landingSettings?.address} onSave={(val: string) => updateLanding({ address: val })} />
                <InputGroup label="Часы работы" defaultValue={landingSettings?.working_hours} onSave={(val: string) => updateLanding({ working_hours: val })} />
              </div>
            </Card>

            <Card title="Главный Экран (Hero)" icon={<Layers className="w-5 h-5 text-indigo-500" />}>
              <div className="space-y-4">
                <InputGroup label="Заголовок" defaultValue={landingSettings?.hero_title} onSave={(val: string) => updateLanding({ hero_title: val })} />
                <InputGroup label="Подзаголовок" defaultValue={landingSettings?.hero_subtitle} onSave={(val: string) => updateLanding({ hero_subtitle: val })} />
                <TextareaGroup label="Текст (О Нас / Преимущества)" defaultValue={landingSettings?.about_text} onSave={(val: string) => updateLanding({ about_text: val })} />
              </div>
            </Card>

            <Card title="Режимы работы" icon={<Zap className="w-5 h-5 text-amber-500" />}>
              <div className="space-y-4">
                <ToggleGroup label="Разрешить самовывоз" checked={landingSettings?.is_pickup_enabled} onChange={(val: boolean) => updateLanding({ is_pickup_enabled: val })} />
                <ToggleGroup label="Разрешить доставку" checked={landingSettings?.is_delivery_enabled} onChange={(val: boolean) => updateLanding({ is_delivery_enabled: val })} />
                <ToggleGroup label="Режим предзаказов" checked={landingSettings?.is_preorder_mode} onChange={(val: boolean) => updateLanding({ is_preorder_mode: val })} />
              </div>
            </Card>

            <Card title="Финансы и Метрики" icon={<Zap className="w-5 h-5 text-emerald-500" />}>
              <div className="space-y-4">
                <InputGroup label="Целевая маржа (%)" type="number" defaultValue={landingSettings?.target_margin || 65} onSave={(val: string) => updateLanding({ target_margin: Number(val) })} />
                <InputGroup label="Критичный Food Cost (%)" type="number" defaultValue={landingSettings?.critical_food_cost || 40} onSave={(val: string) => updateLanding({ critical_food_cost: Number(val) })} />
                <p className="text-[10px] text-neutral-500 uppercase">Используется для красных плашек в меню. Установи под свою экономику.</p>
              </div>
            </Card>

            <Card title="Модули Лендинга" icon={<Layers className="w-5 h-5 text-indigo-500" />}>
              <div className="space-y-4">
                <ToggleGroup label="Блок Промокодов" checked={landingSettings?.show_promo_block} onChange={(val: boolean) => updateLanding({ show_promo_block: val })} />
                <ToggleGroup label="Блок Лояльности" checked={landingSettings?.show_loyalty_block} onChange={(val: boolean) => updateLanding({ show_loyalty_block: val })} />
              </div>
            </Card>

            <Card title="Зал и столы" icon={<Grid className="w-5 h-5 text-purple-500" />} className="md:col-span-2">
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">Настройка расположения столов, их нумерации и мест для оформления заказов на месте.</p>
                <div className="pt-2">
                  <button 
                    onClick={() => router.push('/seating')} 
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-orange-500 hover:text-white text-neutral-300 font-bold py-3 px-6 rounded-xl transition-all w-full md:w-auto border border-white/5 hover:border-transparent"
                  >
                    <Grid className="w-4 h-4" /> Открыть визуальный редактор
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: Modules System */}
        {activeTab === 'modules' && (
          <ModulesTab />
        )}

        {/* TAB: AI & Automation */}
        {activeTab === 'ai' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Ключи API (Облачные)" icon={<Key className="w-5 h-5 text-blue-500" />}>
              <div className="space-y-4">
                <InputGroup label="OpenAI API Key" type="password" defaultValue={aiSettings?.openai_key} onSave={(val: string) => updateAi({ openai_key: val })} />
                <InputGroup label="Gemini API Key" type="password" defaultValue={aiSettings?.gemini_key} onSave={(val: string) => updateAi({ gemini_key: val })} />
                <InputGroup label="Облачная модель" defaultValue={aiSettings?.model_name || "gpt-4"} onSave={(val: string) => updateAi({ model_name: val })} />
              </div>
            </Card>

            <Card title="Локальный ИИ (Ollama)" icon={<Cpu className="w-5 h-5 text-green-500" />}>
              <div className="space-y-4">
                <p className="text-xs text-neutral-400">Настройки для локальной LLM (например, Gemma 4B), работающей на этом устройстве для бесплатного и безопасного Анализа данных.</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => updateAi({ provider: aiSettings?.provider === 'ollama' ? 'openai' : 'ollama' })}
                    className={`col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      aiSettings?.provider === 'ollama' 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                        : 'bg-black/20 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    {aiSettings?.provider === 'ollama' ? 'Локальный ИИ Включен (Ollama)' : 'Использовать Облачный ИИ'}
                  </button>
                  <InputGroup label="Ollama Endpoint" defaultValue={aiSettings?.base_url || "http://localhost:11434"} onSave={(val: string) => updateAi({ base_url: val })} />
                  <InputGroup label="Локальная Модель" defaultValue={aiSettings?.api_key || "gemma:2b"} onSave={(val: string) => updateAi({ api_key: val })} />
                </div>
              </div>
            </Card>

            <Card title="Уведомления Telegram" icon={<Bell className="w-5 h-5 text-cyan-500" />}>
              <div className="space-y-4">
                <InputGroup label="Bot Token" type="password" defaultValue={aiSettings?.telegram_bot_token} onSave={(val: string) => updateAi({ telegram_bot_token: val })} />
                <InputGroup label="Chat ID (Admin Channel)" defaultValue={aiSettings?.telegram_chat_id} onSave={(val: string) => updateAi({ telegram_chat_id: val })} />
              </div>
            </Card>

            <Card title="Системный Промпт (ИИ-Ассистент)" icon={<MessageSquare className="w-5 h-5 text-purple-500" />} className="md:col-span-2">
              <div className="space-y-4">
                <textarea 
                  rows={6}
                  defaultValue={aiSettings?.system_prompt}
                  onBlur={(e) => updateAi({ system_prompt: e.target.value })}
                  className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                  placeholder="Инструкции для ИИ..."
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500">Промпт используется для генерации ответов клиентам и аналитики</p>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-all uppercase">
                    <Save className="w-3 h-3" /> Сохранить промпт
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: Localization */}
        {activeTab === 'translations' && (
          <Card title="Управление переводами" icon={<Languages className="w-5 h-5 text-green-500" />}>
             <div className="space-y-4">
               <div className="flex items-center gap-4">
                 <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                   <input 
                     type="text" 
                     placeholder="Поиск по ключу или тексту..." 
                     value={tSearch}
                     onChange={(e) => setTSearch(e.target.value)}
                     className="w-full bg-black/20 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none"
                   />
                 </div>
                 <button 
                   onClick={() => addTranslation({ key: 'new.key', en: '', uk: '', he: '' })}
                   className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-all uppercase whitespace-nowrap"
                 >
                   <Plus className="w-4 h-4" /> Добавить ключ
                 </button>
               </div>

               <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-[#141414] text-xs font-bold text-neutral-500 uppercase">
                     <tr>
                       <th className="px-4 py-3">Ключ</th>
                       <th className="px-4 py-3">EN</th>
                       <th className="px-4 py-3">HE</th>
                       <th className="px-4 py-3">UK</th>
                       <th className="px-4 py-3 w-10"></th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {filteredTranslations.map(t => (
                       <tr key={t.id} className="hover:bg-white/2 transition-colors group">
                         <td className="px-4 py-2 font-mono text-xs text-orange-500/70">{t.key}</td>
                         <td className="px-4 py-2"><input className="bg-transparent border-none w-full p-1 focus:bg-white/5 focus:outline-none rounded" value={t.en} onChange={(e) => updateTranslation(t.id, { en: e.target.value })} /></td>
                         <td className="px-4 py-2"><input className="bg-transparent border-none w-full p-1 focus:bg-white/5 focus:outline-none rounded" value={t.he} onChange={(e) => updateTranslation(t.id, { he: e.target.value })} /></td>
                         <td className="px-4 py-2"><input className="bg-transparent border-none w-full p-1 focus:bg-white/5 focus:outline-none rounded" value={t.uk} onChange={(e) => updateTranslation(t.id, { uk: e.target.value })} /></td>
                         <td className="px-4 py-2">
                           <button onClick={() => deleteTranslation(t.id)} className="p-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </Card>
        )}

        {/* TAB: Theme / Design */}
        {activeTab === 'theme' && (
          <ThemeSettingsTab />
        )}

        {/* TAB: Documents */}
        {activeTab === 'documents' && (
          <DocumentsTab />
        )}

      </div>
    </div>
  );
}

// Subcomponents

function Card({ title, icon, children, className = "" }: any) {
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-3xl p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-white/5">
          {icon}
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InputGroup({ label, defaultValue, type = "text", onSave }: any) {
  const [val, setVal] = useState(defaultValue);
  
  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{label}</label>
      </div>
      <div className="flex gap-2">
        <input 
          type={type}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="flex-1 bg-black/20 border border-white/5 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-white/20 transition-all"
        />
        <button 
          onClick={() => onSave(val)}
          className="p-2.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-orange-500 transition-all active:scale-95 shadow-sm"
        >
          <Save className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function TextareaGroup({ label, defaultValue, onSave }: any) {
  const [val, setVal] = useState(defaultValue);
  
  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{label}</label>
      </div>
      <div className="flex gap-2">
        <textarea 
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          className="flex-1 bg-black/20 border border-white/5 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-white/20 transition-all resize-none"
        />
        <button 
          onClick={() => onSave(val)}
          className="p-2.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-orange-500 transition-all active:scale-95 shadow-sm self-end"
        >
          <Save className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function ToggleGroup({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
      <span className="text-sm font-bold text-neutral-300 uppercase tracking-tight">{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${checked ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-neutral-800'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function ThemeSettingsTab() {
  const { colors, setModuleColor, resetColors } = useThemeStore();
  const presets = ['#8B5CF6', '#F97316', '#3B82F6', '#EAB308', '#10B981', '#F43F5E', '#EC4899', '#6366F1', '#14B8A6'];

  const modulesMap = [
    { key: 'dashboard' as const, label: 'Дашборд' },
    { key: 'pos' as const, label: 'Касса' },
    { key: 'orders' as const, label: 'Заказы' },
    { key: 'menu' as const, label: 'Меню' },
    { key: 'finance' as const, label: 'Бухгалтерия' },
    { key: 'inventory' as const, label: 'Склад' },
    { key: 'procurement' as const, label: 'Закупки' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Цветовая гамма разделов" icon={<Palette className="w-5 h-5 text-pink-500" />} className="md:col-span-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-400">Назначьте каждому разделу свой акцентный цвет. Это поможет сотрудникам визуально ориентироваться в системе.</p>
            <button 
              onClick={resetColors}
              className="text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/5 text-white/70"
            >
              Сбросить по-умолчанию
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modulesMap.map(mod => (
              <div key={mod.key} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl">
                <span className="font-bold uppercase tracking-tight text-white/80">{mod.label}</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={colors[mod.key]} 
                    onChange={(e) => setModuleColor(mod.key, e.target.value)}
                    className="w-10 h-10 rounded shadow-sm border-0 cursor-pointer bg-transparent"
                  />
                  <div className="flex gap-1 ml-2 border-l border-white/10 pl-3">
                    {presets.slice(0, 5).map(pcat => (
                      <button 
                        key={pcat} 
                        onClick={() => setModuleColor(mod.key, pcat)}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-110 shadow-sm ${colors[mod.key] === pcat ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                        style={{ backgroundColor: pcat }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 border border-blue-500/20 bg-blue-500/5 rounded-2xl text-sm text-blue-400">
            <strong>Примечание:</strong> Новая цветовая система сейчас активно внедряется. Цвета применяются в главной навигации (шапке).
          </div>
        </div>
      </Card>
    </div>
  );
}

function DocumentsTab() {
  const router = useRouter();
  const { docs, isLoading, fetchDocs, uploadDoc, deleteDoc } = useDocumentsStore();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name || "Без названия";
    const type = "other"; // Default
    await uploadDoc(name, type, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredDocs = docs.filter(doc => {
    const matchesFilter = filter === "all" || doc.type === filter;
    const matchesSearch = (doc.name || "").toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getFileUrl = (doc: DocumentRecord) => {
    if (!doc.file) return "";
    return `${process.env.NEXT_PUBLIC_PB_URL || 'https://rms.shop'}/api/files/documents/${doc.id}/${doc.file}`;
  };

  const categories = [
    { id: "all", label: "Все" },
    { id: "invoice", label: "Счета/Чеки" },
    { id: "contract", label: "Договоры" },
    { id: "photo", label: "Фото" },
    { id: "license", label: "Лицензии" },
    { id: "other", label: "Прочее" },
  ];

  return (
    <Card title="Хранилище сканов, чеков и накладных" icon={<FileText className="w-5 h-5 text-indigo-400" />} className="h-[700px] flex flex-col">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
          <div>
             <h1 className="text-xl font-black italic uppercase tracking-tighter text-indigo-400">Документооборот</h1>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
             >
               <Upload className="w-5 h-5" />
               ЗАГРУЗИТЬ
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload} 
               className="hidden" 
             />
          </div>
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
             <input 
               type="text" 
               placeholder="Поиск по названию..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500/50"
             />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             {categories.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => setFilter(cat.id)}
                 className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filter === cat.id ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white/2 border-white/5 text-white/40 hover:bg-white/5'}`}
               >
                 {cat.label}
               </button>
             ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-white/10 opacity-50">
              <FileText className="w-20 h-20 mb-4" />
              <p className="text-xl font-bold uppercase italic">{search ? "Ничего не найдено" : "Хранилище пусто"}</p>
              {!search && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 flex items-center gap-2 px-6 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-white/40 text-xs font-black transition-all"
                >
                  <FileUp className="w-4 h-4" /> ЗАГРУЗИТЬ ПЕРВЫЙ ФАЙЛ
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
              {filteredDocs.map(doc => {
                const isImage = (doc.name || "").match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return (
                  <div key={doc.id} className="group flex flex-col bg-[#111] border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-500/5">
                     <div className="aspect-square relative flex items-center justify-center bg-white/[0.02] border-b border-white/5 overflow-hidden">
                        {isImage ? (
                          <div className="w-full h-full relative">
                             <img 
                               src={getFileUrl(doc)} 
                               alt={doc.name} 
                               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                             />
                             <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <a href={getFileUrl(doc)} target="_blank" className="p-3 bg-white rounded-full text-indigo-900 shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                  <ExternalLink className="w-5 h-5" />
                               </a>
                             </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/20 group-hover:text-indigo-400 transition-colors w-full h-full relative">
                             <FileText className="w-16 h-16 mb-2" />
                             <span className="text-[10px] font-black uppercase tracking-widest">{doc.name.split('.').pop()}</span>
                             <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <a href={getFileUrl(doc)} target="_blank" className="p-3 bg-white rounded-full text-indigo-900 shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                  <ExternalLink className="w-5 h-5" />
                               </a>
                             </div>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-widest text-white/60">
                           {doc.type}
                        </div>
                     </div>
                     <div className="p-4 flex flex-col">
                        <div className="font-bold text-sm truncate mb-1 group-hover:text-indigo-400 transition-colors" title={doc.name}>
                          {doc.name}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-white/30 uppercase font-black">
                           <span>{format(new Date(doc.created), "dd.MM.yyyy")}</span>
                           <button 
                             onClick={() => {if(confirm("Удалить?")) deleteDoc(doc.id)}}
                             className="p-1 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ModulesTab() {
  const { isModuleEnabled, toggleModule } = useModulesStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Конфигурация модулей</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Включайте и отключайте целые блоки системы. Если блок отключен, он пропадает из навигации и аналитики.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SYSTEM_MODULES.map((mod) => {
          const isEnabled = isModuleEnabled(mod.id);
          
          return (
            <div 
              key={mod.id}
              className={`p-5 rounded-2xl border transition-all ${
                isEnabled 
                  ? "bg-orange-500/10 border-orange-500/30" 
                  : "bg-white/5 border-white/5 opacity-70 grayscale"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className={`font-bold ${isEnabled ? "text-orange-500" : "text-white/70"}`}>
                    {mod.label}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-2 line-clamp-3">
                    {mod.description}
                  </p>
                </div>
                
                <button
                  onClick={() => toggleModule(mod.id, !isEnabled)}
                  className={`shrink-0 w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    isEnabled ? "bg-orange-500" : "bg-neutral-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                {isEnabled ? (
                  <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Включено</span>
                ) : (
                  <span className="text-neutral-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Отключено</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
