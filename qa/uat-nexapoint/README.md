# UAT میزیتو v9 — Nexapoint (پروداکشن)

تست پذیرش کاربر روی [https://nexapoint.ir/](https://nexapoint.ir/) با رویکرد **مغز / دست‌ها**:

| نقش | فایل/ابزار |
|-----|------------|
| مغز (استراتژی، فازبندی) | [`MASTER-UAT-SYSTEM.md`](MASTER-UAT-SYSTEM.md) |
| زمینهٔ پروژه (prod v9) | [`nexapoint-v9.config.md`](nexapoint-v9.config.md) |
| زمینهٔ پروژه (v11 freeze / dev) | [`nexapoint-v11.config.md`](nexapoint-v11.config.md) |
| دست‌ها (مرورگر) | GitHub Copilot Agent یا مرورگر دستی |
| ترمیم کد + `todo-v9.md` | Cursor Agent (بعد از گزارش فاز ۳) |

## پیش‌نیاز سرور (انجام‌شده روی پاد)

- `npx prisma migrate deploy` — بدون migration معلق
- `MEIZITO_WORKSPACE_STORAGE=db`, `MEIZITO_COMMS_STORAGE=db`, `NEXT_PUBLIC_FRONTEND_ONLY=false`
- `npm run test:v9-deploy` — OK
- `npx tsx scripts/backfill-phone-names-v9.ts` — در صورت نیاز (ممکن است `updated 0` باشد)

## گردش کار (۳ چت جدا — نه یک پرامپت یکجا)

1. **فاز ۱ — کشف:** [`prompts/phase1-discovery.md`](prompts/phase1-discovery.md)  
   خروجی: `reports/phase1-site-map.md` + اسکرین‌شات‌های `reports/screenshots/00-*.png`

2. **فاز ۲ — تحلیل UX:** [`prompts/phase2-ux-review.md`](prompts/phase2-ux-review.md)  
   ضمیمه: خروجی فاز ۱ → `reports/phase2-ux-review.md`

3. **فاز ۳ — تست عملکردی:** [`prompts/phase3-functional.md`](prompts/phase3-functional.md)  
   ضمیمه: فاز ۱ + ۲ + دادهٔ SEED در config → `reports/phase3-functional-log.md`

**UAT r2 (بعد از deploy اصلاحات):** [`prompts/phase3-r2-retest.md`](prompts/phase3-r2-retest.md) · راهنمای دستی [`updates/08/reports/UAT-TEST-GUIDE.md`](../../updates/08/reports/UAT-TEST-GUIDE.md)

هر چت: ابتدا `MASTER-UAT-SYSTEM.md` + **یکی از** `nexapoint-v9.config.md` (prod) یا `nexapoint-v11.config.md` (dev پس از freeze) را attach کنید، سپس متن همان فاز را paste کنید.

## ورود

- لاگین: `https://nexapoint.ir/login` — **کاربر خودش OTP را وارد می‌کند**؛ Agent تا تأیید لاگین صبر کند.
- پس از لاگین: کسب‌وکار فعال انتخاب شده باشد (مالک/ادمین اصلی = دسترسی کامل).

## به‌روزرسانی todo

فقط بعد از فاز ۳ و بررسی Pass/Fail در Cursor: ستون‌های **Deploy** و **UAT** در [`todo-v9.md`](../../todo-v9.md) را برای موارد تأییدشده علامت بزنید — نه صرفاً به‌خاطر تیک‌های فاز کد.
