# پرامپت فاز ۱ — کشف (کپی به Copilot Agent)

ضمیمه کنید: `MASTER-UAT-SYSTEM.md` + `nexapoint-v9.config.md`

---

**فاز ۱ فقط — کشف و نقشه‌برداری.**

من روی https://nexapoint.ir لاگین کرده‌ام؛ نقش **مالک/ادمین اصلی**؛ کسب‌وکار فعال انتخاب شده است. تا قبل از لاگین هیچ کاری نکن.

طبق MASTER:

1. **هیچ فرمی را submit نکن** و رکورد جدید در DB نساز.
2. از `/dashboard/dashboard` و سایدبار شروع کن؛ همهٔ مسیرهای مرتبط با میزیتو را باز کن:
   - `/dashboard/tasks` و تب‌های URL: `boards`, `calendar`, `reports`, `notes`, `projects`, `letters`, `phone`
   - `/dashboard/chats`
   - `/dashboard/work-requests`
   - `/dashboard/hr`
3. برای هر صفحه: عنوان، تب فعال، آیا دادهٔ واقعی می‌بینی یا خالی/mock.
4. اسکرین‌شات: `qa/uat-nexapoint/reports/screenshots/00-nav-*.png` (یا equivalent در خروجی agent).
5. درخت مسیر Markdown بنویس (والد → فرزند).
6. لیست کن: آیا **دو مسیر مختلف** به یک قابلیت می‌رسند؟ (مثلاً درخواست در سایدبار vs تب comms)
7. در Network (فقط مشاهده): اولین بار باز کردن tasks — آیا `/api/meizito` با 401/500 مواجه شد؟

**خروجی را مثل یک فایل `phase1-site-map.md` بنویس** (جدول مسیرها + نکات blocker احتمالی).

فاز ۲ و ۳ را در این چت اجرا نکن.
