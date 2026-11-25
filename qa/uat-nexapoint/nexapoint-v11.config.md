# Nexapoint v11 — UAT Config

**پیش‌نیاز اسکیما:** [docs/schema-v11-freeze.md](../../docs/schema-v11-freeze.md) (freeze ۲۰۲۶-۱۱-۲۴)  
**چک‌لیست اسکیما:** [todo-v11.md](../../todo-v11.md) · **بسته محصول Meizito:** [todo-v10.md](../../todo-v10.md)  
**نسخهٔ قبلی UAT (prod):** [nexapoint-v9.config.md](nexapoint-v9.config.md)

این فایل زمینهٔ UAT **پس از فریز v11** است: اول **dev** (یا staging) با migration chain کامل؛ production فقط بعد از `9.3`–`9.4` در todo-v11.

---

## محیط اجرا

### dev (پیش‌فرض v11)

| کلید | مقدار مورد انتظار | تأیید |
|------|-------------------|--------|
| `NEXT_PUBLIC_APP_URL` | همان origin که `npm run dev` باز می‌کند (مثلاً `http://localhost:3000`) | با `BASE_URL` یکی باشد |
| `NEXT_PUBLIC_FRONTEND_ONLY` | `false` | API واقعی |
| `MEIZITO_WORKSPACE_STORAGE` | `db` | cutover |
| `MEIZITO_COMMS_STORAGE` | `db` | cutover |
| `SKIP_MIGRATE` | `false` | — |
| `DATABASE_URL` | Postgres با زنجیره تا `20261124200000_v11_phase7_flow_status_enums` | — |

**ورود:** `{BASE_URL}/login`  
**لندینگ:** `{BASE_URL}/`

### staging / production (بعد از cutover)

همان جدول [nexapoint-v9.config.md § متغیرهای محیط](nexapoint-v9.config.md#متغیرهای-محیط-پروداکشن--مرجع) با این شرط اضافه:

- `npx prisma migrate deploy` روی همان env
- `npm run test:v9-deploy` + `test:v11-phase5-attachments` … `phase7` سبز

---

## Fixture tenant «رونام» (dev)

پس از migrate روی dev:

```bash
npm run db:tenant-ronak -- --recreate
# یا --create اگر fixture وجود ندارد
```

| فیلد | مقدار |
|------|--------|
| نام کسب‌وکار | **رونام** |
| `creditLabel` | `fixture:ronam` |
| رمز کاربران fixture | `RonamTest1404!` |
| پیشوند کاربر | `ronam.fixture.*` (مثلاً `ronam.fixture.sara`) |
| پیشوند شناسه داده | `ronam-` |

**نقش تست پیش‌فرض:** مالک = super_admin یا `--owner=admin` هنگام ساخت fixture؛ اعضای fixture نقش member با دسترسی میز/ERP نمونه.

**قبل از فاز ۱:** پس از لاگین، کسب‌وکار **رونام** را در UI انتخاب کنید. انتخاب نشدن = **Blocker** (همان قانون v9).

---

## هویت تست

```yaml
BASE_URL: http://localhost:3000   # یا staging؛ در گزارش یادداشت شود
ROLE: owner / ادمین اصلی (یا fixture member برای سناریوی محدود)
PERMISSIONS: دسترسی کامل — HR ادمین، دستهٔ نامه، eligibility، تنظیمات میز؛ ERP روی tenant رونام
BUSINESS: رونام (fixture:ronam) — نام را در هر گزارش تکرار کن
LOCALE: fa-IR, RTL
SCHEMA: v11 frozen — وضعیت‌ها enum انگلیسی در DB، برچسب فارسی در UI
```

---

## چک سرور (قبل از UAT مرورگر)

```text
npx prisma migrate deploy
npx prisma generate
npm run test:v9-deploy                    → OK
npm run test:v11-phase5-attachments     → OK
npm run test:v11-phase6-sortable-dates    → OK
npm run test:v11-phase7-flow-status       → OK
npm run db:tenant-ronak -- --recreate     → OK (dev)
npx tsc --noEmit                          → بدون خطای جدید
```

اختیاری (backfill / نام): `npx tsx scripts/backfill-phone-names-v9.ts` — ممکن است `updated 0`.

---

## Scope

### داخل (الزام v11)

| لایه | محتوا |
|------|--------|
| Meizito | سندهای `updates/08/01` … `11` — همان نگاشت v9 |
| v10 carry | MemberPicker، ناوبری میز، HR/org — [todo-v10.md](../../todo-v10.md) |
| ERP (smoke) | روی tenant رونام: اشخاص، کالا، فروش/خرید نمونه، انبار، CRM لید — فاز ۱ نقشه + فاز ۳ حداقل یک سناریو create/refresh هر ماژول |
| v11 SSOT | مبالغ بدون خطای گرد کردن عجیب؛ drag کانبان با `sortOrder`؛ پیوست بدون Base64 در چت؛ تاریخ شمسی در UI + فیلتر میلادی/`@db.Date` در API |

### خارج (مگر درخواست صریح)

- فاز ۸ Json (promote تدریجی) — باگ فقط اگر دادهٔ legacy در UI غیرقابل استفاده است
- Redis / کش سرور (v10.1)
- بازنویسی اسکیما یا migration خارج از خط قرمز freeze

---

## نگاشت سند 01–11 → مسیر (Meizito)

همان [جدول v9](nexapoint-v9.config.md#نگاشت-سند-0111--مسیر-راهنما؛-فاز-۱-باید-تأیید-کند). فاز ۱ باید URL واقعی dev را تأیید کند.

### ERP — مسیرهای راهنما (فاز ۱ تأیید کند)

| حوزه | مسیر پیش‌فرض |
|------|----------------|
| اشخاص | `/dashboard/people` |
| کالا | `/dashboard/products` |
| فروش | `/dashboard/sales` (یا تب/ویوی معادل در سایدبار) |
| انبار | مسیر انبار در سایدبار tenant |
| CRM | مسیر CRM / لید |

---

## دادهٔ SEED (فاز ۳)

**اولویت:** از دادهٔ از قبل seed‌شده در **رونام** استفاده کنید (کارت «پیگیری سفارش روناک»، لید CRM، حواله `posted`، …). فقط برای پوشش شکاف UAT، رکورد جدید با برچسب **`[UAT-v11]`** در عنوان/موضوع بسازید.

### Meizito (مثل v9 با برچسب v11)

همان سناریوهای [nexapoint-v9.config.md § SEED](nexapoint-v9.config.md#داده-seed-فقط-فاز-۳) با جایگزینی `UAT-v9` → `UAT-v11` و:

- **۰۱ میز کار:** بعد از drag بین ستون‌ها → **refresh** → موقعیت کارت و ترتیب ستون پایدار (v11 `sortOrder`)
- **۰۲ تقویم:** تاریخ شمسی در UI؛ بعد از ذخیره refresh — رویداد با همان روز جلالی بماند
- **۰۳ گفتگو:** پیوست تصویر (در صورت UI) — نباید در DB به‌صورت `imageDataUrl` در `ChatMessage` باشد؛ از پیوست مرکزی استفاده شود
- **۰۵ نامه / ۰۶ درخواست:** وضعیت در UI فارسی؛ در گزارش Network/DB فقط enum انگلیسی
- **۰۶ HR:** قانون وام + **403** فارسی — همان blocker v9

### ERP (حداقل v11)

| ماژول | سناریو کوتاه |
|--------|----------------|
| اشخاص | باز کردن شخص seed (`ronam-p…`) — نام یکسان در فاکتور/نامه |
| کالا | محصول fixture — کد `RON-…` |
| انبار | حواله نمایشی — وضعیت **ثبت‌شده** / `posted` در UI |
| CRM | لید با وضعیت «جدید» در UI (DB: `new`) |
| مالی (smoke) | یک سند/فاکتور seed — مبلغ صحیح، بدون اعشار عجیب |

---

## Regression v11 (فاز ۳ — اضافه بر v9)

1. **کانبان:** drag کارت → refresh → ستون و ترتیب درست.
2. **تاریخ:** فیلتر ماه حضور/حسابداری (در صورت دسترسی) — بدون crash تقویم شمسی.
3. **enum:** تغییر وضعیت تیکت/نامه/سفارش — UI فارسی، API/DB کلید انگلیسی.
4. **multi-tenant:** سوئیچ از رونام به کسب‌وکار دیگر → دادهٔ tenant جدا (بدون نشت).
5. **v9 regression:** همان [سه مورد v9](nexapoint-v9.config.md#regression-v8-فاز-۳--کوتاه) روی `/api/meizito` و تب‌ها.

---

## خروجی گزارش

```
qa/uat-nexapoint/reports/phase1-site-map.md
qa/uat-nexapoint/reports/phase2-ux-review.md
qa/uat-nexapoint/reports/phase3-functional-log.md
qa/uat-nexapoint/reports/screenshots/*.png
```

در هدر هر گزارش بنویسید: `schema=v11-freeze`, `BASE_URL`, `business=رونام`, `fixture=db:tenant-ronak`.

---

## ارجاع SSOT

| موضوع | سند |
|--------|-----|
| فریز و migration | [schema-v11-freeze.md](../../docs/schema-v11-freeze.md) |
| فازبندی اسکیما | [todo-v11.md](../../todo-v11.md) |
| Meizito / محصول | [todo-v10.md](../../todo-v10.md) |
| نیازمندی 01–11 | `updates/08/01` … `11` |
| Playwright (بعداً) | [e2e/README.md](e2e/README.md) |
| مغز UAT | [MASTER-UAT-SYSTEM.md](MASTER-UAT-SYSTEM.md) |

---

## تفاوت خلاصه با v9 config

| | v9 | v11 |
|---|----|-----|
| محیط اصلی | `https://nexapoint.ir` | dev/staging + fixture رونام |
| درگاه DB | `test:v9-deploy` | + phase 5–7 |
| Scope ERP | فقط ناوبری در فاز ۱ | smoke عملیاتی روی seed |
| داده | فقط `[UAT-v9]` دستی | seed fixture + `[UAT-v11]` تکمیلی |
| اسکیما | v9 deploy | freeze v11، بدون breaking تا پایان UAT |