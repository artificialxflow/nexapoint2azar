import type { DashboardSummary } from '@/src/lib/dashboard/types';

export function getMockDashboardSummary(businessName: string): DashboardSummary {
  return {
    businessName,
    stats: {
      receiptTotal: 128_500_000,
      paymentTotal: 94_200_000,
      peopleCount: 42,
      avgDeliveryDays: 3.2,
    },
    chartData: [
      { name: 'فروردین', sales: 4200, visits: 2400 },
      { name: 'اردیبهشت', sales: 5100, visits: 1398 },
      { name: 'خرداد', sales: 3800, visits: 9800 },
      { name: 'تیر', sales: 4780, visits: 3908 },
      { name: 'مرداد', sales: 5890, visits: 4800 },
      { name: 'شهریور', sales: 4390, visits: 3800 },
    ],
    productionStatus: [
      { label: 'در حال تولید', value: 64 },
      { label: 'آماده ارسال', value: 28 },
      { label: 'تأخیر', value: 8 },
    ],
  };
}
