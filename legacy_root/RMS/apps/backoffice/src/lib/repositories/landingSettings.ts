import { pb } from '../pocketbase';

export interface LandingSettings {
  id: string;
  store_name: string;
  store_description: string;
  hero_title: string;
  hero_title_en: string;
  hero_title_he: string;
  hero_title_uk: string;
  hero_subtitle: string;
  hero_subtitle_en: string;
  hero_subtitle_he: string;
  hero_subtitle_uk: string;
  about_text: string;
  about_text_en: string;
  about_text_he: string;
  about_text_uk: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  address_en: string;
  address_he: string;
  address_uk: string;
  working_hours: string;
  working_hours_en: string;
  working_hours_he: string;
  working_hours_uk: string;
  is_pickup_enabled: boolean;
  is_delivery_enabled: boolean;
  is_preorder_mode: boolean;
  show_loyalty_block?: boolean;
  show_promo_block?: boolean;
  target_margin?: number;
  critical_food_cost?: number;
}

export class LandingSettingsRepository {
  static async fetch(): Promise<LandingSettings | null> {
    try {
      const record = await pb.collection('landing_settings').getFirstListItem('', {
        sort: 'created'
      });
      return record as unknown as LandingSettings;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  static async update(id: string, updated: Partial<LandingSettings>): Promise<LandingSettings> {
    const record = await pb.collection('landing_settings').update(id, updated);
    return record as unknown as LandingSettings;
  }
}
