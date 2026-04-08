import { API_URL } from '../../config';

export interface LandingSettings {
  heroTitle: string;
  heroSubtitle: string;
  contactPhone: string;
  address: string;
  isPreorderMode?: boolean;
  isDeliveryEnabled?: boolean;
  isPickupEnabled?: boolean;
  isTakingOrders?: boolean;
}

export const fetchSettings = async (): Promise<LandingSettings> => {
  const res = await fetch(`${API_URL}/system/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  const s = json.items?.[0] || {};
  return {
    heroTitle: s.heroTitle ?? s.hero_title ?? '',
    heroSubtitle: s.heroSubtitle ?? s.hero_subtitle ?? '',
    contactPhone: s.contactPhone ?? s.contact_phone ?? '',
    address: s.address ?? '',
    isPreorderMode: s.isPreorderMode ?? s.is_preorder_mode,
    isDeliveryEnabled: s.isDeliveryEnabled ?? s.is_delivery_enabled,
    isPickupEnabled: s.isPickupEnabled ?? s.is_pickup_enabled,
    isTakingOrders: s.isTakingOrders ?? s.is_taking_orders,
  };
};

export const updateSettings = async (data: Partial<LandingSettings>): Promise<LandingSettings> => {
  const res = await fetch(`${API_URL}/system/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
};
