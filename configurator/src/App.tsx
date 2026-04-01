import { useState, useEffect } from 'react';
import GeneratedModule from './components/GeneratedModule';

type Blueprint = { id: string, icon: string, title: string, desc: string };
type Message = { role: 'user' | 'ai', text: string };

const checklistItems = [
  { id: 'pos', title: 'POS Оффлайн Терминал', desc: 'Автономная работа кассира', required: true },
  { id: 'sync', title: 'Локальная СУБД (libSQL)', desc: 'Хранение данных на устройстве с синхронизацией', required: true },
  { id: 'crm', title: 'Умная CRM', desc: 'Лояльность и анализ поведения клиентов', required: false },
  { id: 'inventory', title: 'Складской Учет', desc: 'Авто-инвентаризация и закупки', required: false },
];

export default function App() {
  const [step, setStep] = useState(0); 
  const [selectedBusiness, setSelectedBusiness] = useState('cafe');
  const [selectedModules, setSelectedModules] = useState<string[]>(['pos', 'sync', 'crm']);
  const [activeTab, setActiveTab] = useState('generated');
  const [isChatOpen, setIsChatOpen] = useState(false); // Drawer state
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Ядро Morphs запущено! Я ваш Бизнес-Агент. Хотите что-то добавить (например, Систему Бронирования)?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [blueprints, setBlueprints] = useState<Blueprint[]>([
    { id: 'cafe', icon: '☕️', title: 'Ресторан / Кафе', desc: 'Заказы, столы, касса' },
    { id: 'retail', icon: '🛍️', title: 'Ритейл Магазин', desc: 'Склад, возвраты, чеки' },
    { id: 'delivery', icon: '🚚', title: 'Логистика', desc: 'Курьеры, маршруты' }
  ]);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/blueprints")
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.length > 0) setBlueprints(data);
      })
      .catch(() => console.log("Using default blueprints"));
  }, []);

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(selectedModules.filter(m => m !== id));
    } else {
      setSelectedModules([...selectedModules, id]);
    }
  };

  const startGeneration = async () => {
    setStep(2);
    setGenerationLogs(["Подключение к Core Mind в Python...", "Ожидание потока данных (SSE)..."]);
    
    // Подключение к реальному бэкенду для стриминга логов
    const eventSource = new EventSource("http://localhost:8000/api/v1/logs");
    eventSource.onmessage = (event) => {
      const msg = event.data;
      if (msg === "DONE") {
        eventSource.close();
        setStep(3);
        // Сразу открываем чат чтобы пользователь понял, что ИИ готов
        setIsChatOpen(true);
      } else {
        setGenerationLogs(prev => {
          const newLogs = [...prev, msg];
          return newLogs.slice(-20); // храним только последние 20 логов чтобы не порвать UI
        });
      }
    };
    eventSource.onerror = () => {
      setGenerationLogs(prev => [...prev, "⚠️ Не удалось подключиться к SSE Бэкенда (8000 порт)... Включен mock-режим."]);
      eventSource.close();
    };

    try {
      await fetch("http://localhost:8000/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_type: selectedBusiness, modules: selectedModules })
      });
    } catch (e) {
      console.error(e);
      // Fallback если сервера нет, симулируем переход через 5 сек
      setTimeout(() => {
        setStep(3);
        setIsChatOpen(true);
      }, 5000);
    }
  };

  // Эффект для проактивных сообщений от ИИ (AnalyticsMorph)
  useEffect(() => {
    if (step !== 3) return;
    const es = new EventSource("http://localhost:8000/api/v1/chat_stream");
    es.onmessage = (event) => {
      setMessages(prev => {
        // Защита от дублей
        if (prev.length > 0 && prev[prev.length - 1].text === event.data) return prev;
        return [...prev, { role: 'ai', text: event.data }];
      });
    };
    return () => es.close();
  }, [step]);

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userText = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    try {
      await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, business_type: selectedBusiness })
      });
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Задача принята! Я генерирую код модуля и обновляю интерфейс (HMR Vite перезагрузит вкладку "Сгенерировано" через пару секунд).' 
      }]);
      setActiveTab('generated');
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: 'Упс, Бэкенд на порту 8000 недоступен. Запустите Python сервер (main.py) в новой вкладке терминала, чтобы я смог сгенерировать реальный код!' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col items-center justify-center overflow-hidden relative selection:bg-primary/30 font-sans">
      
      <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary blur-[160px] opacity-10 rounded-full" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500 blur-[150px] opacity-10 rounded-full" />
      </div>

      <div className="w-full max-w-6xl relative z-10 p-6">
        
        {step === 0 && ( 
          <div className="flex flex-col items-center py-20 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-primary/20 p-5 rounded-[2rem] mb-8 flex items-center justify-center border border-primary/30 shadow-[0_0_50px_rgba(255,107,0,0.2)]">
               <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6">Автономная <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Бизнес-ОС</span></h1>
            <p className="text-gray-400 text-2xl max-w-3xl mb-14">Система, которая сама пишет, деплоит и развивает CRM под ваши нужды.</p>
            
            <button 
              onClick={() => setStep(1)}
              className="group relative px-12 py-5 bg-white text-black font-extrabold text-xl rounded-2xl hover:scale-105 transition-all duration-300">
              <span className="relative z-10">Сгенерировать Бизнес →</span>
              <div className="absolute inset-0 h-full w-full rounded-2xl bg-gradient-to-r from-white to-gray-300 blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        )}

        {step === 1 && ( 
          <div className="glass-panel p-10 animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
            <header className="mb-10 text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-primary text-xs font-bold uppercase tracking-widest">Master Node: Setup</span>
              </div>
              <h2 className="text-4xl font-extrabold mb-3">Топология Бизнеса</h2>
            </header>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {blueprints.map(bp => (
                <button
                  key={bp.id}
                  onClick={() => setSelectedBusiness(bp.id)}
                  className={`p-6 rounded-2xl border transition-all duration-300 text-center
                    ${selectedBusiness === bp.id ? 'border-primary bg-primary/10 ring-1 ring-primary/50' : 'border-white/10 hover:bg-white/5'}`}
                >
                  <div className="text-4xl mb-3">{bp.icon}</div>
                  <div className="font-semibold text-white">{bp.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{bp.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {checklistItems.map(item => (
                <label key={item.id} className="flex items-center p-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={selectedModules.includes(item.id)} onChange={() => !item.required && toggleModule(item.id)} disabled={item.required} className="w-5 h-5 rounded border-gray-600 text-primary bg-black/50" />
                  <div className="ml-4">
                    <div className="text-white font-medium">{item.title} {item.required && <span className="ml-2 text-[9px] uppercase text-primary border border-primary/30 px-1 rounded">Core</span>}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <button onClick={startGeneration} className="w-full py-5 bg-gradient-to-r from-primary to-orange-500 text-white font-bold rounded-xl hover:shadow-[0_0_40px_rgba(255,107,0,0.5)] transition-all transform hover:-translate-y-1 text-lg">
              Развернуть Ядро
            </button>
          </div>
        )}

        {step === 2 && ( 
          <div className="glass-panel p-16 text-center max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-500">
             <div className="relative w-24 h-24 mb-10">
               <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
               <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
             </div>
             <h2 className="text-3xl font-bold mb-4">Синтез Автономного Ядра...</h2>
             <div className="w-full bg-black/60 rounded-xl p-6 text-left border border-white/5 h-48 overflow-hidden relative mt-8">
                <div className="space-y-3 font-mono text-xs flex flex-col justify-end h-full">
                  {generationLogs.map((log, i) => (
                    <div key={i} className="animate-in slide-in-from-bottom-2 fade-in opacity-80 flex items-start break-words overflow-hidden">
                      <span className="text-primary mr-2 shrink-0">❯</span> 
                      <span className="text-green-400 max-w-[95%]">{log}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {step === 3 && ( 
          <div className="w-full h-screen animate-in zoom-in-95 duration-500 flex relative bg-[#06080D]">
            
            {/* Это Главное Полотно (Canvas). Сюда генерируется весь интерфейс. */}
            <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col bg-black">
              <div className="flex border-b border-white/10 bg-[#0a0a0a] p-2 gap-2 shrink-0 z-10">
                <button 
                  onClick={() => setActiveTab('generated')} 
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'generated' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  Сгенерированный UI
                </button>
                <button 
                  onClick={() => setActiveTab('audit')} 
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'audit' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                   <span>🛡️ Task Audit</span>
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'generated' ? (
                   <GeneratedModule />
                ) : (
                   <div className="p-8 text-white h-full overflow-y-auto w-full flex flex-col animate-in fade-in zoom-in-95 bg-gradient-to-br from-black to-[#06080D]">
                      <h2 className="text-3xl font-bold mb-8 text-emerald-400 flex items-center gap-3">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Evidence-Driven Workflow Audit
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                        <div className="glass-panel p-8 border-emerald-500/20 bg-emerald-900/10 shadow-[0_0_50px_rgba(16,185,129,0.05)]">
                           <h3 className="font-bold text-xl mb-6 text-emerald-300 flex items-center"><span className="text-2xl mr-3">📁</span> Пайплайн Задачи (.tasks/)</h3>
                           <ul className="space-y-5 font-mono text-sm">
                              <li className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/5">
                                 <span className="text-emerald-500 bg-emerald-500/20 w-8 h-8 flex items-center justify-center rounded-full font-bold">1</span> 
                                 <span className="text-white font-semibold flex-1">Spec Freeze (spec.md)</span> 
                                 <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">✅ Заморожено</span>
                              </li>
                              <li className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/5">
                                 <span className="text-emerald-500 bg-emerald-500/20 w-8 h-8 flex items-center justify-center rounded-full font-bold">2</span> 
                                 <span className="text-white font-semibold flex-1">Subagents Init (.agents)</span> 
                                 <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">✅ Активно</span>
                              </li>
                              <li className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/5">
                                 <span className="text-emerald-500 bg-emerald-500/20 w-8 h-8 flex items-center justify-center rounded-full font-bold">3</span> 
                                 <span className="text-white font-semibold flex-1">Test-Driven Gen (Vitest)</span> 
                                 <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">build.txt</span>
                              </li>
                              <li className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/5">
                                 <span className="text-emerald-500 bg-emerald-500/20 w-8 h-8 flex items-center justify-center rounded-full font-bold">4</span> 
                                 <span className="text-white font-semibold flex-1">AST Security Pentest</span> 
                                 <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">safe</span>
                              </li>
                           </ul>
                        </div>
                        
                        <div className="flex flex-col gap-6">
                           <div className="glass-panel p-8 border-blue-500/20 bg-blue-900/10 flex-col flex shadow-[0_0_50px_rgba(59,130,246,0.05)]">
                              <h3 className="font-bold text-xl mb-4 text-blue-300 flex items-center"><span className="text-2xl mr-3">🧠</span> Лог Доказательств (Live)</h3>
                              <div className="bg-[#030408] rounded-xl p-5 font-mono text-sm overflow-y-auto h-40 border border-white/5 space-y-3 shadow-inner">
                                 <div className="text-gray-500 animate-pulse">Ожидание Event_Bus...</div>
                                 <div className="text-emerald-400">> [Evidence] AST Патч успешно применен к файлу App.tsx</div>
                                 <div className="text-blue-400">> [Atropos] Опыт записан в 'atropos_memory.json'</div>
                                 <div className="text-purple-400">> [Security] Сканирование f-string завершено</div>
                              </div>
                           </div>
                           
                           <div className="glass-panel p-6 border-orange-500/20 bg-orange-900/10 flex items-center gap-6 cursor-pointer hover:bg-orange-900/20 transition-colors">
                              <div className="text-4xl">🔥</div>
                              <div>
                                 <h3 className="font-bold text-lg text-orange-300">Atropos Experience Replay</h3>
                                 <p className="text-xs text-orange-200/60 mt-1">Офлайн дообучение на вердиктах MLX</p>
                              </div>
                              <div className="ml-auto text-orange-400 text-xs px-2 py-1 bg-orange-500/20 rounded">JSONL Ready</div>
                           </div>
                        </div>
                      </div>
                   </div>
                )}
              </div>
            </div>

            {/* AIAgent Drawer (Sliding from Right) */}
            {!isChatOpen && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
                <button 
                  onClick={async () => {
                    alert("🚀 Deploy-Morph начал упаковку вашего проекта в Docker!");
                    await fetch("http://localhost:8000/api/v1/deploy", { method: "POST" });
                  }}
                  className="bg-blue-600/60 border border-r-0 border-white/10 p-4 rounded-l-2xl hover:bg-blue-500/80 transition-colors shadow-[0_0_30px_rgba(37,99,235,0.3)] flex flex-col items-center group">
                  <span className="text-2xl group-hover:scale-110 transition-transform mb-2">🐳</span>
                  <span className="text-xs text-white font-bold [writing-mode:vertical-rl] rotate-180 tracking-widest">DEPLOY</span>
                </button>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="bg-black/60 border border-r-0 border-white/10 p-4 rounded-l-2xl hover:bg-white/10 transition-colors shadow-[0_0_30px_rgba(255,107,0,0.15)] flex flex-col items-center group">
                  <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🤖</span>
                  <span className="text-xs text-primary font-bold [writing-mode:vertical-rl] rotate-180 tracking-widest">АГЕНТ IDE</span>
                </button>
              </div>
            )}

            <div className={`absolute right-4 top-4 bottom-4 w-[400px] glass-panel flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-30 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${isChatOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}>
              <div className="p-5 border-b border-white/5 bg-black/40 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-primary p-0.5">
                    <div className="w-full h-full bg-[#06080D] rounded-full flex items-center justify-center text-xl">🤖</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm">Мозг (Core Mind)</div>
                    <div className="text-[10px] text-green-400 flex items-center gap-1 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-primary to-orange-500 text-white rounded-br-none shadow-[0_5px_15px_rgba(255,107,0,0.2)]' 
                        : 'bg-white/5 text-gray-200 border border-white/10 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-bl-none flex items-center space-x-2">
                       <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
                       <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.2s'}}></span>
                       <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.4s'}}></span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={sendChatMessage} className="p-4 bg-black/60 border-t border-white/5 shrink-0">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Прикажите ИИ разработать..." 
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary pr-12 text-sm transition-all focus:bg-white/5"
                  />
                  <button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-2 p-1.5 bg-primary disabled:opacity-50 text-white rounded-lg hover:bg-orange-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
                <div className="text-[10px] text-center text-gray-500 mt-2 flex items-center justify-center gap-1 font-mono uppercase tracking-wider">
                   [ENTER] Изменить логику / UI
                </div>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
