'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Plus,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { useCatalog } from '@/src/context/CatalogContext';
import { useCatalogEnsure } from '@/src/hooks/useCatalogEnsure';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type ApiOrder = {
  id: string;
  orderNo: string;
  customer: string;
  items: string;
  date: string;
  status: string;
  progress: number;
  type: 'new' | 'processing' | 'completed';
  amount: string;
  totalRial: number;
  notes: string;
};

type ApiShippingSchedule = {
  id: string;
  orderId: string | null;
  orderNo: string;
  customerName: string;
  carrierName: string;
  scheduledDate: string;
  trackingCode: string;
  status: string;
  notes: string;
};

type OrdersPayload = {
  orders: ApiOrder[];
  shippingSchedules: ApiShippingSchedule[];
  summary: {
    total: number;
    newCount: number;
    processingCount: number;
    completedCount: number;
  };
};

const tabs = [
  { id: 'all', label: 'همه سفارشات' },
  { id: 'new', label: 'سفارشات جدید' },
  { id: 'processing', label: 'در حال پردازش' },
  { id: 'completed', label: 'تکمیل شده' },
];

const fm = (n: number) => n.toLocaleString('fa-IR');

export default function Orders() {
  useCatalogEnsure('people');
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;
  const { people } = useCatalog();

  const [ordersList, setOrdersList] = useState<ApiOrder[]>([]);
  const [shippingSchedules, setShippingSchedules] = useState<ApiShippingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer: '', items: '', date: '', amount: '', status: 'پیش‌فاکتور' });
  const [shippingForm, setShippingForm] = useState({
    orderId: '',
    scheduledDate: '',
    carrierName: 'وانت نیسان',
  });

  const loadOrders = useCallback(async () => {
    if (!activeBusinessId) {
      setOrdersList([]);
      setShippingSchedules([]);
      return;
    }
    setLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/orders`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await parseApiJson<OrdersPayload>(res);
      setOrdersList(data.orders);
      setShippingSchedules(data.shippingSchedules);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'خطا در بارگذاری سفارشات');
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusinessId || !newOrder.customer.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const numericAmount = Number(String(newOrder.amount).replace(/,/g, '')) || 0;
      const res = await fetch(`/api/businesses/${activeBusinessId}/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'order',
          customer: newOrder.customer.trim(),
          items: newOrder.items.trim() || 'کالای سفارشی',
          date: newOrder.date.trim() || new Intl.DateTimeFormat('fa-IR').format(new Date()),
          status: newOrder.status,
          progress: newOrder.status === 'تایید شده' ? 20 : 10,
          type: 'new',
          amount: newOrder.amount.trim(),
          totalRial: numericAmount,
        }),
      });
      await parseApiJson(res);
      setIsModalOpen(false);
      setNewOrder({ customer: '', items: '', date: '', amount: '', status: 'پیش‌فاکتور' });
      await loadOrders();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'خطا در ثبت سفارش');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (order: ApiOrder) => {
    if (!activeBusinessId) return;
    const next =
      order.type === 'new'
        ? { status: 'در حال تولید', progress: 60, type: 'processing' as const }
        : order.type === 'processing'
          ? { status: 'تحویل شده', progress: 100, type: 'completed' as const }
          : { status: 'تحویل شده', progress: 100, type: 'completed' as const };
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/orders`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'order', id: order.id, ...next }),
      });
      await parseApiJson(res);
      await loadOrders();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی سفارش');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShipping = async () => {
    if (!activeBusinessId) return;
    const targetOrder = ordersList.find((o) => o.id === shippingForm.orderId) ?? ordersList[0];
    if (!targetOrder) {
      setIsShippingModalOpen(false);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/businesses/${activeBusinessId}/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'shipping',
          orderId: targetOrder.id,
          orderNo: targetOrder.orderNo,
          customerName: targetOrder.customer,
          carrierName: shippingForm.carrierName,
          scheduledDate: shippingForm.scheduledDate.trim() || new Intl.DateTimeFormat('fa-IR').format(new Date()),
          status: 'برنامه‌ریزی شده',
        }),
      });
      await parseApiJson(res);
      setIsShippingModalOpen(false);
      setShippingForm({ orderId: '', scheduledDate: '', carrierName: 'وانت نیسان' });
      await loadOrders();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'خطا در ثبت برنامه ارسال');
    } finally {
      setSaving(false);
    }
  };

  const filteredOrders = useMemo(
    () =>
      ordersList.filter((order) => {
        const matchesTab = activeTab === 'all' || order.type === activeTab;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          order.customer.toLowerCase().includes(q) || order.orderNo.toLowerCase().includes(q);
        return matchesTab && matchesSearch;
      }),
    [ordersList, activeTab, searchQuery],
  );

  const stats = useMemo(
    () => [
      { label: 'کل سفارشات ثبت‌شده', value: fm(ordersList.length), icon: Package, color: 'text-blue-600' },
      { label: 'سفارشات جدید', value: fm(ordersList.filter((o) => o.type === 'new').length), icon: AlertCircle, color: 'text-amber-600' },
      { label: 'در حال پردازش', value: fm(ordersList.filter((o) => o.type === 'processing').length), icon: Clock, color: 'text-indigo-600' },
      { label: 'تکمیل / آماده تحویل', value: fm(ordersList.filter((o) => o.type === 'completed').length), icon: CheckCircle2, color: 'text-emerald-600' },
    ],
    [ordersList],
  );

  return (
    <div className="space-y-8">
      {saveError ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">
          {saveError}
        </p>
      ) : null}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">مدیریت سفارشات</h1>
          <p className="text-sm text-gray-500 mt-1">رهگیری چرخه حیات سفارش از ثبت تا تحویل نهایی</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsShippingModalOpen(true)}
            className="flex-1 md:flex-none bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Truck size={18} />
            برنامه ارسال ({fm(shippingSchedules.length)})
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none nexa-btn-primary flex items-center justify-center gap-2 py-3 md:py-2"
          >
            <ShoppingCart size={18} />
            ثبت سفارش جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="nexa-card p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-black text-gray-900 font-fa-num">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-nexa-accent shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شماره سفارش یا نام مشتری..."
            className="w-full bg-white border border-nexa-border rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="nexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50/50 border-b border-nexa-border">
                <th className="px-6 py-4 text-xs font-black text-gray-400">شماره سفارش</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">مشتری</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">اقلام</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">وضعیت پیشرفت</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">وضعیت</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexa-border">
              <AnimatePresence mode="popLayout">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-xs text-gray-400">
                      {loading ? 'در حال بارگذاری سفارشات...' : 'هنوز سفارشی ثبت نشده است.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{order.orderNo}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-700">{order.customer}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{order.items}</td>
                      <td className="px-6 py-4">
                        <div className="w-32 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="font-fa-num">{fm(order.progress)}٪</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${order.progress}%` }}
                              className={`h-full transition-all duration-500 ${
                                order.progress === 100 ? 'bg-emerald-500' : 'bg-nexa-accent'
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            order.type === 'completed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : order.type === 'processing'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.type !== 'completed' ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleAdvanceStatus(order)}
                            className="text-xs font-bold text-nexa-accent hover:underline"
                          >
                            مرحله بعد
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold">تکمیل</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">ثبت سفارش جدید</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleAddOrder} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                      <User size={14} />
                      نام مشتری
                    </label>
                    <input
                      required
                      list="order-customers-datalist"
                      value={newOrder.customer}
                      onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })}
                      placeholder="نام مشتری را وارد یا انتخاب کنید"
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    />
                    <datalist id="order-customers-datalist">
                      {people.map((p) => (
                        <option key={p.id} value={p.displayName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                      <Calendar size={14} />
                      تاریخ تحویل پیشنهادی
                    </label>
                    <input
                      type="text"
                      value={newOrder.date}
                      onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num focus:ring-2 focus:ring-nexa-accent/20"
                      placeholder="۱۴۰۵/۱۲/۱۵"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                    <Package size={14} />
                    اقلام سفارش
                  </label>
                  <input
                    type="text"
                    value={newOrder.items}
                    onChange={(e) => setNewOrder({ ...newOrder, items: e.target.value })}
                    placeholder="نام کالا یا مدل..."
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                      <DollarSign size={14} />
                      مبلغ کل (تومان)
                    </label>
                    <input
                      type="text"
                      value={newOrder.amount}
                      onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num focus:ring-2 focus:ring-nexa-accent/20"
                      placeholder="۴۵,۰۰۰,۰۰۰"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">وضعیت اولیه</label>
                    <select
                      value={newOrder.status}
                      onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    >
                      <option value="پیش‌فاکتور">پیش‌فاکتور</option>
                      <option value="تایید شده">تایید شده</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="submit" disabled={saving} className="flex-1 nexa-btn-primary py-3 disabled:opacity-50">
                    ثبت و صدور سفارش
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shipping Schedule Modal */}
      <AnimatePresence>
        {isShippingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShippingModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">برنامه‌ریزی ارسال محموله</h3>
                <button type="button" onClick={() => setIsShippingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">انتخاب سفارش</label>
                  {ordersList.length === 0 ? (
                    <p className="text-xs text-gray-400">سفارشی برای برنامه‌ریزی ارسال وجود ندارد.</p>
                  ) : (
                    <select
                      value={shippingForm.orderId}
                      onChange={(e) => setShippingForm((prev) => ({ ...prev, orderId: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm"
                    >
                      <option value="">انتخاب سفارش...</option>
                      {ordersList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.orderNo} — {o.customer} ({o.items})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">تاریخ ارسال</label>
                    <input
                      type="text"
                      value={shippingForm.scheduledDate}
                      onChange={(e) => setShippingForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num focus:ring-2 focus:ring-nexa-accent/20"
                      placeholder="۱۴۰۵/۱۲/۰۵"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">نوع خودرو / باربری</label>
                    <select
                      value={shippingForm.carrierName}
                      onChange={(e) => setShippingForm((prev) => ({ ...prev, carrierName: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-nexa-accent/20"
                    >
                      <option>وانت نیسان</option>
                      <option>خاور مسقف</option>
                      <option>کامیونت</option>
                    </select>
                  </div>
                </div>
                {shippingSchedules.length > 0 && (
                  <div className="border-t border-nexa-border pt-3 space-y-1.5 max-h-32 overflow-y-auto">
                    <p className="text-[11px] font-bold text-gray-500">ارسال‌های برنامه‌ریزی شده:</p>
                    {shippingSchedules.map((s) => (
                      <div key={s.id} className="text-xs flex justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                        <span>
                          {s.orderNo} — {s.customerName}
                        </span>
                        <span className="font-fa-num text-gray-500">
                          {s.scheduledDate} ({s.carrierName})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCreateShipping()}
                  className="w-full nexa-btn-primary py-3 mt-4 disabled:opacity-50"
                >
                  تایید و ثبت در تقویم ارسال
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
