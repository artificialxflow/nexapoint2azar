# Nexapoint — مهاجرت فرانت NEXA (از `nexapre/`)

**دامنه:** UI/UX + **auth OTP/SMS** (Prisma/Postgres)؛ بقیه ماژول‌ها هنوز mock/API-less.  
**مرجع:** پوشهٔ محلی `nexapre/` (در `.gitignore`).  
**هدف:** پیاده‌سازی کامل طرح در ریشهٔ این پروژه.

---

## ورود OTP + Postgres (فاز auth)

- [x] `env.example` · Prisma (`User`, `Session`, `OtpChallenge`, `SystemRole`)
- [x] API: `POST /api/auth/otp/request` · `POST /api/auth/otp/verify` · `GET /api/auth/me` · `POST /api/auth/logout`
- [x] UI لاگین پیامکی وقتی `NEXT_PUBLIC_FRONTEND_ONLY=false`
- [x] seed: موبایل `09126723365` برای کاربر `admin` (OTP با sms.ir یا mock در لاگ)
- [ ] migrate + seed روی Postgres واقعی · اتصال `SMS_IR_*` در production

## ورود demo (placeholder — فاز ۲)

| فیلد | مقدار |
|------|--------|
| نام کاربری | `demo` |
| رمز عبور | `demo1234` |

- [x] پیاده‌سازی mock login: فقط این جفت قبول شود؛ session در cookie/localStorage
- [x] پس از ورود موفق → `/businesses` یا آخرین مسیر محافظت‌شده
- [x] logout بدون API
- [x] hint زیر فرم («برای تست: demo / demo1234»)

---

## فاز ۰ — آماده‌سازی و مرجع

- [x] افزودن `nexapre/` به `.gitignore`
- [x] کپی `nexapre/app/favicon.ico` → `app/favicon.ico`
- [x] انتقال کامپوننت `Logo.tsx` (SVG inline + متن nexa)
- [x] هم‌تراز کردن `metadata` (title/description) با NEXA
- [x] نصب وابستگی‌های UI (clsx, lucide-react, motion, recharts, …)
- [x] `tsconfig` paths: `"@/*": ["./*"]`
- [x] انتقال توکن‌ها و استایل (`app/globals.css` + فونت local)
- [x] فونت Vazirmatn از `public/fonts/`
- [x] فایل `src/lib/frontend-config.ts`

---

## فاز ۱ — اسکلت App Router و شِل

- [x] `app/(site)/layout.tsx` + `app/providers.tsx`
- [x] `app/layout.tsx`: `lang="fa"` `dir="rtl"`
- [x] مسیرها: `/`, `/shop`, `/blog`, `/mobile`
- [x] `/login`, `/change-password`, `/invite/[token]`
- [x] `/businesses`, `/businesses/new`
- [x] `/dashboard` → redirect `/dashboard/dashboard`
- [x] `/dashboard/[view]` + `view-map.tsx`
- [x] `DashboardShell`: Sidebar + Header + AnimatePresence
- [x] `middleware` با cookie `nexa_mock_session`
- [x] `not-found.tsx` فارسی

---

## فاز ۲ — لایه Mock (بدون بک‌اند)

- [x] **Auth mock** + حساب placeholder
- [x] **Business mock:** seed «شرکت نمایشی» + localStorage
- [x] **Meizito:** همه sliceها `mock` + `mock-bootstrap.ts`
- [x] **Catalog:** بدون sync API در mock
- [x] **Dashboard summary:** mock
- [x] **Settings (access/projects/business):** mock در localStorage + کلاینت `settings/business-client` و `admin/client`
- [x] **پیوست محلی:** IndexedDB + `AttachmentPickerModal` (بدون Nextcloud)
- [x] **اتوماسیون فرانت:** event bus + rule engine + دستیار پیشنهاد اختیاری
- [x] **Products API writes:** local state در mock

---

## فاز ۳ — صفحات عمومی (مارکتینگ)

- [x] `LandingPage`
- [x] `StoreFrontend`
- [x] `BlogFrontend`
- [x] `MobileApp`
- [x] RTL (پایه در globals + layout)

---

## فاز ۴ — Auth و onboarding (UI)

- [x] `login/page.client.tsx` (mock + hint)
- [x] `change-password` (UI از مرجع)
- [x] `invite/[token]`
- [x] `BusinessListPage` + `BusinessSetupPage`

---

## فاز ۵ — داشبورد و ERP (Sidebar)

- [x] همه ویوهای `view-map` (فایل‌ها از `nexapre/src/views` کپی شده‌اند)

---

## فاز ۶ — Meizito / میز کار

- [x] همه پنل‌ها و modals (کپی از مرجع + mock bootstrap)

---

## فاز ۷ — تنظیمات (Settings)

- [x] UI سکشن‌ها (کپی مرجع)
- [x] mock کامل API در تب access / projects / business

---

## فاز ۸ — کامپوننت‌های مشترک

- [x] Sidebar, Header, admin modals, … (کپی `src/components`)

---

## فاز ۹ — Context، types، lib کلاینت

- [x] Contextها + catalogSeed + lib کلاینت meizito/pricing
- [x] حذف/عدم استفاده از `lib/**/server.ts` و Prisma

---

## فاز ۱۰ — کیفیت

- [x] `npm run build` سبز
- [ ] `npm run lint`
- [ ] smoke دستی: `/` → login → businesses → dashboard
- [x] README کوتاه

---

## ترتیب بعدی

1. تمام `npm install` و تأیید `npm run build`
2. mock برای Settings → access/projects/business
3. smoke RTL موبایل

---

## لوگو / فاویکون

- [x] لوگو: `src/components/Logo.tsx`
- [x] فاویکون: `app/favicon.ico`
