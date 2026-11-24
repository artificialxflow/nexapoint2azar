'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Package,
  TrendingUp,
  Globe,
  Image as ImageIcon,
  ShoppingCart,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStoreModuleState } from '@/src/hooks/useStoreModuleState';

const tabs = [
  { id: 'products', label: 'مدیریت محصولات' },
  { id: 'orders', label: 'سفارشات فروشگاه' },
  { id: 'seo', label: 'تنظیمات SEO' },
  { id: 'settings', label: 'تنظیمات فروشگاه' },
  { id: 'analytics', label: 'تحلیل فروش' },
];

function parseNumericPrice(raw: string): number {
  const ascii = raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[^\d.]/g, '');
  const n = Number(ascii);
  return Number.isFinite(n) ? n : 0;
}

export default function StoreAdmin() {
  const { module: store, persist: persistStore, saveError: storeSaveError } = useStoreModuleState();
  const [activeTab, setActiveTab] = useState('products');
  const productsList = store.products;
  const ordersList = store.orders;
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', cat: 'مبلمان', price: '', stock: '' });
  const [seoForm, setSeoForm] = useState(store.seo);
  const [settingsForm, setSettingsForm] = useState(store.settings);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setSeoForm(store.seo);
    setSettingsForm(store.settings);
  }, [store.seo, store.settings]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const product = {
      id: `STR-${Date.now()}`,
      ...newProduct,
      seo: 'نیاز به بررسی',
      status: 'active' as const,
    };
    void persistStore((prev) => ({ ...prev, products: [product, ...prev.products] }));
    setIsModalOpen(false);
    setNewProduct({ name: '', cat: 'مبلمان', price: '', stock: '' });
  };

  const handleDeleteProduct = (id: string) => {
    void persistStore((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const handleCycleOrderStatus = (id: string) => {
    void persistStore((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== id) return o;
        const nextStatus =
          o.status === 'pending' ? 'shipped' : o.status === 'shipped' ? 'delivered' : 'delivered';
        return { ...o, status: nextStatus };
      }),
    }));
  };

  const handleSaveSeo = async () => {
    const ok = await persistStore((prev) => ({ ...prev, seo: seoForm }));
    if (ok) setSavedMsg('تنظیمات سئو ذخیره شد.');
  };

  const handleSaveSettings = async () => {
    const ok = await persistStore((prev) => ({ ...prev, settings: settingsForm }));
    if (ok) setSavedMsg('تنظیمات فروشگاه ذخیره شد.');
  };

  const filteredProducts = productsList.filter(
    (p) => p.name.includes(searchQuery) || p.cat.includes(searchQuery)
  );

  const filteredOrders = ordersList.filter(
    (o) => o.customer.includes(searchQuery) || o.id.includes(searchQuery)
  );

  const stats = useMemo(() => {
    const totalSales = ordersList.reduce((s, o) => s + parseNumericPrice(o.total), 0);
    const pendingOrders = ordersList.filter((o) => o.status === 'pending').length;
    const deliveredOrders = ordersList.filter((o) => o.status === 'delivered').length;
    const totalStock = productsList.reduce((s, p) => s + parseNumericPrice(p.stock), 0);
    return { totalSales, pendingOrders, deliveredOrders, totalStock };
  }, [ordersList, productsList]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'کل محصولات', value: productsList.length.toLocaleString('fa-IR'), icon: Package, color: 'text-blue-600' },
                { label: 'کل سفارشات', value: ordersList.length.toLocaleString('fa-IR'), icon: ShoppingCart, color: 'text-emerald-600' },
                { label: 'سفارشات در انتظار', value: stats.pendingOrders.toLocaleString('fa-IR'), icon: Globe, color: 'text-purple-600' },
                { label: 'مجموع موجودی', value: stats.totalStock.toLocaleString('fa-IR'), icon: TrendingUp, color: 'text-amber-600' },
              ].map((stat, idx) => (
                <div key={idx} className="nexa-card p-6">
                  <p className="text-xs font-bold text-gray-400 mb-1">{stat.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-gray-900 font-fa-num">{stat.value}</p>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                </div>
              ))}
            </div>

            <div className="nexa-card overflow-hidden">
              <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی محصول..."
                    className="w-full bg-white border border-nexa-border rounded-xl py-2 pr-10 pl-4 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-nexa-border">
                      <th className="px-6 py-4">محصول</th>
                      <th className="px-6 py-4">دسته‌بندی</th>
                      <th className="px-6 py-4">قیمت</th>
                      <th className="px-6 py-4">موجودی</th>
                      <th className="px-6 py-4">وضعیت سئو</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexa-border">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                          محصولی در فروشگاه ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                <ImageIcon size={20} />
                              </div>
                              <span className="text-sm font-bold text-gray-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{p.cat}</td>
                          <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{p.price}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-fa-num">{p.stock}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                p.seo === 'عالی'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : p.seo === 'خوب'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-amber-50 text-amber-600'
                              }`}
                            >
                              {p.seo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        );

      case 'orders':
        return (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card overflow-hidden"
          >
            <div className="p-6 border-b border-nexa-border flex items-center justify-between bg-gray-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی سفارش یا مشتری..."
                  className="w-full bg-white border border-nexa-border rounded-xl py-2 pr-10 pl-4 text-sm outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-nexa-border">
                    <th className="px-6 py-4">شماره سفارش</th>
                    <th className="px-6 py-4">مشتری</th>
                    <th className="px-6 py-4">تاریخ</th>
                    <th className="px-6 py-4">مبلغ کل</th>
                    <th className="px-6 py-4">وضعیت</th>
                    <th className="px-6 py-4">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexa-border">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                        هنوز سفارشی از فروشگاه آنلاین ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{order.id}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">{order.customer}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-fa-num">{order.date}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900 font-fa-num">{order.total}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              order.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-600'
                                : order.status === 'shipped'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {order.status === 'delivered'
                              ? 'تحویل شده'
                              : order.status === 'shipped'
                                ? 'ارسال شده'
                                : 'در انتظار'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          {order.status !== 'delivered' && (
                            <button
                              type="button"
                              onClick={() => handleCycleOrderStatus(order.id)}
                              className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100"
                            >
                              {order.status === 'pending' ? 'ثبت ارسال' : 'ثبت تحویل'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        );

      case 'seo':
        return (
          <motion.div
            key="seo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card p-8 max-w-3xl"
          >
            <h3 className="text-lg font-black mb-6">تنظیمات سئو عمومی فروشگاه</h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">عنوان سئو (Meta Title)</label>
                <input
                  type="text"
                  value={seoForm.title}
                  onChange={(e) => setSeoForm({ ...seoForm, title: e.target.value })}
                  placeholder="عنوان نمایشی فروشگاه در نتایج جستجو"
                  className="w-full bg-white border border-nexa-border rounded-xl py-2.5 px-4 text-sm outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">توضیحات متا (Meta Description)</label>
                <textarea
                  value={seoForm.description}
                  onChange={(e) => setSeoForm({ ...seoForm, description: e.target.value })}
                  className="w-full bg-white border border-nexa-border rounded-xl py-3 px-4 text-sm min-h-[100px] outline-none"
                  placeholder="توضیحاتی که در نتایج موتورهای جستجو نمایش داده می‌شود..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">کلمات کلیدی</label>
                <input
                  type="text"
                  value={seoForm.keywords}
                  onChange={(e) => setSeoForm({ ...seoForm, keywords: e.target.value })}
                  placeholder="با ویرگول جدا کنید..."
                  className="w-full bg-white border border-nexa-border rounded-xl py-2.5 px-4 text-sm outline-none"
                />
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-nexa-border flex justify-end">
              <button type="button" className="nexa-btn-primary" onClick={() => void handleSaveSeo()}>
                ذخیره تنظیمات سئو
              </button>
            </div>
          </motion.div>
        );

      case 'analytics':
        return (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="nexa-card p-6 bg-nexa-primary text-white">
                <p className="text-xs opacity-70 mb-1">جمع مبلغ سفارشات فروشگاه</p>
                <h4 className="text-2xl font-black font-fa-num">
                  {stats.totalSales.toLocaleString('fa-IR')} {store.settings.currency || 'تومان'}
                </h4>
              </div>
              <div className="nexa-card p-6 bg-white border border-nexa-border">
                <p className="text-xs text-gray-400 mb-1">کل سفارشات ثبت‌شده</p>
                <h4 className="text-2xl font-black text-gray-900 font-fa-num">
                  {ordersList.length.toLocaleString('fa-IR')}
                </h4>
              </div>
              <div className="nexa-card p-6 bg-white border border-nexa-border">
                <p className="text-xs text-gray-400 mb-1">سفارشات تحویل‌شده</p>
                <h4 className="text-2xl font-black text-emerald-600 font-fa-num">
                  {stats.deliveredOrders.toLocaleString('fa-IR')}
                </h4>
              </div>
            </div>
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="nexa-card p-8 max-w-3xl"
          >
            <h3 className="text-lg font-black mb-8">تنظیمات فروشگاه آنلاین</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">نام فروشگاه</label>
                <input
                  type="text"
                  value={settingsForm.shopName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">واحد پول</label>
                <select
                  value={settingsForm.currency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                >
                  <option value="تومان">تومان</option>
                  <option value="ریال">ریال</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">توضیحات ارسال و تحویل</label>
                <textarea
                  value={settingsForm.shippingNote}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shippingNote: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                  placeholder="شرایط ارسال سفارش‌ها..."
                />
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-nexa-border flex justify-end gap-3">
              <button type="button" className="nexa-btn-primary" onClick={() => void handleSaveSettings()}>
                ذخیره تغییرات
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {storeSaveError ? (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{storeSaveError}</p>
      ) : null}
      {savedMsg ? (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {savedMsg}
          </span>
          <button type="button" onClick={() => setSavedMsg(null)} className="text-emerald-600">
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">مدیریت فروشگاه آنلاین</h1>
          <p className="text-gray-500 mt-1">کنترل کامل بر محصولات، سفارشات و تنظیمات فروشگاه</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/shop"
            className="bg-white border border-nexa-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Globe size={18} />
            مشاهده فروشگاه
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="nexa-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            افزودن محصول جدید
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-nexa-accent shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>

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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-nexa-border flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900">افزودن محصول جدید به فروشگاه</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">نام محصول</label>
                  <input
                    required
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">دسته‌بندی</label>
                    <input
                      required
                      type="text"
                      value={newProduct.cat}
                      onChange={(e) => setNewProduct({ ...newProduct, cat: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">قیمت ({store.settings.currency || 'تومان'})</label>
                    <input
                      required
                      type="text"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">موجودی انبار</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-fa-num outline-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" className="flex-1 nexa-btn-primary py-3">
                    انتشار محصول
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
    </div>
  );
}
