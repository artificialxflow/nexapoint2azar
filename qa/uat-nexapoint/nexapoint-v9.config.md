# Nexapoint v9 — UAT Config

## متغیرهای محیط (پروداکشن — مرجع)

| کلید | مقدار مورد انتظار | تأیید |
|------|-------------------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://nexapoint.ir` | باید با BASE_URL یکی باشد |
| `NEXT_PUBLIC_FRONTEND_ONLY` | `false` | API واقعی |
| `MEIZITO_WORKSPACE_STORAGE` | `db` | cutover |
| `MEIZITO_COMMS_STORAGE` | `db` | cutover |
| `SKIP_MIGRATE` | `false` | — |

**ورود به اپ:** [https://nexapoint.ir/login](https://nexapoint.ir/login)  
**لندینگ:** [https://nexapoint.ir/](https://nexapoint.ir/)

## هویت تست

```yaml
BASE_URL: https://nexapoint.ir
ROLE: owner / ادمین اصلی
PERMISSIONS: دسترسی کامل — HR ادمین، دستهٔ نامه، eligibility، تنظیمات میز
BUSINESS: کسب‌وکار فعالی که پس از لاگین در هدر/تنظیمات انتخاب شده (نام را در گزارش یادداشت کن)
LOCALE: fa-IR, RTL
```

## چک سرور (قبل از UAT مرورگر — انجام شده)

```text
npm run test:v9-deploy          → OK
npx tsx scripts/backfill-phone-names-v9.ts → ممکن است updated 0
```

## Scope

- **داخل:** میزیتو v9 طبق `todo-v9.md` و اسناد `updates/08/01` … `11`
- **خارج:** ماژول‌های ERP غیرمرتبط (حسابداری، انبار، …) مگر برای regression ناوبری سایدبار در فاز ۱

## نگاشت سند 01–11 → مسیر (راهنما؛ فاز ۱ باید تأیید کند)

| # | موضوع | مسیر پیش‌فرض |
|---|--------|----------------|
| 01 | میز کار | `/dashboard/tasks` (تب `boards`) |
| 02 | تقویم | `/dashboard/tasks?tab=calendar` |
| 03 | گفتگو | `/dashboard/chats` |
| 04 | یادداشت | `/dashboard/tasks?tab=notes` |
| 05 | نامه | `/dashboard/tasks?tab=letters` |
| 06 | درخواست | `/dashboard/work-requests` (و در صورت وجود `?tab=comms` در میز) |
| 07 | دفتر تلفن | `/dashboard/tasks?tab=phone` |
| 08 | گزارش | `/dashboard/tasks?tab=reports` |
| 09 | پروژه | `/dashboard/tasks?tab=projects` |
| 10 | HR سازمان | `/dashboard/hr` |
| 11 | قوانین درخواست HR | `/dashboard/hr` (ادمین) + تأیید در `work-requests` |

### شناسه‌های تب میزیتو (کد)

`boards`, `calendar`, `chat`, `letters`, `notes`, `projects`, `reports`, `phone`, `comms`, `dashboard`, … — نوار افقی: عمدتاً `boards`, `reports`, `notes`, `projects`; سایدبار: `calendar`, `letters`, `phone`, `chats`, `work-requests`.

## دادهٔ SEED (فقط فاز ۳)

همهٔ رشته‌ها فارسی؛ پس از تست می‌توانید با برچسب `[UAT-v9]` پاکسازی کنید.

### 01 میز کار

- میز جدید: **میز UAT-v9**
- ستون جدید: **در حال انجام**
- از **تنظیمات میز:** تغییر نام کوتاه، افزودن عضو، rename ستون، برچسب جدید
- کارت: عنوان **پیگیری قرارداد نمونه** | ارجاع **رضا علوی** | دسته **اداری**
- سررسید: **1404/08/20** ساعت **10:00** | افزودن به تقویم ✓ | یادآور **۱ ساعت قبل**
- چک‌لیست: یک مورد «تماس با مشتری»
- drag بین ستون‌ها

### 02 تقویم

- رویداد: **جلسه UAT** — امروز یا فردا
- drag در نمای **ماه** و **هفته** به روز دیگر → refresh → تاریخ به‌روز باشد

### 03 گفتگو

- موضوع/پیام: **تست پیام متنی UAT-v9**
- ویس: ۳–۵ ثانیه (در صورت permission)
- از پیام → **وظیفه**؛ از کارت → **باز کردن گفتگو** → `/dashboard/chats?thread=...`

### 04 یادداشت

- یادداشت با رنگ/برچسب preset اگر UI دارد: **یادداشت UAT**

### 05 نامه

- موضوع: **نامه آزمایشی v9** | متن کوتاه
- گیرنده: خودتان یا عضو تیم (اجباری)
- ادمین: دسته slug `legal` برچسب **حقوقی**
- «وظیفه از نامه» یک‌بار

### 06 درخواست

- عمومی: **درخواست تجهیزات UAT** (غیر HR)
- HR: نوع **وام** — بعد از تعریف قانون ۶ ماهه در HR انتظار **403** با پیام فارسی

### 07 دفتر تلفن

| firstName | lastName | mobile | extension | unit |
|-----------|----------|--------|-----------|------|
| سارا | احمدی | 09121234567 | 1201 | پشتیبانی |

جستجو: **احمدی**

### 08 گزارش

- گزارش روز + یک مورد چک‌لیست
- در صورت UI بازدید: معرف **علی رضایی**

### 09 پروژه

- پروژه: **پروژه UAT-v9**
- فاز روی کارت: **فاز تحلیل**

### 10–11 HR

- تب‌های پرسنل / درخواست‌ها — داده زنده میزیتو
- ادمین: **قانون نمونه وام ۶ ماه** + **مدیر مستقیم** (OrgAssignment) برای یک عضو
- تکرار درخواست وام برای eligibility

## Regression v8 (فاز ۳ — کوتاه)

1. جابه‌جایی بین تب‌های `/dashboard/tasks?tab=...` — در DevTools Network خطاهای تکراری `401/500` روی `/api/meizito` یادداشت شود (silent fail = blocker).
2. تقویم: عوض کردن ماه بدون crash.
3. بارگذاری تنبل: اولین باز شدن هر تب بدون صفحهٔ بی‌نهایت loading.

## خروجی گزارش (مسیر ذخیره در ریپو)

```
qa/uat-nexapoint/reports/phase1-site-map.md
qa/uat-nexapoint/reports/phase2-ux-review.md
qa/uat-nexapoint/reports/phase3-functional-log.md
qa/uat-nexapoint/reports/screenshots/*.png
```

## ارجاع SSOT توسعه

- پیشرفت کد: [`todo-v9.md`](../../todo-v9.md)
- نیازمندی‌ها: `updates/08/01` … `11`
