export const sendTelegramNotification = async (order: any) => {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("⚠️ Telegram credentials not found in ENV. Skipping notification.");
      return;
  }

  const itemsList = order.items.map((i: any) => `- ${i.menuItemName} x${i.quantity}`).join('\n');
  const text = `🔥 *Новый заказ!* (Сумма: ${order.totalAmount} ₪)\n👤 ${order.customerName} (${order.customerPhone})\n\n🛒 *Состав:*\n${itemsList}`;

  try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text,
              parse_mode: 'Markdown'
          })
      });
  } catch (e) {
      console.error("Ошибка отправки Telegram-уведомления:", e);
  }
};
