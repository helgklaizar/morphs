import { useState, useCallback } from 'react';
import { AiInsight } from '@/components/ai/AiInsightCard';
import { useToastStore } from '@/store/useToastStore';

type AdvisorModule = 'crm' | 'menu' | 'dashboard' | 'inventory' | 'tables';

const FALLBACK_INSIGHTS: Record<AdvisorModule, AiInsight[]> = {
  crm: [
    {
      id: 'crm-1',
      type: 'action',
      text: 'Внимание: 7 клиентов из топ-20 по LTV не заказывали больше 3-х недель. Я сгенерировал для них персонализированное SMS с промокодом "-15%".',
      action: {
        label: 'Отправить рассылку',
        onClick: () => new Promise(res => setTimeout(res, 1000))
      }
    },
    {
      id: 'crm-2',
      type: 'tip',
      text: 'Паттерн покупок: 60% клиентов, берущих "Рамен", заказывают любой напиток, но мы не предлагаем его явно. Рекомендую добавить авто-апсейл напитка на чекауте.',
      action: {
        label: 'Включить апсейл',
        onClick: () => Promise.resolve()
      }
    }
  ],
  menu: [
    {
      id: 'menu-1',
      type: 'warning',
      text: 'Блюдо "Борщ с говядиной" перешло в категорию "Собаки". Себестоимость выросла до 42% из-за скачка цен на мясо. Предлагаю поднять цену на 4₪ — отток не превысит 2%.',
      action: {
        label: 'Применить новую цену',
        onClick: () => new Promise(res => setTimeout(res, 800))
      }
    },
    {
      id: 'menu-2',
      type: 'success',
      text: 'Эксперимент с комбо-наборами успешен! "Сет Студенческий" дал +12% к среднему чеку за выходные. Стоит добавить еще 2 подобных 세та.',
    }
  ],
  dashboard: [
    {
      id: 'dash-1',
      type: 'success',
      text: 'Доброе утро! Вчера мы закрылись с плюсом 12% к среднему вторнику (14 200 ₪). Отличный рост предзаказов.',
    },
    {
      id: 'dash-2',
      type: 'warning',
      text: 'Обратите внимание: работник "Анна" показывает самый низкий средний чек (не предлагает десерты). Советую провести фокусную пятиминутку перед сменой.',
      action: {
        label: 'Поставить задачу админу',
        onClick: () => Promise.resolve()
      }
    }
  ],
  inventory: [
    {
      id: 'inv-1',
      type: 'tip',
      text: 'Прогноз: Через 3 дня ожидается потепление и праздник. Спрос на холодные напитки исторически растет на 45%. Я подготовил черновик предзаказа у поставщика.',
      action: {
        label: 'Смотреть черновик',
        onClick: () => Promise.resolve()
      }
    },
    {
      id: 'inv-2',
      type: 'warning',
      text: 'Контроль Food Waste: За последние 2 недели списание томатов выросло на 18%. Возможно нарушение ТТК в салатах или сбой температурного режима.',
    }
  ],
  tables: [
    {
      id: 'tab-1',
      type: 'tip',
      text: 'С 14:00 до 16:00 сегодня прогнозируется провал по посадке. Давайте закинем push-уведомление в Telegram со скидкой 20% на ланчи до 15:30?',
      action: {
        label: 'Запустить акцию',
        onClick: () => new Promise(res => setTimeout(res, 1200))
      }
    }
  ]
};

export function useAiAdvisor(module: AdvisorModule) {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error } = useToastStore();

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // In a real production environment, this would:
      // 1. Fetch raw aggregate data from PocketBase or standard Repositories (RFM, margins, etc)
      // 2. Call local Ollama/Gemma endpoint: await fetch('http://localhost:11434/api/generate', ...)
      // 3. Parse JSON output and convert to AiInsight[] format.
      // 4. Save to `ai_insights` table in PB.
      
      // Temporary: returning empty array since backend worker is not implemented yet.
      // We removed the hardcoded FAKES based on user request.
      setInsights([]);
      
    } catch (err) {
      console.error("AI Advisor Error:", err);
      useToastStore.getState().error("Ошибка ИИ: Не удалось сгенерировать советы. Проверьте подключение к локальной модели.");
    } finally {
      setIsLoading(false);
    }
  }, [module]);

  return {
    insights,
    isLoading,
    fetchInsights
  };
}
