# Nexapoint — todo-v12 (کارایی ناوبری داشبورد)

**هدف:** کاهش اسکلتون و تأخیر در جابه‌جایی صفحات — بدون تغییر schema، بدون تغییر چیدمان UI.

**وضعیت:** بسته — prod ناوبری سایدبار تأیید شد؛ `npx tsc --noEmit` سبز.

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

## فاز ۳ — ناوبری سایدبار (نهایی prod)

- [x] `<a href>` + `location.assign` برای ماژول‌ها (full load — پایدار روی Runflare)
- [x] حذف prefetch کلیک / `sidebar-prefetch.ts`
- [x] حذف `cacheComponents` / `partialPrefetching` از `next.config.ts`

## Hotfix — اسکرول سایدبار

- [x] clamp `nexa-sidebar-scroll-top` + `useLayoutEffect`

## فاز ۵ — راستی‌آزمایی

- [x] `npx tsc --noEmit`

---

## فایل‌های کلیدی

| فایل | تغییر |
|------|--------|
| `src/components/Sidebar.tsx` | `<a href>`، clamp اسکرول |
| `next.config.ts` | بدون cacheComponents experiment |
| `src/context/CatalogContext.tsx` | lazy catalog، بدون delegate prefetch |
| `src/context/MeizitoContext.tsx` | gate workspace |
| `src/hooks/useCatalogEnsure.ts` | ensure per view |

---

## تست دستی پیشنهادی

1. سایدبار: میز کار، HR، CRM، فروش — URL و محتوا درست.
2. بدون باز کردن ERP: catalog زودهنگام روی داشبورد نزند.
3. عوض کسب‌وکار: بدون نشتی ویوی قبلی.
4. اسکرول سایدبار بعد از refresh: منوهای بالا دیده شوند.