# UAT v11 — بازآزمایی ۴ باگ + ممیزی UI/UX (prod)

**هدف:** پس از deploy اصلاحات (پروژه MemberPicker، کاتالوگ 400، card-move، برچسب انبار) روی **production** — بدون تغییر کد، فقط مرورگر و گزارش.

**ضمیمه اجباری (قبل از شروع):**

- [`../MASTER-UAT-SYSTEM.md`](../MASTER-UAT-SYSTEM.md)
- [`../nexapoint-v11.config.md`](../nexapoint-v11.config.md)

**مراجع اجرای قبلی (فقط خواندن):**

- [`../../../updates/02/reports/phase3-functional-log.md`](../../../updates/02/reports/phase3-functional-log.md)
- [`../../../updates/02/reports/phase2-ux-review.md`](../../../updates/02/reports/phase2-ux-review.md)

---

## تنظیمات این دور

| مورد | مقدار |
|------|--------|
| schema | `v11-freeze` |
| BASE_URL | `https://nexapoint.ir` |
| business | **رونام** (`fixture:ronam`) |
| نقش | مالک / ادمین سیستم |
| ابزار | GitHub Copilot Agent در VS Code (مرورگر واقعی) |
| خروجی گزارش | [`../reports/retest-v11-ux-report.md`](../reports/retest-v11-ux-report.md) |
| اسکرین‌شات | `../reports/screenshots/retest-v11-*.png` |

**قوانین MASTER (خلاصه):**

- لاگین / OTP / captcha: **انسان** — در صورت مانع، `Blocked` گزارش کن.
- بعد از هر **ذخیره یا drag کانبان:** یک **Refresh** کامل؛ ماندگاری = معیار Pass.
- نام اسکرین‌شات معنادار؛ گزارش فارسی با جدول Markdown.
- **هیچ فایل سورس یا todo را تغییر نده** — فقط گزارش و تصاویر در `qa/uat-nexapoint/reports/`.
- رزولوشن پیشنهادی: دسکتاپ 1280px؛ برای ناوبری یک نمونه موبایل 360px.

**ترتیب این جلسه (یک چت واحد):**

1. **بخش الف** — Regression عملکردی (شبیه فاز ۳؛ دادهٔ تست مجاز).
2. **بخش ب** — ممیزی مشاهده‌ای UX (بدون submit انبوه؛ ناوبری و ثبت متن).
3. **پاکسازی** — فقط پس از Pass بخش الف و با **تأیید صریح کاربر انسان**.

---

## بخش الف — Regression (۴ باگ اصلاح‌شده)

برای هر مورد جدول خلاصه را در گزارش نهایی پر کن. شواهد Network در DevTools الزامی است.

### R1 — پروژه + MemberPicker

| گام | کار |
|-----|-----|
| 1 | برو به `/dashboard/tasks?tab=projects` |
| 2 | پروژه جدید: نام `بازآزمایی پروژه [UAT-v11-r2]` |
| 3 | با **MemberPicker** حداقل یک عضو تیم (مثلاً سارا رونامی) انتخاب کن |
| 4 | در صورت UI، یک **میز** (بورد) متصل کن |
| 5 | ثبت → Network: `POST /api/meizito/{businessId}/projects` باید **200** (نه 500) |
| 6 | **Refresh** → پروژه در لیست بماند؛ عضو/میز در UI درست باشد |

اسکرین‌شات: `retest-v11-r1-project-before.png`, `retest-v11-r1-project-after-refresh.png`

**شکست = Blocker** اگر 500 یا پس از refresh پروژه نیست.

---

### R2 — کاتالوگ کالا (بدون 400)

| گام | کار |
|-----|-----|
| 1 | `/dashboard/products` — لیست باید **غیر صفر** باشد؛ کالاهای seed با پیشوند **`RON-`** دیده شوند |
| 2 | Network: `GET /api/products/{businessId}/catalog` → **200** (نه `VALIDATION_ERROR` / 400) |
| 3 | `/dashboard/sales` — فرم فروش جدید: **انتخابگر کالا** گزینه دارد (یک کالا انتخاب کن؛ ذخیره فاکتور اختیاری) |
| 4 | `/dashboard/purchasing` — همان برای خرید |

اسکرین‌شات: `retest-v11-r2-products.png`, `retest-v11-r2-sales-picker.png`, `retest-v11-r2-purchasing-picker.png`

**شکست = Major/Blocker** اگر 400 یا «۰ مورد» بدون کالای روناک.

---

### R3 — کانبان card-move

| گام | کار |
|-----|-----|
| 1 | `/dashboard/tasks?tab=boards` — بورد روناک (یا میز فعال tenant) |
| 2 | کارت موجود یا کارت کوتاه‌مدت `بازآزمایی کانبان [UAT-v11-r2]` |
| 3 | Drag به ستون **«در حال انجام»** (نام ستون هدف را در گزارش بنویس) |
| 4 | Network: `POST /api/meizito/{businessId}/card-move` → **200** |
| 5 | **Refresh** → کارت **دقیقاً در همان ستون هدف** (نه «انجام شده» یا ستون دیگر) |

اسکرین‌شات: `retest-v11-r3-before-drag.png`, `retest-v11-r3-after-refresh.png`

**شکست = Major** اگر ستون پس از refresh با مقصد drag منطبق نباشد.

---

### R4 — انبار — برچسب فارسی (بدون `posted` خام)

| گام | کار |
|-----|-----|
| 1 | `/dashboard/warehouse` → تب **حواله انبار** / لیست حواله |
| 2 | جدول نباید متن خام انگلیسی **`posted`** یا **`pending`** را به‌عنوان برچسب نهایی UI نشان دهد |
| 3 | انتظار: برچسب فارسی مثل **«ثبت شده»** / **«در انتظار ثبت»** |

اسکرین‌شات: `retest-v11-r4-voucher-list.png`

**شکست = Minor** اگر `posted` انگلیسی کنار یا به‌جای برچسب فارسی دیده شود.

---

### جدول خلاصه بخش الف (در گزارش نهایی)

| # | سناریو | URL | نتیجه | شدت در صورت Fail | اسکرین‌شات | Network |
|---|--------|-----|-------|------------------|------------|---------|
| R1 | پروژه + MemberPicker | `/dashboard/tasks?tab=projects` | | | | `POST …/projects` |
| R2 | کاتالوگ | `/dashboard/products`, sales, purchasing | | | | `GET …/catalog` |
| R3 | کانبان | `/dashboard/tasks?tab=boards` | | | | `POST …/card-move` |
| R4 | انبار UI | `/dashboard/warehouse` | | | | — |

---

### پاکسازی پس از تأیید Pass بخش الف

**فقط با دستور صریح کاربر انسان** (خودت حذف نکن مگر کاربر بگوید «پاکسازی کن»):

- قانون آزمایشی **وام ۶ ماهه** در `/dashboard/hr` (از UAT قبلی)
- رکوردهای تستی با برچسب **`[UAT-v11]`** / **`[UAT-v11-r2]`** (کارت، رویداد، نامه، چت، پروژه)

در گزارش بخش **«پاکسازی انجام شد / نشد»** ثبت کن.

---

## بخش ب — ممیزی جامع UI/UX و ناوبری

**محدودیت:** observe-only — بدون ذخیرهٔ انبوه؛ مودال‌ها را بدون submit باز کن مگر برای تأیید یک label.

### B1 — فارسی‌سازی (اسکن انگلیسی ناخواسته)

در مسیرهای زیر (حداقل) هر **برچسب visible** انگلیسی را یادداشت کن.

**استثنا مجاز:**

- enum در Network/DevTools
- شناسه فنی در URL
- **NEXA** / **CRM** / **HR** وقتی **کنار عنوان فارسی** است (مثلاً «مدیریت مشتریان (CRM)»)

**مسیرهای حداقل:** `/dashboard/dashboard`، تمام تب‌های `/dashboard/tasks?tab=*`، `/dashboard/chats`، `/dashboard/work-requests`، `/dashboard/hr`، `/dashboard/people`، `/dashboard/products`، `/dashboard/sales`، `/dashboard/purchasing`، `/dashboard/warehouse`، `/dashboard/crm`؛ منوی کناری + **دسترسی سریع**؛ یک نمونه موبایل 360px.

خروجی در گزارش:

```markdown
### B1 — واژه‌های انگلیسی باقی‌مانده

| صفحه | مسیر | متن انگلیسی | محل (منو/دکمه/ستون/توست) | شدت پیشنهادی |
```

---

### B2 — دسترسی سریع و HR

| سؤال | ثبت در گزارش |
|------|----------------|
| آیا **HR** از **دسترسی سریع** قابل رسیدن است؟ | بله/خیر + مسیر دقیق |
| مقایسه با `/dashboard/hr` | یکسان / متفاوت |
| چند کلیک تا قوانین / eligibility؟ | عدد + مسیر |
| گیجی کاربر تازه‌وارد؟ | ۱–۵ + جمله کوتاه |

اسکرین‌شات: `retest-v11-b2-quick-access-hr.png`, `retest-v11-b2-hr-direct.png`

---

### B3 — گم‌نشدن در منو و تب‌ها (Active State)

روی **هر آیتم** سایدبار اصلی و تب‌های افقی میز کار:

| منبع کلیک | برچسب UI | URL نتیجه | Active درست؟ | یادداشت |
|-----------|----------|-----------|--------------|---------|
| سایدبار | | | ✅/❌ | |
| دسترسی سریع | | | ✅/❌ | |
| تب میز | | | ✅/❌ | |

برای هر **ناهماهنگی Major** حداقل یک اسکرین‌شات.

---

### B4 — تکرارها و ساده‌سازی (پیشنهاد UX فقط)

موارد زیر را با [`phase2-ux-review.md`](../../../updates/02/reports/phase2-ux-review.md) تطبیق بده و وضعیت **فعلی prod** را تأیید کن:

- نامه / گفتگو / تلفن / گزارش روزانه از چند درگاه
- درخواست عمومی (`/dashboard/work-requests`) در برابر درخواست HR
- CRM + اشخاص تحت گروه «فروش»

```markdown
### B4 — تکرارها و پیشنهاد جایگذاری

| موضوع | مسیرهای تکراری | اثر روی کاربر | پیشنهاد (بدون پیاده‌سازی) |
```

---

## قالب خروجی — `qa/uat-nexapoint/reports/retest-v11-ux-report.md`

این فایل را **در repo بساز** با ساختار:

1. سربرگ (تاریخ، BASE_URL، business، یادداشت deploy)
2. **خلاصه اجرایی** (۳–۵ bullet)
3. **بخش الف** — جدول R1–R4 + Network
4. **بخش ب** — B1–B4
5. **پاکسازی**
6. **جمع‌بندی:** «آیا ۴ رگرسیون برای بستن UAT v11 روی prod Pass است؟»
7. لینک نسبی به `screenshots/retest-v11-*.png`

اگر نوشتن فایل در workspace ممکن نبود، کل Markdown گزارش را در پاسخ چت بده و از کاربر بخواه در مسیر بالا ذخیره کند.

---

## Definition of Done این پرامپت

- [ ] R1–R4 با Refresh و Network مستند شده
- [ ] `retest-v11-ux-report.md` موجود است
- [ ] حداقل ۸ اسکرین‌شات در `reports/screenshots/`
- [ ] هیچ تغییر کدی در اپ انجام نشده