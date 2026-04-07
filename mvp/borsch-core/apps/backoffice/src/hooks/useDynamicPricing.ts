import { useMemo } from 'react';

export const useDynamicPricing = () => {
  const isPeakTime = false;

  const getDynamicPrice = (basePrice: number, stockQuantity?: number) => {
    return basePrice;
  };

  return { 
    getDynamicPrice, 
    isPeakTime,
    isEnabled: false,
    multiplier: 1
  };
};
