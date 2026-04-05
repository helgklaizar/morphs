import { pb } from '../pocketbase';

export interface AiSettings {
  id: string;
  openai_key: string;
  gemini_key: string;
  api_key: string;
  base_url: string;
  model_name: string;
  system_prompt: string;
  prompt_base: string;
  prompt_custom: string;
  prompt_forbidden: string;
  provider: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  is_autopilot?: boolean;
  is_peak_pricing_enabled?: boolean;
  peak_pricing_multiplier?: number;
  low_stock_threshold?: number;
}

export class AiSettingsRepository {
  static async fetch(): Promise<AiSettings | null> {
    try {
      const record = await pb.collection('ai_settings').getFirstListItem('', {
        sort: 'created'
      });
      return record as unknown as AiSettings;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  static async update(id: string, updated: Partial<AiSettings>): Promise<AiSettings> {
    const record = await pb.collection('ai_settings').update(id, updated);
    return record as unknown as AiSettings;
  }
}
