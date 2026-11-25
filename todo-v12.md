# Nexapoint — todo-v12 (کارایی ناوبری داشبورد)

**هدف:** کاهش اسکلتون و تأخیر در جابه‌جایی صفحات — بدون تغییر schema، بدون تغییر چیدمان UI.

**وضعیت:** پیاده‌سازی اولیه انجام شد — `npx tsc --noEmit` سبز.

---

## فاز ۴ — اسکلتون تودرتو و gate میز کار

- [x] حذف اسکلتون تکراری `Suspense` در `Tasks.tsx` (fallback → null)
- [x] `MeizitoContext`: اسکلتون فقط در `isPending` بدون داده — نه هر refetch
- [x] `placeholderData` workspace بدون تغییر

## فاز ۲ (workspace) — SWR و businessId

- [x] `queryClient.removeQueries` برای `['meizito', prevBusinessId]` هنگام عوض کسب‌وکار
- [x] invalidate workspace پس از `moveCard` (قبلاً بود)

## فاز ۱ — Lazy hydration Catalog

- [x] حذف fetch سه‌گانهٔ خودکار روی هر `activeBusinessId`
- [x] `ensureCatalogScope` + `useCatalogEnsure` در ویوهای ERP پرمصرف
- [x] کش in-memory per `businessId` (`catalog-business-cache.ts`) + SWR روی عوض کسب‌وکار

## فاز ۲ (Catalog) — SWR + invalidate

- [x] کش per-business با flags (people / catalog / peopleModule)
- [x] `persistCacheSnapshot` پس از بارگذاری و تغییر state (هم‌خوانی پس از mutate محلی)

## فاز ۳ — Prefetch سایدبار

- [x] prefetch روی **کلیک** منو (نه hover/focus — جلوگیری از بار سنگین و باگ اسکرول)
- [x] `router.prefetch` + workspace prefetch + delegate کاتالوگ

## Hotfix — اسکرول سایدبار (منو «ناپیدا»)

- [x] **Clamp** `scrollTop` هنگام restore/save (`nexa-sidebar-scroll-top`)
- [x] `useLayoutEffect` برای اعمال اسکرول پس از layout
- [x] حذف `onMouseEnter` / `onFocus` prefetch

## فاز ۵ — راستی‌آزمایی

- [x] `npx tsc --noEmit`

---

## فایل‌های اصلاح‌شده (خلاصه)

| فایل | تغییر |
|------|--------|
| `src/context/MeizitoContext.tsx` | gate workspace، پاکسازی کش businessId |
| `src/context/CatalogContext.tsx` | lazy load، کش، ensure، prefetch delegate |
| `src/lib/erp/catalog-business-cache.ts` | **جدید** — کش per business |
| `src/hooks/useCatalogEnsure.ts` | **جدید** |
| `src/lib/dashboard/sidebar-prefetch.ts` | **جدید** |
| `src/components/Sidebar.tsx` | prefetch روی کلیک؛ clamp اسکرول sessionStorage |
| `src/views/Tasks.tsx` | حذف اسکلتون Suspense |
| `src/views/Sales.tsx`, `Products.tsx`, `People.tsx`, … | `useCatalogEnsure` |

---

## تست دستی پیشنهادی

1. ورود داشبورد → میز کار: یک اسکلتون (نه دوگانه)؛ برگشت سریع بدون فلش کامل.
2. بدون باز کردن فروش/کالا: شبکه نباید `GET .../catalog` بلافاصله بزند.
3. کلیک روی «فروش»: prefetch روی کلیک؛ منوهای پایین بعد از refresh دیده شوند (اسکرول clamp).
4. عوض کسب‌وکار: دادهٔ ویوی قبلی نشتی ندهد؛ کش ویوی قبلی در همان session بازگشت دهد.