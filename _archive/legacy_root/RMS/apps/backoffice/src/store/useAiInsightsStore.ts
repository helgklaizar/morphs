import { create } from 'zustand';
import { AiInsight } from '@/components/ai/AiInsightCard';
import { useToastStore } from './useToastStore';

export type AdvisorModule = 'crm' | 'menu' | 'dashboard' | 'inventory' | 'tables';

export const getModuleFromPath = (path: string): AdvisorModule | null => {
  if (path.startsWith('/clients') || path.startsWith('/loyalty')) return 'crm';
  if (path.startsWith('/menu')) return 'menu';
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/inventory') || path.startsWith('/procurement') || path.startsWith('/suppliers')) return 'inventory';
  if (path.startsWith('/seating') || path.startsWith('/tables')) return 'tables';
  return null;
};

interface AiInsightsState {
  insightsByModule: Record<string, AiInsight[]>;
  isLoading: boolean;
  fetchInsights: (module: AdvisorModule) => Promise<void>;
}

export const useAiInsightsStore = create<AiInsightsState>((set, get) => ({
  insightsByModule: {},
  isLoading: false,

  fetchInsights: async (module: AdvisorModule) => {
    // If we already have them and are not forcing reload, we could skip.
    // Let's just fetch every time or simulate it.
    set({ isLoading: true });
    
    try {
      // 1. In a real app we'd fetch from Ollama / PB here
      // For now we will ping Ollama REST directly if it's there, else fallback.
      let fetchedInsights: AiInsight[] = [];
      
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma:4b',
            prompt: `Сгенерируй один полезный бизнес-совет для модуля ${module} в системе ресторана в формате JSON массива с полями: id, type (tip, warning, success, action), text. Строго верни только JSON.`,
            stream: false,
          })
        });
        
        if (response.ok) {
           const result = await response.json();
           const text = result.response;
           const jsonMatch = text.match(/\[[\s\S]*\]/);
           if (jsonMatch) {
             fetchedInsights = JSON.parse(jsonMatch[0]);
           }
        }
      } catch (ollamaErr) {
        // Fallback or empty if ollama not running
        console.log("Ollama backend not available, using fallback test insights.");
        fetchedInsights = [
          {
            id: 'mock-insight-1',
            type: 'tip',
            text: `(Тест) Обратите внимание на показатели в модуле ${module}. Искусственный интеллект проанализировал данные.`
          },
          {
            id: 'mock-insight-2',
            type: 'action',
            text: `(Тест) Рекомендуется обновить настройки.`,
            action: { label: 'Обновить', onClick: () => console.log('Mock action clicked') }
          }
        ];
      }

      set(state => ({
        insightsByModule: {
          ...state.insightsByModule,
          [module]: fetchedInsights
        }
      }));
      
    } catch (err) {
      console.error("AI Advisor Error:", err);
      // useToastStore.getState().error("Ошибка ИИ: Не удалось сгенерировать советы.");
    } finally {
      set({ isLoading: false });
    }
  }
}));
