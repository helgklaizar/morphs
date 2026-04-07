import { MessageSquare, Paperclip, Send, X, Bot, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAiStore } from '@rms/core';
import { useAiInsightsStore, getModuleFromPath } from '@rms/core';
import { AiInsightCard } from "@/components/ai/AiInsightCard";

export function AiSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { messages, sendMessage, clearHistory } = useAiStore();
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{file: File, base64: string} | null>(null);
  const [tab, setTab] = useState<'chat' | 'insights'>('chat');
  const pathname = usePathname();
  const currentModule = getModuleFromPath(pathname);
  const { insightsByModule, isLoading: isInsightsLoading, fetchInsights } = useAiInsightsStore();
  const currentInsights = currentModule ? (insightsByModule[currentModule] || []) : [];

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && currentInsights.length > 0) {
      setTab('insights');
    } else {
      setTab('chat');
    }
  }, [isOpen, pathname]);

  // Загружаем инсайты для текущего модуля автоматически, если они еще не загружены
  useEffect(() => {
    if (isOpen && currentModule && !insightsByModule[currentModule]) {
      fetchInsights(currentModule);
    }
  }, [isOpen, currentModule, insightsByModule, fetchInsights]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim() && !attachment) return;
    
    // In Gemini, base64 shouldn't include the data url prefix if we pass it through inlineData
    // Let's strip it when sending, BUT keep it for UI.
    let base64Data = undefined;
    let mimeType = undefined;
    
    if (attachment) {
      base64Data = attachment.base64.split(',')[1];
      mimeType = attachment.file.type;
    }

    sendMessage(inputText.trim() || "Отправлен Файл. Что на нем? Проанализируй.", pathname, base64Data, mimeType);
    setInputText("");
    setAttachment(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          file,
          base64: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) return <strong key={index} className="font-bold">{part}</strong>;
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div 
      className={`h-screen flex flex-col bg-[#141414] border-l border-white/10 shrink-0 transition-all duration-300 ease-in-out ${isOpen ? 'w-[320px] lg:w-[400px]' : 'w-0 overflow-hidden border-none'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 w-[320px] lg:w-[400px]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">ИИ Помощник</h2>
              <p className="text-xs text-white/50">Склад и база</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearHistory} className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5 mr-2">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 -mr-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex border-b border-white/10 shrink-0 w-[320px] lg:w-[400px]">
          <button 
            onClick={() => setTab('chat')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'chat' ? 'border-orange-500 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
          >
            Чат
          </button>
          <button 
            onClick={() => setTab('insights')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'insights' ? 'border-orange-500 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
          >
            Советы
            {currentInsights.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{currentInsights.length}</span>}
          </button>
        </div>

        {tab === 'insights' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 w-[320px] lg:w-[400px]">
             {currentModule ? (
               <AiInsightCard 
                 module={currentModule}
                 insights={currentInsights}
                 isLoading={isInsightsLoading}
                 onRefresh={() => fetchInsights(currentModule)}
                 className="w-full border-none shadow-none rounded-xl"
               />
             ) : (
               <div className="text-sm text-zinc-400 p-4 text-center">Для этой страницы советы пока не предусмотрены.</div>
             )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 w-[320px] lg:w-[400px]">
          {messages.map((msg, i) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id + i} className="flex justify-center my-4">
                  <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-3 py-1.5 rounded-full shadow-sm text-center">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id + i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser 
                    ? 'bg-orange-600 text-white rounded-tr-sm shadow-md' 
                    : 'bg-[#242424] border border-white/5 text-white/90 rounded-tl-sm'
                }`}>
                  {msg.isLoading ? (
                    <div className="flex gap-1.5 items-center py-1">
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                      <span className="text-xs text-white/40 ml-2">{msg.text}</span>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.imagePath && <img src={msg.imagePath} alt="attachment" className="max-w-full rounded-lg mb-2 border border-white/10" />}
                      {renderFormattedText(msg.text)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-white/10 bg-[#141414] w-[320px] lg:w-[400px] shrink-0">
          
          {attachment && (
            <div className="mb-2 relative inline-block">
              <img src={attachment.base64} alt="preview" className="h-16 rounded-md border border-white/10" />
              <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex-1 bg-[#242424] rounded-full border border-white/5 px-4 py-2 flex items-center">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Спросите или отправьте чек..." 
                className="w-full bg-transparent border-none text-white text-sm outline-none outline-0 focus:ring-0 focus:outline-none focus:border-none ring-0"
              />
            </div>
            <button onClick={handleSend} disabled={!inputText.trim() && !attachment} className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center text-white transition-colors shrink-0">
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
        </>
        )}
      </div>
  );
}
