# پرامپت فاز ۳ — تست عملکردی (کپی به Copilot Agent)

ضمیمه کنید:

- `MASTER-UAT-SYSTEM.md`
- `nexapoint-v9.config.md`
- `reports/phase1-site-map.md`
- `reports/phase2-ux-review.md`

---

**فاز ۳ — تست عمیق v9.** لاگین برقرار؛ نقش **مالک/ادمین**؛ از بخش **SEED** در config استفاده کن.

ترتیب (با اولویت P0 از فاز ۲):

| # | کار |
|---|-----|
| 01 | میز UAT-v9، تنظیمات میز، کارت با تقویم+یادآور، drag، چک‌لیست |
| 02 | تقویم: رویداد + drag ماه/هفته + refresh |
| 03 | چت: متن، ویس (یا Blocked)، وظیفه از پیام، لینک thread از کارت |
| 04 | یادداشت UAT |
| 05 | نامه + دسته legal/حقوقی (ادمین) + وظیفه از نامه |
| 06 | work-requests عمومی + HR وام (قبل/بعد قانون ۶ ماه در HR) |
| 07 | دفتر تلفن سارا احمدی + جستجو |
| 08 | گزارش روز + چک‌لیست |
| 09 | پروژه UAT-v9 + فاز |
| 10–11 | HR زنده + قانون eligibility + OrgAssignment + تکرار وام |

**بعد از هر Save:** refresh؛ اگر داده نیست → **Fail blocker**.

اسکرین‌شات: `01-..` تا `11-..` + regression `99-regression-v8.png`

**جدول نهایی:**

| # | سناریو | URL | Pass/Fail/Blocked | شدت | اسکرین‌شات | یادداشت |

**Regression v8:** تب‌های tasks، تقویم ماه، Network silent fail.

**جمع‌بندی (۵ خط):** blockerها؛ آیا می‌توان در `todo-v9.md` ستون Deploy/UAT را برای کدام ردیف‌ها زد؟

خروجی: `phase3-functional-log.md`
