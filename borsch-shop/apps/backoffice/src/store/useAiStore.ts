import { create } from 'zustand';
import { GoogleGenerativeAI, ChatSession, FunctionDeclaration, Schema, SchemaType } from '@google/generative-ai';
import { useInventoryStore } from './useInventoryStore';
import { useOrdersStore } from './useOrdersStore';
import { useMenuStore } from './useMenuStore';
import { useRecipesStore } from './useRecipesStore';
import { useAssembliesStore } from './useAssembliesStore';
import { supabase } from '@/lib/supabase';

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
  
  initModel: () => void;
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
          name: 'get_current_page_context',
          description: 'Получает данные, специфичные для открытой страницы. Использовать для контекстного анализа текущего экрана.',
        },
        {
          name: 'get_sales_analytics',
          description: 'Получает аналитику продаж (заказы) за определенный период дат (ISO форматы, например 2024-01-01).',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              start_date: { type: SchemaType.STRING, description: 'Начальная дата (YYYY-MM-DD)' },
              end_date: { type: SchemaType.STRING, description: 'Конечная дата (YYYY-MM-DD)' },
            },
            required: ['start_date', 'end_date'],
          },
        },
        {
          name: 'process_supplier_receipt',
          description: 'Используй когда пользователь отправляет картинку или текст накладной. Распознает текст и возвращает JSON для добавления на склад.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              items: {
                type: SchemaType.ARRAY,
                description: 'Список распознанных товаров',
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING, description: 'Название товара' },
                    quantity: { type: SchemaType.NUMBER, description: 'Количество' },
                    price: { type: SchemaType.NUMBER, description: 'Цена за единицу (дополнительно)' }
                  }
                }
              }
            },
            required: ['items'],
          },
        },
        {
          name: 'update_inventory_item',
          description: 'Изменяет название, цену или количество товара на складе.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: 'ID товара' },
              name: { type: SchemaType.STRING },
              quantity: { type: SchemaType.NUMBER },
              price: { type: SchemaType.NUMBER },
            },
            required: ['id'],
          },
        },
        {
          name: 'mutate_page_data',
          description: 'Универсальный инструмент для добавления (add) или изменения (update) данных на страницах: Склад (inventory), Меню (menu_items), Рецепты (recipes) и Сборки (assemblies). Удалять (delete) строго запрещено!',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              entity: { type: SchemaType.STRING, description: 'inventory, menu, recipe, или assembly' },
              action: { type: SchemaType.STRING, description: 'add или update' },
              id: { type: SchemaType.STRING, description: 'Обязательно при update' },
              payload: { type: SchemaType.STRING, description: 'JSON-строка с данными (например {"name": "Борщ", "price": 40}). Для рецептов: {"name": "...", "portions": 1, "ingredients": [{"inventoryItemId": "...", "quantity": 0.5}]}' },
            },
            required: ['entity', 'action', 'payload'],
          },
        },
      ],
    },
  ];
};

export const useAiStore = create<AiState>((set, get) => ({
  messages: [
    {
      id: 'init',
      text: 'Привет! Я ИИ-ассистент Borsch Shop. Могу проанализировать продажи или помочь со складом.',
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
      messages: [{ id: 'init', text: 'История очищена.', sender: 'system' }]
    });
    get().initModel();
  },

  initModel: () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      set({
        messages: [{
          id: Date.now().toString(),
          text: 'Внимание: NEXT_PUBLIC_GEMINI_API_KEY не найден в .env.',
          sender: 'system'
        }]
      });
      return;
    }

    try {
      genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        tools: createTools() as any,
        systemInstruction: `Ты профессиональный ИИ-ассистент менеджера кухни и склада "Borsch Shop".
Твоя главная задача: помогать управлять складом, анализировать продажи на основе данных, отвечать на вопросы о текущей странице (пользователь будет передавать контекст своей страницы) и предлагать инсайты.
По запросу выдавай список всех своих команд/инструментов с кратким описанием по каждой.
Для получения данных обязательно вызывай функции (Tools), такие как get_inventory_state, get_sales_today, get_menu_items, get_current_page_context.
Отвечай коротко и по делу.`
      });

      chatSession = model.startChat();
    } catch (e) {
      console.error(e);
      set({
        messages: [{
          id: Date.now().toString(),
          text: 'Ошибка инициализации Gemini: ' + e,
          sender: 'system'
        }]
      });
    }
  },

  sendMessage: async (text: string, currentPath: string, imageBase64?: string, mimeType?: string) => {
    if (!chatSession) {
      get().initModel();
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
      text: 'Анализирую...',
      sender: 'ai',
      isLoading: true
    };

    set(state => ({ messages: [...state.messages, newMessage, loadingMessage] }));

    try {
      // Подготовим сообщение пользователя (включая инфу о текущей странице)
      const contextPrefix = `[ТЕКУЩАЯ СТРАНИЦА: ${currentPath}]. `;
      const fullText = (currentPath ? contextPrefix : '') + text;

      let parts: any[] = [{ text: fullText }];
      
      if (imageBase64 && mimeType) {
         parts.push({
           inlineData: { data: imageBase64, mimeType }
         });
      }

      let result = await chatSession.sendMessage(parts);
      let functionCalls = result.response.functionCalls();

      // Если модель запросила функции
      if (functionCalls && functionCalls.length > 0) {
        set(state => ({
          messages: state.messages.map(m => m.id === loadingMessage.id ? { ...m, text: 'Получаю данные...' } : m)
        }));

        const toolResponses = [];
        
        for (const call of functionCalls) {
          if (call.name === 'get_inventory_state') {
            const items = useInventoryStore.getState().categories.flatMap(c => c.items);
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { data: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit })) }
              }
            });
          } else if (call.name === 'get_sales_today') {
            const orders = useOrdersStore.getState().orders;
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = orders.filter(o => o.createdAt.startsWith(today));
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { data: todayOrders, total: todayOrders.reduce((a, b) => a + b.totalAmount, 0) }
              }
            });
          } else if (call.name === 'get_menu_items') {
            const menu = useMenuStore.getState().items;
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: { data: menu.map(m => ({ name: m.name, price: m.price, id: m.id, categoryId: m.categoryId, recipeId: m.recipeId, assemblyId: m.assemblyId })) }
              }
            });
          } else if (call.name === 'get_current_page_context') {
            let contextData: any = { error: 'No specific context found' };
            if (currentPath === '/orders') contextData = { orders: useOrdersStore.getState().orders };
            if (currentPath === '/inventory') contextData = { categories: useInventoryStore.getState().categories.map(c => ({ id: c.id, name: c.name, items: c.items.map(i => ({ id: i.id, name: i.name })) })) };
            if (currentPath === '/menu') contextData = { menu: useMenuStore.getState().items, categories: useMenuStore.getState().categories };
            if (currentPath === '/recipes') contextData = { recipes: useRecipesStore.getState().recipes };
            if (currentPath === '/assemblies') contextData = { assemblies: useAssembliesStore.getState().assemblies };
            toolResponses.push({
              functionResponse: {
                 name: call.name,
                 response: { data: contextData }
              }
            });
          } else if (call.name === 'get_recipes') {
            const recipes = useRecipesStore.getState().recipes;
            toolResponses.push({
              functionResponse: {
                 name: call.name,
                 response: { data: recipes.map(r => ({ id: r.id, name: r.name, portions: r.portions, ingredients: r.ingredients.map(i => ({ invId: i.inventoryItemId, name: i.inventoryItem?.name, qty: i.quantity, price: i.inventoryItem?.price })) })) }
              }
            });
          } else if (call.name === 'get_assemblies') {
            const assemblies = useAssembliesStore.getState().assemblies;
            toolResponses.push({
              functionResponse: {
                 name: call.name,
                 response: { data: assemblies.map(a => ({ id: a.id, name: a.name, items: a.items.map(i => ({ invId: i.inventoryItemId, name: i.name, qty: i.quantity })) })) }
              }
            });
          } else if (call.name === 'get_sales_analytics') {
            const args: any = call.args;
            const { data } = await supabase.from('orders').select('id, created_at, total_amount, status').gte('created_at', args.start_date).lte('created_at', args.end_date + 'T23:59:59Z');
            toolResponses.push({
              functionResponse: { name: call.name, response: { data: data || [], total: (data || []).reduce((sum, o) => sum + o.total_amount, 0) } }
            });
          } else if (call.name === 'process_supplier_receipt') {
            const args: any = call.args;
            toolResponses.push({
              functionResponse: {
                 name: call.name,
                 response: { success: true, parsed_items: args.items, message: 'Накладная успешно распознана! Скажите пользователю что вы можете добавить эти товары на склад, если он подтвердит.' }
              }
            });
          } else if (call.name === 'update_inventory_item') {
            const args: any = call.args;
            if (args.id) {
               try {
                 const updates: any = {};
                 if (args.name !== undefined) updates.name = args.name;
                 if (args.quantity !== undefined) updates.stock = args.quantity;
                 if (args.price !== undefined) updates.price = args.price;
                 await supabase.from('inventory_items').update(updates).eq('id', args.id);
                 useInventoryStore.getState().fetchInventory();
                 toolResponses.push({
                    functionResponse: {
                       name: call.name,
                       response: { success: true, message: 'Товар успешно обновлен! Склад синхронизирован.' }
                    }
                 });
               } catch (e: any) {
                 toolResponses.push({ functionResponse: { name: call.name, response: { error: e.message } } });
               }
            } else {
               toolResponses.push({ functionResponse: { name: call.name, response: { error: 'Не указан ID товара' } } });
            }
          } else if (call.name === 'mutate_page_data') {
            const args: any = call.args;
            try {
              const payload = JSON.parse(args.payload);
              if (args.entity === 'inventory') {
                if (args.action === 'add') {
                   await useInventoryStore.getState().saveItem({
                     id: '',
                     name: payload.name,
                     categoryId: payload.categoryId,
                     unit: payload.unit || 'шт',
                     price: payload.price || 0,
                     quantity: payload.quantity || payload.stock || 0,
                     supplier: payload.supplier || '',
                     packSize: payload.packSize || 1
                   });
                } else if (args.id) {
                   await supabase.from('inventory_items').update(payload).eq('id', args.id);
                   useInventoryStore.getState().fetchInventory();
                }
              } else if (args.entity === 'menu') {
                if (args.action === 'add') {
                   await useMenuStore.getState().saveMenuItem({
                     id: '',
                     name: payload.name,
                     price: payload.price,
                     categoryId: payload.categoryId,
                     recipeId: payload.recipeId,
                     assemblyId: payload.assemblyId,
                     description: payload.description || '',
                     image: payload.image || '',
                     isActive: true,
                     isPoll: payload.isPoll || false
                   } as any);
                } else if (args.id) {
                   await supabase.from('menu_items').update(payload).eq('id', args.id);
                   useMenuStore.getState().fetchMenuItems();
                }
              } else if (args.entity === 'recipe') {
                if (args.action === 'add') {
                   await useRecipesStore.getState().addRecipe(payload.name, payload.portions, payload.ingredients || []);
                } else if (args.id) {
                   await useRecipesStore.getState().updateRecipe(args.id, payload.name, payload.portions, payload.ingredients || []);
                }
              } else if (args.entity === 'assembly') {
                if (args.action === 'add') {
                   await useAssembliesStore.getState().addAssembly(payload.name, payload.items || []);
                } else if (args.id) {
                   await useAssembliesStore.getState().updateAssembly(args.id, payload.name, payload.items || []);
                }
              }
              toolResponses.push({ functionResponse: { name: call.name, response: { success: true, message: `Успешно (${args.action} ${args.entity})!` } } });
            } catch (e: any) {
              toolResponses.push({ functionResponse: { name: call.name, response: { error: e.message } } });
            }
          }
        }
        
        // Отправляем результаты выполнения функций обратно в модель
        set(state => ({
          messages: state.messages.map(m => m.id === loadingMessage.id ? { ...m, text: 'Генерирую ответ...' } : m)
        }));
        
        result = await chatSession.sendMessage(toolResponses);
      }

      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== loadingMessage.id),
          { id: Date.now().toString(), text: result.response.text() || 'Готово', sender: 'ai' }
        ]
      }));

    } catch (e: any) {
      console.error(e);
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== loadingMessage.id),
          { id: Date.now().toString(), text: 'Произошла ошибка: ' + e.message, sender: 'system' }
        ]
      }));
    }
  }
}));
