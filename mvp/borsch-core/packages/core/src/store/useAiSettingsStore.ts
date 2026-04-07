import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AiProvider = 'openai' | 'anthropic' | 'mlx' | 'ollama' | 'gemini';

interface AiSettingsStore {
  provider: AiProvider;
  apiKey: string;
  systemRules: string;
  localModelName: string;
  setProvider: (p: AiProvider) => void;
  setApiKey: (key: string) => void;
  setSystemRules: (rules: string) => void;
  setLocalModelName: (name: string) => void;
}

export const useAiSettingsStore = create<AiSettingsStore>()(
  persist(
    (set) => ({
      provider: 'openai',
      apiKey: '',
      systemRules: 'Ты — умный и строгий ассистент ресторана. Отвечай кратко, по делу и фокусируйся на продажах, кухне и складе.',
      localModelName: 'gemma4:e4b',
      
      setProvider: (provider) => set({ provider }),
      setApiKey: (apiKey) => set({ apiKey }),
      setSystemRules: (systemRules) => set({ systemRules }),
      setLocalModelName: (localModelName) => set({ localModelName }),
    }),
    {
      name: 'rms-ai-settings',
    }
  )
);
