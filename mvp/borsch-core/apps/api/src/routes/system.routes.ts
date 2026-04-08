import { Hono } from 'hono';
import { prisma } from '../db';
import * as analyticsService from '../services/analytics.service';

const router = new Hono();

router.get('/analytics', async (c) => {
  const data = await analyticsService.getAnalyticsSummary();
  return c.json(data);
});


async function getOrCreateSettings() {
  let settings = await prisma.landingSettings.findFirst();
  if (!settings) {
    settings = await prisma.landingSettings.create({ data: {} });
  }
  return settings;
}

router.get('/settings', async (c) => {
  const settings = await getOrCreateSettings();
  // Map to old snake_case format for compatibility
  return c.json({
    items: [{
      is_preorder_mode: settings.isPreorderMode,
      is_delivery_enabled: settings.isDeliveryEnabled,
      is_pickup_enabled: settings.isPickupEnabled,
      is_taking_orders: settings.isTakingOrders,
      hero_title: settings.heroTitle,
      hero_subtitle: settings.heroSubtitle,
      contact_phone: settings.contactPhone,
      address: settings.address,
      show_loyalty_block: true,
      show_promo_block: true,
      // Also pass camelCase
      isPreorderMode: settings.isPreorderMode,
      isDeliveryEnabled: settings.isDeliveryEnabled,
      isPickupEnabled: settings.isPickupEnabled,
      isTakingOrders: settings.isTakingOrders,
    }]
  });
});

router.put('/settings', async (c) => {
  const body = await c.req.json();
  const settings = await getOrCreateSettings();
  const updated = await prisma.landingSettings.update({
    where: { id: settings.id },
    data: {
      isPreorderMode: body.isPreorderMode ?? body.is_preorder_mode ?? settings.isPreorderMode,
      isDeliveryEnabled: body.isDeliveryEnabled ?? body.is_delivery_enabled ?? settings.isDeliveryEnabled,
      isPickupEnabled: body.isPickupEnabled ?? body.is_pickup_enabled ?? settings.isPickupEnabled,
      isTakingOrders: body.isTakingOrders ?? body.is_taking_orders ?? settings.isTakingOrders,
      heroTitle: body.heroTitle ?? body.hero_title ?? settings.heroTitle,
      heroSubtitle: body.heroSubtitle ?? body.hero_subtitle ?? settings.heroSubtitle,
      contactPhone: body.contactPhone ?? body.contact_phone ?? settings.contactPhone,
      address: body.address ?? settings.address,
    }
  });
  return c.json(updated);
});

router.get('/translations', (c) => {
  return c.json({
    items: [
      { key: "full_menu", ru: "Все меню", en: "Full Menu", he: "תפריט מלא", uk: "Все меню" },
      { key: "cart", ru: "Корзина", en: "Cart", he: "עגלה", uk: "Кошик" }

    ]
  });
});

router.post('/logs', async (c) => {
  const body = await c.req.json();
  const { level = 'info', source = 'unknown', message, details } = body;
  
  console.log(`[📡 FRONT-LOG][${level.toUpperCase()}] from ${source}: ${message}`);
  if (details) console.log(`Details: ${details}`);
  
  // Здесь в будущем можно добавить отправку в Telegram
  return c.json({ success: true });
});

export default router;

