"use client";

import { MessageSquare, Paperclip, Send, X, Bot, Trash2, Settings, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAiStore, useAiSettingsStore } from '@rms/core';

export function AiAssistantOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { messages, sendMessage, clearHistory } = useAiStore();
  const { provider, setProvider, apiKey, setApiKey, systemRules, setSystemRules, localModelName, setLocalModelName } = useAiSettingsStore();
  
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{file: File, base64: string} | null>(null);
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  const pathname = usePathname();

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (endRef.current && tab === 'chat') {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, tab]);

  const handleSend = () => {
    if (!inputText.trim() && !attachment) return;
    
    let base64Data = undefined;
    let mimeType = undefined;
    
    if (attachment) {
      base64Data = attachment.base64.split(',')[1];
      mimeType = attachment.file.type;
    }

    sendMessage(inputText.trim(), pathname, base64Data, mimeType);
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
    <>
      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel (from BOTTOM to top, centered) or right side? User says "блок вылезает поверх окна но не во всю ширину" */}
      {/* We will slide it up right above the floating button at bottom center. */}
      {/* E.g. fixed bottom-24 left-1/2 -space-x-1/2 w-[400px] h-[600px] */}
      <div 
        className={`fixed z-50 bottom-24 left-1/2 -ml-[400px] w-[800px] h-[900px] max-h-[90vh] bg-[#141414] border border-white/10 shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-[#0a0a0a]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-none mb-1">ИИ Помощник</h2>
              <p className="text-xs font-medium text-white/50 tracking-wider uppercase">{provider}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearHistory} className="p-2.5 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/5" title="Очистить чат">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2.5 text-white/40 hover:text-white transition-colors rounded-xl hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {tab === 'settings' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0a0a0a] text-white custom-scrollbar">
            <h3 className="font-bold text-lg mb-4">Настройки ИИ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">Выбор ИИ Модели (Провайдер)</label>
                <div className="relative">
                  <select 
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold appearance-none focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="anthropic">Anthropic (Claude 3.5)</option>
                    <option value="gemini">Google (Gemini API)</option>
                    <option value="mlx">Локально (MLX Server - Mac)</option>
                    <option value="ollama">Локально (Ollama - Gemma 4B)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-3.5 pointer-events-none" />
                </div>
              </div>

              {(provider === 'mlx' || provider === 'ollama') && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">Имя локальной модели</label>
                  <input 
                    type="text" 
                    value={localModelName}
                    onChange={(e) => setLocalModelName(e.target.value)}
                    placeholder="Например: llama3.2, mistral"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-[10px] text-white/30 mt-1 font-medium">Модель должна быть скачана и запущена локально.</p>
                </div>
              )}

              {(provider === 'openai' || provider === 'anthropic' || provider === 'gemini') && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">API Ключ</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`sk-${provider}...`}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
              )}

              <div className="pt-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 block">Системные правила (System Prompt)</label>
                <textarea 
                  value={systemRules}
                  onChange={(e) => setSystemRules(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-orange-500 transition-colors min-h-[120px] resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex gap-3">
              <button onClick={() => setTab('chat')} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                Вернуться к чату
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0a0a0a] custom-scrollbar relative">
              {messages.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center p-8 pointer-events-none">
                  <Bot className="w-16 h-16 mb-4" />
                  <p className="font-bold text-lg">Чем я могу помочь?</p>
                  <p className="text-sm">Спросите про блюдо, наличие продуктов или прикрепите фото чека.</p>
                </div>
              )}
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
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      isUser 
                        ? 'bg-orange-500 text-white rounded-br-sm' 
                        : 'bg-[#1a1a1a] border border-white/10 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.isLoading ? (
                        <div className="flex gap-1.5 items-center py-2 px-1">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {msg.imagePath && <img src={msg.imagePath} alt="attachment" className="max-w-full rounded-lg mb-3 border border-white/10" />}
                          {renderFormattedText(msg.text)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-[#141414] shrink-0">
              
              {attachment && (
                <div className="mb-3 relative inline-block p-1 bg-white/5 rounded-lg border border-white/10">
                  <img src={attachment.base64} alt="preview" className="h-16 rounded-md object-cover" />
                  <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1.5 text-white shadow-lg transition-transform hover:scale-110">
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
                
                {/* SETTINGS BUTTON -> Opens settings tab */}
                <button 
                  onClick={() => setTab('settings')} 
                  className="w-11 h-11 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors shrink-0 border border-transparent hover:border-white/10"
                  title="Настройки ИИ"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                <div className="flex-1 bg-[#0a0a0a] rounded-2xl border border-white/10 px-4 flex items-center shadow-inner h-11 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Спросите ИИ..." 
                    className="w-full bg-transparent border-none text-white text-sm outline-none focus:ring-0 font-medium placeholder:text-white/30"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-1.5 text-white/30 hover:text-orange-400 transition-colors ml-1"
                    title="Прикрепить изображение"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
                
                <button 
                  onClick={handleSend} 
                  disabled={!inputText.trim() && !attachment} 
                  className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center text-white transition-all shadow-lg shadow-orange-500/20 shrink-0"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
