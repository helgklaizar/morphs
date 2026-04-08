import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../../config';

export interface AnalyticsData {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    newClients: number;
    avgCheck: number;
  };
  salesByDay: Array<{ date: string; amount: number }>;
  popularItems: Array<{ name: string; quantity: number }>;
}

export const fetchAnalytics = async (): Promise<AnalyticsData> => {
  const res = await fetch(`${API_URL}/system/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
};

export function useAnalyticsQuery() {
  return useQuery<AnalyticsData, Error>({
    queryKey: ['system', 'analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 60000, // Refresh every minute
  });
}
