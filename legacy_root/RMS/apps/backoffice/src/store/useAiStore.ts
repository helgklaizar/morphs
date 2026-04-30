import { create } from 'zustand';
import { GoogleGenerativeAI, ChatSession, FunctionDeclaration, Schema, SchemaType } from '@google/generative-ai';
import { useInventoryStore } from './useInventoryStore';
import { useOrdersStore } from './useOrdersStore';
import { useMenuStore } from './useMenuStore';
import { useRecipesStore } from './useRecipesStore';
import { useAssembliesStore } from './useAssembliesStore';
import { useWorkersStore } from './useWorkersStore';
import { useAiSettingsStore } from './useAiSettingsStore';
import { useSuppliersStore } from './useSuppliersStore';
import { useShiftsStore } from './useShiftsStore';
import { useWasteStore } from './useWasteStore';
import { useLandingSettingsStore } from './useLandingSettingsStore';
import { useStocktakesStore } from './useStocktakesStore';
import { useDocumentsStore } from './useDocumentsStore';
import { pb } from '@/lib/pocketbase';

export type Sender = 'user' | 'ai' | 'system';

export interface AiMessage {
  id: string;
  text: string;
  sender: Sender;
  isLoading?: boolean;
  imagePath?: string;
}

interface AiState {
  messages: AiMessage[];
  isOpen: boolean;
  isInitializing: boolean;
  
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  
  initModel: () => Promise<void>;
  sendMessage: (text: string, currentPath: string, imageBase64?: string, mimeType?: string) => Promise<void>;
  clearHistory: () => void;
}

let chatSession: ChatSession | null = null;
let genAI: GoogleGenerativeAI | null = null;

const createTools = () => {
  return [
    {
      functionDeclarations: [
        {
          name: 'get_inventory_state',
          description: 'Получает текущие остатки на складе и категории.',
        },
        {
          name: 'get_recipes',
          description: 'Получает список рецептов с ингредиентами для расчета фудкоста (себестоимости).',
        },
        {
          name: 'get_assemblies',
          description: 'Получает список сборок хоз-товаров для расчета стоимости упаковки.',
        },
        {
          name: 'get_sales_today',
          description: 'Получает заказы за сегодня для анализа продаж и конверсии.',
        },
        {
          name: 'get_menu_items',
          description: 'Получает список позиций меню.',
        },
        {
          name: 'get_workers_state',
          description: 'Получает список сотрудников, их роли и ставки.',
        },
        {
          name: 'get_suppliers_state',
          description: 'Получает список поставщиков и их контакты.',
        },
        {
          name: 'get_shifts_state',
          description: 'Получает историю смен и выплаты сотрудникам.',
        },
        {
          name: 'get_waste_state',
          description: 'Получает логи списаний и брака.',
        },
        {
          name: 'get_landing_settings',
          description: 'Получает настройки лендинга (адрес, телефон, режим работы).',
        },
        {
          name: 'get_documents',
          description: 'Получает список документов, чеков и накладных из архива.',
        },
        {
          name: 'get_current_page_context',
          description: 'Получает данные, специфичные для открытой страницы. Использовать для контекстного анализа текущего экрана.',
        },
        {
          name: 'mutate_entity',
          description: 'Универсальный инструмент для изменения данных. Использовать для: добавления сотрудников, изменения цен в меню, обновления настроек лендинга, списания товара.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              entity: { type: SchemaType.STRING, description: 'inventory, menu, worker, landing, supplier, waste, shift, document' },
              action: { type: SchemaType.STRING, description: 'add, update, delete' },
              id: { type: SchemaType.STRING, description: 'ID записи (для update/delete)' },
              payload: { type: SchemaType.STRING, description: 'JSON-строка с полями для записи.' },
            },
            required: ['entity', 'action', 'payload'],
          },
        },
      ],
    },
    {
      googleSearch: {}
    }
  ];
};

export const useAiStore = create<AiState>((set, get) => ({
  messages: [
    {
      id: 'init',
      text: 'Я на связи. Знаю всё о твоём RMS AI OS: от остатков на складе до зарплат сотрудников. Чем помочь?',
      sender: 'system'
    }
  ],
  isOpen: false,
  isInitializing: false,
  
  togglePanel: () => set(state => ({ isOpen: !state.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  clearHistory: () => {
    chatSession = null;
    set({
      messages: [{ id: 'init', text: 'История очищена. Я готов к новым задачам.', sender: 'system' }]
    });
    get().initModel();
  },

  initModel: async () => {
    let config = useAiSettingsStore.getState().settings;
    if (!config) {
      await useAiSettingsStore.getState().fetchSettings();
      config = useAiSettingsStore.getState().settings;
    }

    const apiKey = config?.api_key || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const systemPrompt = config?.prompt_base || `Ты — "Мозг" системы управления RMS AI OS. 
У тебя есть полный доступ к данным склада, меню, сотрудников, поставщиков и финансов.
Твоя цель: помогать менеджеру принимать решения, автоматизировать рутину и следить за показателями.
Если менеджер просит что-то изменить (например, цену или добавить сотрудника), используй инструмент mutate_entity.
Отвечай профессионально, но кратко.`;

    if (!apiKey) return;

    try {
      genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: config?.model_name || 'gemini-2.0-flash-exp',
        tools: createTools() as any,
        systemInstruction: systemPrompt
      });

      chatSession = model.startChat();
    } catch (e) {
      console.error("AI Init Error:", e);
    }
  },

  sendMessage: async (text: string, currentPath: string, imageBase64?: string, mimeType?: string) => {
    if (!chatSession) {
      await get().initModel();
      if (!chatSession) return;
    }

    const newMessage: AiMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      imagePath: imageBase64 ? `data:${mimeType};base64,${imageBase64}` : undefined,
    };
    
    const loadingMessage: AiMessage = {
      id: Date.now().toString() + '_loading',
      text: 'Изучаю систему...',
      sender: 'ai',
      isLoading: true
    };

    set(state => ({ messages: [...state.messages, newMessage, loadingMessage] }));

    try {
      const contextPrefix = `[PATH: ${currentPath}]. `;
      const fullText = (currentPath ? contextPrefix : '') + text;

      const parts: any[] = [{ text: fullText }];
      if (imageBase64 && mimeType) {
         parts.push({
           inlineData: { data: imageBase64, mimeType }
         });
      }

      let result = await chatSession.sendMessage(parts);
      let functionCalls = result.response.functionCalls();

      // Recursive tool handling
      while (functionCalls && functionCalls.length > 0) {
        set(state => ({
          messages: state.messages.map(m => m.id === loadingMessage.id ? { ...m, text: 'Работаю с данными...' } : m)
        }));

        const toolResponses = [];
        for (const call of functionCalls) {
          try {
            const name = call.name;
            const args = call.args as Record<string, any>;
            
            let data: unknown = null;

            if (name === 'get_inventory_state') {
              data = useInventoryStore.getState().categories;
            } else if (name === 'get_sales_today') {
              data = useOrdersStore.getState().orders;
            } else if (name === 'get_menu_items') {
              data = useMenuStore.getState().items;
            } else if (name === 'get_workers_state') {
              data = useWorkersStore.getState().workers;
            } else if (name === 'get_suppliers_state') {
              data = useSuppliersStore.getState().suppliers;
            } else if (name === 'get_shifts_state') {
              data = useShiftsStore.getState().shifts;
            } else if (name === 'get_waste_state') {
              data = useWasteStore.getState().records;
            } else if (name === 'get_documents') {
              data = useDocumentsStore.getState().docs;
            } else if (name === 'get_landing_settings') {
              data = useLandingSettingsStore.getState().settings;
            } else if (name === 'get_current_page_context') {
              data = { path: currentPath };
            } else if (name === 'mutate_entity') {
              const payload = JSON.parse(args.payload);
              if (args.entity === 'worker' && args.action === 'add') {
                 await useWorkersStore.getState().addWorker(payload);
              } else if (args.entity === 'landing' && args.action === 'update') {
                 await useLandingSettingsStore.getState().updateSettings(payload);
              } else if (args.entity === 'waste' && args.action === 'add') {
                 await useWasteStore.getState().addWaste(payload);
              } else if (args.entity === 'document' && args.action === 'add') {
                 const { DocumentsRepository } = await import('@/lib/repositories/documents');
                 await DocumentsRepository.upload(
                   payload.name || "AI Generated Doc",
                   payload.type || "other",
                   new Blob([payload.content || ""], { type: 'text/plain' })
                 );
                 await useDocumentsStore.getState().fetchDocs();
              }
              data = { success: true };
            }

            toolResponses.push({ functionResponse: { name, response: { data } } });
          } catch (err: any) {
             toolResponses.push({ functionResponse: { name: call.name, response: { error: err.message } } });
          }
        }
        
        result = await chatSession.sendMessage(toolResponses);
        functionCalls = result.response.functionCalls();
      }

      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== loadingMessage.id),
          { id: Date.now().toString(), text: result.response.text(), sender: 'ai' }
        ]
      }));

    } catch (e: any) {
      console.error(e);
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== loadingMessage.id),
          { id: Date.now().toString(), text: 'Прости, возникла ошибка: ' + e.message, sender: 'system' }
        ]
      }));
    }
  }
}));
