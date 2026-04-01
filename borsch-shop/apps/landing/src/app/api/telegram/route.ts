import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://borsch.shop';
    
    // Auth not required if ai_settings is public, but let's assume it is open for reading.
    const pbRes = await fetch(`${pbUrl}/api/collections/ai_settings/records?perPage=1`, { cache: 'no-store' });
    if (!pbRes.ok) throw new Error(await pbRes.text());
    
    const settingsData = await pbRes.json();
    const settings = settingsData?.items?.[0] || {};
    
    const botToken = settings.telegram_bot_token;
    const chatId = settings.telegram_chat_id;

    if (!botToken || !chatId) {
      console.warn("Telegram not configured in ai_settings");
      return NextResponse.json({ success: false, error: "Not configured" }, { status: 400 });
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Telegram API Error:", errText);
      return NextResponse.json({ success: false, error: errText }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error sending telegram:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
