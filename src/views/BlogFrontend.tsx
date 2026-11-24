'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Clock,
  User,
  ChevronLeft,
  BookOpen,
  Eye,
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Logo from '../components/Logo';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

type PublicComment = {
  id: string;
  user: string;
  text: string;
  date: string;
};

type PublicPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  views: number;
  category: string;
  coverImageUrl: string | null;
  comments: PublicComment[];
};

type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};

type BlogPayload = {
  businessId: string | null;
  settings: {
    seoTitle: string;
    seoDescription: string;
  };
  categories: PublicCategory[];
  posts: PublicPost[];
};

export default function BlogFrontend() {
  const router = useRouter();
  const [blog, setBlog] = useState<BlogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePost, setActivePost] = useState<PublicPost | null>(null);

  const [commentForm, setCommentForm] = useState({ user: '', email: '', text: '' });
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterNotice, setNewsletterNotice] = useState<string | null>(null);

  const loadBlog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/blog', { cache: 'no-store' });
      const payload = await parseApiJson<BlogPayload>(res);
      setBlog(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارتباط با سرور بلاگ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlog();
  }, [loadBlog]);

  const filteredPosts = useMemo(() => {
    if (!blog) return [];
    return blog.posts.filter((p) => {
      const catOk = selectedCategory === 'همه' || p.category === selectedCategory;
      const q = searchQuery.trim();
      const qOk =
        !q || p.title.includes(q) || p.excerpt.includes(q) || p.author.includes(q) || p.category.includes(q);
      return catOk && qOk;
    });
  }, [blog, selectedCategory, searchQuery]);

  const openPost = (post: PublicPost) => {
    setActivePost(post);
    setCommentNotice(null);
    void fetch('/api/public/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view', postId: post.id }),
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost) return;
    setSubmittingComment(true);
    setCommentNotice(null);
    try {
      const res = await fetch('/api/public/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          businessId: blog?.businessId ?? undefined,
          postId: activePost.id,
          user: commentForm.user.trim(),
          email: commentForm.email.trim(),
          text: commentForm.text.trim(),
        }),
      });
      await parseApiJson(res);
      setCommentNotice('دیدگاه شما ثبت شد و پس از تایید مدیر نمایش داده می‌شود.');
      setCommentForm({ user: '', email: '', text: '' });
    } catch (err) {
      setCommentNotice(err instanceof Error ? err.message : 'خطا در ثبت دیدگاه');
    } finally {
      setSubmittingComment(false);
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
          businessId: blog?.businessId ?? undefined,
          email: newsletterEmail.trim(),
        }),
      });
      await parseApiJson<{ subscribed: boolean }>(res);
      setNewsletterNotice('عضویت شما در خبرنامه ثبت شد.');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterNotice(err instanceof Error ? err.message : 'ایمیل نامعتبر است.');
    }
  };

  const featuredPost = filteredPosts[0] ?? null;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button type="button" onClick={() => router.push('/')}>
              <Logo />
            </button>
            <nav className="hidden md:flex items-center gap-6">
              <button
                type="button"
                onClick={() => setSelectedCategory('همه')}
                className={`text-sm font-bold ${
                  selectedCategory === 'همه' ? 'text-nexa-accent' : 'text-gray-500 hover:text-nexa-accent'
                }`}
              >
                همه مقالات
              </button>
              {(blog?.categories ?? []).slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`text-sm font-bold transition-colors ${
                    selectedCategory === cat.name
                      ? 'text-nexa-accent'
                      : 'text-gray-500 hover:text-nexa-accent'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی مقاله..."
                className="bg-gray-100 rounded-xl py-2 pr-9 pl-3 text-xs w-52 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-nexa-primary text-white rounded-xl font-bold text-xs"
            >
              ورود به پنل
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Featured */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div
            onClick={() => featuredPost && openPost(featuredPost)}
            className={`relative min-h-[320px] rounded-[2.5rem] overflow-hidden bg-gradient-to-l from-[#2b2a28] via-[#3a3834] to-[#1e1d1b] flex flex-col justify-end p-10 md:p-12 ${
              featuredPost ? 'cursor-pointer' : ''
            }`}
          >
            {featuredPost?.coverImageUrl && (
              <img
                src={featuredPost.coverImageUrl}
                alt={featuredPost.title}
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
            )}
            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3 py-1 bg-nexa-accent text-gray-900 text-[10px] font-black rounded-full mb-4">
                {featuredPost ? featuredPost.category || 'مقاله ویژه' : blog?.settings.seoTitle || 'بلاگ نکساپوینت'}
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                {featuredPost ? featuredPost.title : blog?.settings.seoTitle || 'مجله تخصصی کسب‌وکار'}
              </h1>
              {featuredPost ? (
                <div className="flex flex-wrap items-center gap-6 text-white/70 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <User size={15} /> {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1.5 font-fa-num">
                    <Clock size={15} /> {featuredPost.date}
                  </span>
                  <span className="flex items-center gap-1.5 font-fa-num">
                    <Eye size={15} /> {featuredPost.views.toLocaleString('fa-IR')} بازدید
                  </span>
                </div>
              ) : (
                <p className="text-white/70 text-sm">
                  {blog?.settings.seoDescription || 'مقالات منتشرشده در پنل مدیریت محتوا اینجا نمایش داده می‌شوند.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Feed */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {loading ? (
              <div className="space-y-8">
                {[1, 2].map((n) => (
                  <div key={n} className="h-64 rounded-[2rem] bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-gray-50 rounded-[2rem] p-16 text-center space-y-3">
                <BookOpen size={40} className="mx-auto text-gray-300" />
                <h3 className="text-base font-black text-gray-800">مقاله‌ای برای نمایش یافت نشد</h3>
                <p className="text-xs text-gray-500">
                  از پنل مدیریت بخش «مدیریت محتوا و بلاگ» اولین مقاله را منتشر کنید.
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => openPost(post)}
                  className="group cursor-pointer bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="relative aspect-[16/7] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen size={44} className="text-gray-300" />
                    )}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-xs font-black text-gray-900 shadow">
                        {post.category || 'عمومی'}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 space-y-3">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-bold">
                      <span className="flex items-center gap-1.5 font-fa-num">
                        <Clock size={14} /> {post.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User size={14} /> {post.author}
                      </span>
                      <span className="flex items-center gap-1.5 font-fa-num">
                        <Eye size={14} /> {post.views.toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 group-hover:text-nexa-accent transition-colors leading-tight">
                      {post.title}
                    </h2>
                    {post.excerpt && <p className="text-gray-500 text-sm leading-relaxed">{post.excerpt}</p>}
                    <span className="inline-flex items-center gap-2 text-sm font-black text-nexa-accent pt-2">
                      ادامه مطلب
                      <ChevronLeft size={18} />
                    </span>
                  </div>
                </motion.article>
              ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="bg-gray-50 p-8 rounded-[2rem]">
              <h3 className="text-lg font-black mb-6">دسته‌بندی‌ها</h3>
              {(blog?.categories ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">دسته‌بندی ثبت نشده است.</p>
              ) : (
                <div className="space-y-3">
                  {blog?.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className="w-full flex items-center justify-between text-sm font-bold text-gray-600 hover:text-nexa-accent transition-colors"
                    >
                      <span>{cat.name}</span>
                      <span className="px-2 py-0.5 bg-white rounded-lg text-[10px] font-fa-num">
                        {blog.posts.filter((p) => p.category === cat.name).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-nexa-primary p-8 rounded-[2rem] text-white">
              <h3 className="text-lg font-black mb-3">عضویت در خبرنامه</h3>
              <p className="text-white/60 text-xs mb-5 leading-relaxed">
                جدیدترین مقالات و اطلاعیه‌ها را در ایمیل خود دریافت کنید.
              </p>
              <form onSubmit={(e) => void handleSubscribe(e)} className="space-y-3">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="ایمیل شما"
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder:text-white/50 outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-nexa-accent text-gray-900 rounded-xl text-xs font-black"
                >
                  تایید عضویت
                </button>
              </form>
              {newsletterNotice && <p className="text-[11px] text-emerald-300 mt-3">{newsletterNotice}</p>}
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-14 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-2xl font-black tracking-tighter text-nexa-accent">
              {blog?.settings.seoTitle || 'NEXA BLOG'}
            </span>
          </div>
          <p className="text-gray-400 text-xs font-fa-num">© ۱۴۰۴ تمامی حقوق محفوظ است.</p>
        </div>
      </footer>

      {/* Article Reader Modal */}
      <AnimatePresence>
        {activePost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePost(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto p-8 space-y-6"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-black text-nexa-accent">{activePost.category}</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">{activePost.title}</h2>
                  <p className="text-xs text-gray-400 mt-2 font-fa-num">
                    نویسنده: {activePost.author} · تاریخ: {activePost.date}
                  </p>
                </div>
                <button type="button" onClick={() => setActivePost(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="text-sm text-gray-700 leading-8 whitespace-pre-wrap">
                {activePost.content || activePost.excerpt || 'متن کامل مقاله هنوز وارد نشده است.'}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <MessageSquare size={16} className="text-nexa-accent" />
                  دیدگاه‌ها ({activePost.comments.length})
                </h3>
                {activePost.comments.map((c) => (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-gray-900">{c.user}</span>
                      <span className="text-gray-400 font-fa-num">{c.date}</span>
                    </div>
                    <p className="text-xs text-gray-600">{c.text}</p>
                  </div>
                ))}

                <form onSubmit={(e) => void handleAddComment(e)} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      required
                      value={commentForm.user}
                      onChange={(e) => setCommentForm({ ...commentForm, user: e.target.value })}
                      placeholder="نام شما"
                      className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs outline-none"
                    />
                    <input
                      type="email"
                      value={commentForm.email}
                      onChange={(e) => setCommentForm({ ...commentForm, email: e.target.value })}
                      placeholder="ایمیل (اختیاری)"
                      className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs outline-none"
                    />
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={commentForm.text}
                    onChange={(e) => setCommentForm({ ...commentForm, text: e.target.value })}
                    placeholder="دیدگاه خود را بنویسید..."
                    className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs outline-none"
                  />
                  {commentNotice && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={14} />
                      {commentNotice}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="nexa-btn-primary text-xs px-6 py-2.5 disabled:opacity-50"
                  >
                    {submittingComment ? 'در حال ارسال…' : 'ارسال دیدگاه'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
