import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'ru' | 'en' | 'he' | 'uk';

export interface SystemTranslation {
  key: string;
  ru?: string;
  en?: string;
  he?: string;
  uk?: string;
}

export const LOCAL_TRANSLATIONS: SystemTranslation[] = [
  { key: 'today', ru: 'Сегодня', en: 'Today', he: 'היום', uk: 'Сьогодні' },
  { key: 'tomorrow', ru: 'Завтра', en: 'Tomorrow', he: 'מחר', uk: 'Завтра' },
  { key: 'order_success', ru: 'Заказ принят!', en: 'Order accepted!', he: 'ההזמנה התקבלה!', uk: 'Замовлення прийнято!' },
  { key: 'order_success_desc', ru: 'Наш менеджер скоро свяжется с вами или вы получите уведомление в Telegram.', en: 'Our manager will contact you soon or you will receive a notification in Telegram.', he: 'המנהל שלנו יצור איתך קשר בקרוב או שתקבל התראה בטלגרם.', uk: 'Наш менеджер скоро зв\'яжеться з вами або ви отримаєте сповіщення в Telegram.' },
  { key: 'track_order', ru: 'Следить в Telegram', en: 'Track in Telegram', he: 'עקוב בטלגרם', uk: 'Стежити в Telegram' },
  { key: 'your_order', ru: 'Ваш заказ', en: 'Your order', he: 'ההזמנה שלך', uk: 'Ваше замовлення' },
  { key: 'total', ru: 'Итого', en: 'Total', he: 'סך הכל', uk: 'Разом' },
  { key: 'back_to_menu', ru: 'Вернуться к меню', en: 'Back to menu', he: 'חזרה לתפריט', uk: 'Повернутися до меню' },
  { key: 'empty_cart', ru: 'Корзина пока пуста', en: 'Cart is empty', he: 'העגלה ריקה', uk: 'Кошик поки що порожній' },
  { key: 'delivery', ru: 'Доставка', en: 'Delivery', he: 'משלוח', uk: 'Доставка' },
  { key: 'pickup', ru: 'Самовывоз', en: 'Pickup', he: 'איסוף עצמי', uk: 'Самовивіз' },
  { key: 'pickup_address_text', ru: 'Заберите заказ по нашему адресу:', en: 'Pick up your order at our address:', he: 'אסוף את ההזמנה שלך מהכתובת שלנו:', uk: 'Заберіть замовлення за нашою адресою:' },
  { key: 'closed', ru: 'Закрыто / Closed', en: 'Closed', he: 'סגור', uk: 'Зачинено' },
  { key: 'out_of_stock_btn', ru: 'Нет в наличии', en: 'Out of stock', he: 'אזל המלאי', uk: 'Немає в наявності' },
  { key: 'addons_free', ru: 'Дополнения (бесплатно):', en: 'Addons (free):', he: 'תוספות (בחינם):', uk: 'Доповнення (безкоштовно):' },
  { key: 'bread', ru: 'Хлеб 🍞', en: 'Bread 🍞', he: 'לחם 🍞', uk: 'Хліб 🍞' },
  { key: 'cutlery', ru: 'Приборы 🍴', en: 'Cutlery 🍴', he: 'סכו"ם 🍴', uk: 'Прибори 🍴' },
  { key: 'name', ru: 'Имя', en: 'Name', he: 'שם', uk: 'Ім\'я' },
  { key: 'phone', ru: 'Телефон', en: 'Phone', he: 'טלפון', uk: 'Телефон' },
  { key: 'street', ru: 'Улица', en: 'Street', he: 'רחוב', uk: 'Вулиця' },
  { key: 'house', ru: 'Дом', en: 'House', he: 'בית', uk: 'Будинок' },
  { key: 'apt', ru: 'Кв.', en: 'Apt.', he: 'דירה', uk: 'Кв.' },
  { key: 'time', ru: 'Время', en: 'Time', he: 'זמן', uk: 'Час' },
  { key: 'payment_cash', ru: 'Наличными', en: 'Cash', he: 'במזומן', uk: 'Готівкою' },
  { key: 'payment_bit', ru: 'Bit / Перевод', en: 'Bit / Transfer', he: 'ביט / העברה', uk: 'Bit / Переказ' },
  { key: 'checkout_btn', ru: 'Оформить заказ', en: 'Checkout', he: 'לביצוע הזמנה', uk: 'Оформити замовлення' },
  { key: 'out_of_stock', ru: 'Закончилось на сегодня', en: 'Out of stock today', he: 'אזל המלאי להיום', uk: 'Закінчилося на сьогодні' },
  { key: 'out_of_stock_alert', ru: 'Нет в наличии на сегодня. Выберите другую дату в корзине.', en: 'Out of stock for today. Select another date in cart.', he: 'אזל המלאי להיום. בחר תאריך אחר בעגלה.', uk: 'Немає в наявності на сьогодні. Виберіть іншу дату в кошику.' },
  { key: 'max_portions', ru: 'Максимальное количество порций на сегодня. Выберите другую дату в корзине.', en: 'Max portions for today. Select another date in cart.', he: 'כמות מקסימלית להיום. בחר תאריך אחר בעגלה.', uk: 'Максимальна кількість порцій на сьогодні. Виберіть іншу дату в кошику.' },
  { key: 'add_to_cart', ru: 'В корзину', en: 'Add to cart', he: 'הוסף לעגלה', uk: 'У кошик' },
  { key: 'pieces', ru: 'шт', en: 'pcs', he: 'יח\'', uk: 'шт' },
  { key: 'poll', ru: 'Опрос', en: 'Poll', he: 'סקר', uk: 'Опитування' },
  { key: 'price', ru: 'Цена', en: 'Price', he: 'מחיר', uk: 'Ціна' },
  { key: 'menu_and_order', ru: 'Меню и заказ тут', en: 'Menu & Order here', he: 'תפריט והזמנה כאן', uk: 'Меню та замовлення тут' },
  { key: 'link_copied', ru: 'Ссылка скопирована', en: 'Link copied', he: 'הקישור הועתק', uk: 'Посилання скопійовано' },
  { key: 'want_in_menu_btn', ru: 'Хочу в меню!', en: 'Want in menu!', he: 'רוצה בתפריט!', uk: 'Хочу в меню!' },
  { key: 'nothing_here', ru: 'Тут пока ничего нет', en: 'Nothing here yet', he: 'אין פה כלום עדיין', uk: 'Тут поки нічого немає' },
  { key: 'empty_category_desc', ru: 'Мы скоро добавим вкусные позиции в этот раздел. Заглядывайте позже!', en: 'We\'ll add tasty items here soon. Check back later!', he: 'נוסיף פריטים טעימים לכאן בקרוב. חזרו מאוחר יותר!', uk: 'Ми скоро додамо смачні позиції в цей розділ. Заглядайте пізніше!' },
  { key: 'cart', ru: 'Корзина', en: 'Cart', he: 'עגלה', uk: 'Кошик' },
  { key: 'call_us', ru: 'Позвонить', en: 'Call us', he: 'התקשרו אלינו', uk: 'Зателефонувати' },
  { key: 'our_address', ru: 'Наш адрес', en: 'Our address', he: 'הכתובת שלנו', uk: 'Наша адреса' },
  { key: 'full_menu', ru: 'Всё меню', en: 'Full Menu', he: 'כל התפריט', uk: 'Все меню' },
  { key: 'want_in_menu', ru: '🔥 Хочу в меню', en: '🔥 Want in menu', he: '🔥 רוצה בתפריט', uk: '🔥 Хочу в меню' },
];

interface LocaleState {
  locale: Locale;
  hasPicked: boolean;
  systemTranslations: SystemTranslation[];
  setLocale: (loc: Locale) => void;
  setSystemTranslations: (t: SystemTranslation[]) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ru',
      hasPicked: false,
      systemTranslations: [],
      setLocale: (loc) => set({ locale: loc, hasPicked: true }),
      setSystemTranslations: (t) => set({ systemTranslations: t }),
    }),
    {
      name: 'locale-storage',
      partialize: (state) => ({ locale: state.locale, hasPicked: state.hasPicked }), // Do not persist translations
    }
  )
);

export const translate = (loc: string, ru: string, en?: string, he?: string, uk?: string) => {
  if (loc === 'he' && he && he.trim() !== '') return he;
  if (loc === 'uk' && uk && uk.trim() !== '') return uk;
  if (loc === 'en' && en && en.trim() !== '') return en;
  return ru;
};

export const translateKey = (state: LocaleState, key: string, fallbackRu: string) => {
  const tr = state.systemTranslations.find(t => t.key === key) || LOCAL_TRANSLATIONS.find(t => t.key === key);
  if (!tr) return fallbackRu; // if not found, use fallback
  return translate(state.locale, tr.ru || fallbackRu, tr.en, tr.he, tr.uk);
};
