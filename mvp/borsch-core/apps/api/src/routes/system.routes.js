"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const router = new hono_1.Hono();
router.get('/settings', (c) => {
    return c.json({
        items: [{
                is_preorder_mode: false,
                is_delivery_enabled: true,
                is_pickup_enabled: true,
                hero_title: "BORSCH",
                hero_subtitle: "Домашняя кухня с доставкой",
                contact_phone: "+972 50 000 0000",
                address: "Твой город, Твоя улица 1",
                is_taking_orders: true,
                show_loyalty_block: true,
                show_promo_block: true
            }]
    });
});
router.get('/translations', (c) => {
    return c.json({
        items: [
            { key: "full_menu", ru: "Все меню", en: "Full Menu", he: "תפריט מלא", uk: "Все меню" },
            { key: "cart", ru: "Корзина", en: "Cart", he: "עגלה", uk: "Кошик" }
        ]
    });
});
exports.default = router;
//# sourceMappingURL=system.routes.js.map