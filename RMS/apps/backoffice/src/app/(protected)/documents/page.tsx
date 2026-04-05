"use client";

import { useEffect, useState, useRef } from "react";
import { FileText, Image as ImageIcon, Upload, X, Trash2, ExternalLink, Filter, Search, FileUp, Sparkles, Megaphone } from "lucide-react";
import { useDocumentsStore, DocumentRecord } from "@/store/useDocumentsStore";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { pb } from "@/lib/pocketbase";
import { useRouter } from "next/navigation";
import { useMarketingStore } from "@/store/useMarketingStore";

export default function DocumentsPage() {
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
        <div>
           <h1 className="text-2xl font-black italic uppercase tracking-tighter text-indigo-400">Документооборот</h1>
           <p className="text-sm text-white/40">Хранилище сканов, чеков и накладных</p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-20">
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
                             <button
                               onClick={() => {
                                 useMarketingStore.getState().setDraftMediaLink(getFileUrl(doc));
                                 router.push('/marketing');
                               }}
                               className="p-3 bg-orange-500 rounded-full text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform"
                               title="Создать рекламную кампанию"
                             >
                                <Megaphone className="w-5 h-5" />
                             </button>
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
                             <button
                               onClick={() => {
                                 useMarketingStore.getState().setDraftMediaLink(getFileUrl(doc));
                                 router.push('/marketing');
                               }}
                               className="p-3 bg-orange-500 rounded-full text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform"
                               title="Создать рекламную кампанию"
                             >
                                <Megaphone className="w-5 h-5" />
                             </button>
                           </div>
                        </div>
                      )}
                      
                      {/* Badge */}
                      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-widest text-white/60">
                         {doc.type}
                      </div>

                      {/* AI assistant tag (example fix: check type or metadata) */}
                      {doc.type === 'ai_generated' && (
                         <div className="absolute top-3 right-3 p-1.5 bg-indigo-600 rounded-lg shadow-lg">
                           <Sparkles className="w-3 h-3 text-white" />
                         </div>
                      )}
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
  );
}
