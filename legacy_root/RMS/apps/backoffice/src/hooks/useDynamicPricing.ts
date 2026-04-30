import { useAiSettingsStore } from '@/store/useAiSettingsStore';
import { useMemo } from 'react';

/**
 * Хук для расчета динамической цены (Peak Pricing)
 * Учитывает:
 * 1. Часы пик (Lunch 12-14, Dinner 19-21)
 * 2. Низкие остатки на складе (Stock Threshold)
 */
export const useDynamicPricing = () => {
  const settings = useAiSettingsStore((state) => state.settings);

  const isPeakTime = useMemo(() => {
    const hour = new Date().getHours();
    // Часы пик: Обед и Ужин
    return (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
  }, []);

  const getDynamicPrice = (basePrice: number, stockQuantity?: number) => {
    if (!settings?.is_peak_pricing_enabled) return basePrice;

    let multiplier = 1;
    const peakMult = settings.peak_pricing_multiplier || 1.20;
    const threshold = settings.low_stock_threshold || 5;

    // 1. Проверка времени пик
    if (isPeakTime) {
      multiplier = peakMult;
    }

    // 2. Проверка дефицита (если товара осталось мало - наценка еще +10%)
    if (stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= threshold) {
      multiplier *= 1.1;
    }

    return Math.round(basePrice * multiplier);
  };

  return { 
    getDynamicPrice, 
    isPeakTime,
    isEnabled: settings?.is_peak_pricing_enabled || false,
    multiplier: settings?.peak_pricing_multiplier || 1
  };
};
