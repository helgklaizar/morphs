import { create } from 'zustand';
import { useAiSettingsStore } from './useAiSettingsStore';

export interface AiMessage {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  imagePath?: string;
}

interface AiStore {
  messages: AiMessage[];
  clearHistory: () => void;
  sendMessage: (text: string, moduleCtx?: string, base64Image?: string, mimeType?: string) => Promise<void>;
  addMessage: (msg: AiMessage) => void;
}

export const useAiStore = create<AiStore>((set, get) => ({
  messages: [],
  clearHistory: () => set({ messages: [] }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  sendMessage: async (text, moduleCtx, base64Image, mimeType) => {
    // 1. Add User Message
    const userMsgId = Math.random().toString(36).substring(7);
    const userMsg: AiMessage = {
      id: userMsgId,
      text,
      sender: 'user',
      timestamp: new Date(),
      imagePath: base64Image ? `data:${mimeType};base64,${base64Image}` : undefined,
    };
    get().addMessage(userMsg);

    // 2. Add System loading message
    const sysMsgId = Math.random().toString(36).substring(7);
    get().addMessage({
      id: sysMsgId,
      text: 'Формирую ответ...',
      sender: 'system',
      timestamp: new Date(),
      isLoading: true
    });

    try {
      const config = useAiSettingsStore.getState();
      let responseText = '';
      
      const systemPrompt = `${config.systemRules}\nContext: ${moduleCtx || 'Общий'}`;
      let useProvider = config.provider;

      if ((useProvider === 'gemini' || useProvider === 'openai' || useProvider === 'anthropic') && !config.apiKey.trim()) {
        useProvider = 'ollama'; // Fallback to local
      }

      if (useProvider === 'ollama') {
        const payload = {
          model: config.localModelName || 'gemma4:e4b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text, images: base64Image ? [base64Image] : undefined }
          ],
          stream: false
        };
        const res = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Ошибка соединения с Ollama. Она запущена / CORS настроен?");
        }
        const data = await res.json();
        responseText = data.message?.content || 'Ollama: Пустой ответ';
      } else if (useProvider === 'gemini') {
        const apiKey = config.apiKey.trim();
        const payload = {
          contents: [{ 
            role: "user", 
            parts: base64Image ? [
              {text: `${systemPrompt}\n\n${text}`},
              {inlineData: {data: base64Image, mimeType: mimeType || 'image/jpeg'}}
            ] : [{text: `${systemPrompt}\n\n${text}`}]
          }]
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Ошибка соединения с Gemini API.");
        const data = await res.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini: Пустой ответ';
      } else {
        // Fallback for demo openai/anthropic that need custom integration or we just show a mockup
        await new Promise(r => setTimeout(r, 1000));
        responseText = `(Заглушка для: ${useProvider})\nОтвет: ${text}`;
      }

      // 3. Update loading message
      set((state) => ({
        messages: state.messages.map(m => m.id === sysMsgId ? { ...m, text: responseText, isLoading: false } : m)
      }));
    } catch (error: any) {
      set((state) => ({
        messages: state.messages.map(m => m.id === sysMsgId ? { ...m, text: `Ошибка: ${error.message}`, isLoading: false } : m)
      }));
    }
  }
}));
