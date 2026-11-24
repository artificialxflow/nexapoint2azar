'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Search,
  User,
  ArrowLeft,
  Package,
  X,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Logo from '../components/Logo';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type PublicProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  priceLabel: string;
  stockQty: number;
  description: string;
  featured: boolean;
  imageUrl: string | null;
};

type ShopPayload = {
  businessId: string | null;
  settings: {
    shopName: string;
    currency: string;
    shippingNote: string;
    seoTitle?: string;
    seoDescription?: string;
  };
  categories: string[];
  products: PublicProduct[];
};

type CartItem = {
  product: PublicProduct;
  quantity: number;
};

export default function StoreFrontend() {
  const router = useRouter();
  const [shop, setShop] = useState<ShopPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerPhone: '',
    shippingAddress: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/shop', { cache: 'no-store' });
      const payload = await parseApiJson<ShopPayload>(res);
      setShop(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور فروشگاه');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  const categories = useMemo(() => {
    if (!shop) return ['همه'];
    return ['همه', ...shop.categories];
  }, [shop]);

  const filteredProducts = useMemo(() => {
    if (!shop) return [];
    return shop.products.filter((p) => {
      const catOk = selectedCategory === 'همه' || p.category === selectedCategory;
      const q = searchQuery.trim();
      const qOk = !q || p.name.includes(q) || p.category.includes(q) || p.description.includes(q);
      return catOk && qOk;
    });
  }, [shop, selectedCategory, searchQuery]);

  const addToCart = (product: PublicProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.businessId || cart.length === 0) return;
    setSubmitting(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      const res = await fetch('/api/public/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: shop.businessId,
          customerName: checkoutForm.customerName.trim(),
          customerPhone: checkoutForm.customerPhone.trim(),
          shippingAddress: checkoutForm.shippingAddress.trim(),
          notes: checkoutForm.notes.trim(),
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        }),
      });
      const created = await parseApiJson<{ orderNo: string }>(res);
      setOrderSuccess(`سفارش شما با شماره ${created.orderNo} ثبت شد.`);
      setCart([]);
      setCheckoutForm({ customerName: '', customerPhone: '', shippingAddress: '', notes: '' });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'خطا در ارسال سفارش');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      const res = await fetch('/api/public/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          businessId: shop?.businessId ?? undefined,
          email: newsletterEmail.trim(),
        }),
      });
      await parseApiJson<{ subscribed: boolean }>(res);
      setNewsletterStatus('عضویت شما در خبرنامه ثبت شد.');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus(err instanceof Error ? err.message : 'ایمیل نامعتبر است.');
    }
  };

  const currency = shop?.settings.currency || 'تومان';
  const shopName = shop?.settings.shopName || 'فروشگاه نکسا';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button type="button" onClick={() => router.push('/')}>
              <Logo />
            </button>
            <nav className="hidden md:flex items-center gap-6 overflow-x-auto">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-sm font-bold transition-colors pb-1 ${
                    selectedCategory === cat
                      ? 'text-nexa-accent border-b-2 border-nexa-accent'
                      : 'text-gray-500 hover:text-nexa-accent'
                  }`}
                >
                  {cat === 'همه' ? 'همه محصولات' : cat}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در محصولات..."
                className="bg-gray-100 border-none rounded-xl py-2 pr-10 pl-4 text-sm w-64 outline-none focus:ring-2 focus:ring-nexa-accent/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-gray-600 hover:text-nexa-accent transition-colors relative"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-nexa-accent text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center font-fa-num">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-500 hover:text-nexa-accent transition-colors"
              title="ورود به پنل مدیریت"
            >
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative min-h-[300px] rounded-[2.5rem] overflow-hidden bg-gradient-to-l from-[#2b2a28] via-[#3a3834] to-[#201f1d] flex items-center px-10 py-14">
            <div className="max-w-xl text-white">
              <span className="inline-block px-3 py-1 bg-nexa-accent text-gray-900 rounded-full text-[10px] font-black mb-4">
                {shopName}
              </span>
              <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                {shop?.settings.seoTitle || 'خرید مستقیم از کاتالوگ آنلاین'}
              </h1>
              <p className="text-white/70 text-sm mb-8 leading-relaxed">
                {shop?.settings.shippingNote ||
                  shop?.settings.seoDescription ||
                  'محصولات ثبت‌شده در پنل مدیریت به‌صورت لحظه‌ای در فروشگاه نمایش داده می‌شوند.'}
              </p>
              <a
                href="#shop-catalog"
                className="inline-flex px-8 py-3.5 bg-white text-gray-900 rounded-2xl font-bold items-center gap-2 hover:bg-nexa-accent transition-all"
              >
                مشاهده محصولات
                <ArrowLeft size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="shop-catalog" className="max-w-7xl mx-auto px-6 pb-20">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <h2 className="text-2xl font-black">محصولات فروشگاه</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-nexa-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-nexa-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-[2rem] h-80 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center space-y-3">
            <Package size={40} className="mx-auto text-gray-300" />
            <h3 className="text-base font-black text-gray-800">محصولی برای نمایش وجود ندارد</h3>
            <p className="text-xs text-gray-500">
              پس از افزودن محصول در بخش «مدیریت فروشگاه آنلاین»، کالاها اینجا نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <Package size={48} className="text-gray-300" />
                  )}
                </div>
                <div className="p-6">
                  <p className="text-[10px] font-bold text-nexa-accent mb-1 uppercase tracking-wider">
                    {product.category || 'عمومی'}
                  </p>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 group-hover:text-nexa-accent transition-colors">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-lg font-black text-gray-900 font-fa-num">
                        {product.price > 0 ? product.price.toLocaleString('fa-IR') : product.priceLabel}
                      </span>
                      <span className="text-[10px] text-gray-400 mr-1">{currency}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="p-3 bg-gray-100 text-gray-900 rounded-xl hover:bg-nexa-accent transition-all"
                      title="افزودن به سبد خرید"
                    >
                      <ShoppingBag size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <span className="text-2xl font-black tracking-tighter text-nexa-accent">{shopName}</span>
            <p className="text-gray-500 text-sm mt-4 leading-relaxed">
              {shop?.settings.seoDescription || 'فروشگاه آنلاین یکپارچه با سیستم مدیریت کسب‌وکار نکساپوینت.'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-black mb-4">دسترسی سریع</h4>
            <ul className="space-y-3 text-sm text-gray-500 font-bold">
              <li>
                <button type="button" onClick={() => router.push('/blog')} className="hover:text-nexa-accent">
                  مجله و بلاگ
                </button>
              </li>
              <li>
                <button type="button" onClick={() => router.push('/dashboard')} className="hover:text-nexa-accent">
                  پنل مدیریت
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-black mb-4">عضویت در خبرنامه</h4>
            <form onSubmit={(e) => void handleSubscribe(e)} className="flex gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="ایمیل شما"
                className="bg-gray-100 border-none rounded-xl py-2 px-4 text-xs flex-1 outline-none"
              />
              <button type="submit" className="px-4 py-2 bg-nexa-accent text-gray-900 rounded-xl text-xs font-black">
                عضویت
              </button>
            </form>
            {newsletterStatus && <p className="text-[11px] text-emerald-700 mt-2">{newsletterStatus}</p>}
          </div>
        </div>
      </footer>

      {/* Cart & Checkout Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-black">سبد خرید ({cartCount})</h3>
                <button type="button" onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {orderSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {orderSuccess}
                  </div>
                )}
                {orderError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold">
                    {orderError}
                  </div>
                )}

                {cart.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-12">سبد خرید شما خالی است.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.product.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{item.product.name}</p>
                            <p className="text-[11px] text-gray-500 font-fa-num">
                              {(item.product.price * item.quantity).toLocaleString('fa-IR')} {currency}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-black font-fa-num w-5 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-gray-900 text-white rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold opacity-80">جمع کل سفارش</span>
                      <span className="text-base font-black font-fa-num">
                        {cartTotal.toLocaleString('fa-IR')} {currency}
                      </span>
                    </div>

                    <form onSubmit={(e) => void handleCheckout(e)} className="space-y-3 pt-2">
                      <h4 className="text-xs font-black text-gray-800">مشخصات تحویل گیرنده</h4>
                      <input
                        required
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        placeholder="نام و نام خانوادگی"
                        className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                      <input
                        required
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        placeholder="شماره تماس"
                        className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-fa-num outline-none"
                      />
                      <textarea
                        required
                        rows={2}
                        value={checkoutForm.shippingAddress}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shippingAddress: e.target.value })}
                        placeholder="آدرس کامل ارسال"
                        className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full nexa-btn-primary py-3 text-sm font-black disabled:opacity-50"
                      >
                        {submitting ? 'در حال ثبت سفارش…' : 'ثبت نهایی سفارش'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
