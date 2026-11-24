# نقشهٔ راه اسکیما + API — Nexapoint

**v11 freeze (۲۰۲۶-۱۱-۲۴):** [docs/schema-v11-freeze.md](docs/schema-v11-freeze.md) — قفل migration تا `20261124200000_v11_phase7_flow_status_enums`.  
**به‌روز v11:** چک‌لیست → [todo-v11.md](todo-v11.md) · ممیزی → [docs/schema-v11-audit.md](docs/schema-v11-audit.md). فاز ۸ Json **پس از freeze** تدریجی است.  
**به‌روز v10:** UAT بعد از freeze — [todo-v10.md](todo-v10.md). در **production** Meizito از DB (`db`)؛ `slice`/`dual` فقط dev.

**هدف:** انتقال تدریجی از MVP فعلی (JSON در `MeizitoSlice` / `ErpPerson` / `BusinessProduct` / …) به مدل نرمال **nexa-db-blueprint**، **بدون** یک migration غول‌آسا روی VPS.

**چک‌لیست عملیاتی:** [todo-v5.md](todo-v5.md) (فازهای P0–P12 ↔ M0–M11)

**اسناد مرتبط:**

| سند | نقش |
|-----|-----|
| [nexa-db-blueprint/prisma/schema.prisma](nexa-db-blueprint/prisma/schema.prisma) | **SSOT طراحی** (~۱۰۰ مدل؛ validate محلی) |
| [nexa-db-blueprint/RELATIONS.fa.md](nexa-db-blueprint/RELATIONS.fa.md) | روابط و نقشه منو → جدول |
| [prisma/schema.prisma](prisma/schema.prisma) | اسکیما **لایو VPS** — فقط promote تدریجی از blueprint |
| [completion-plan.md](completion-plan.md) | ترتیب **منو** (مرحله ۰→۷) |
| [todo-v4.md](todo-v4.md) | آرشیو UAT جزئی مرحله ۱ |
| [updates/03/copilot-phase-01-quick-access.md](updates/03/copilot-phase-01-quick-access.md) | UAT فاز ۱ |

## فرآیند Promote (هر فاز M / P)

1. در **blueprint** بلوک `// --- Module: … ---` و مدل‌های لیست‌شده در todo-v5 را بخوان.
2. همان مدل‌ها + enumها را به **`prisma/schema.prisma`** اضافه کن (بدون کپی کل فایل ۲۹۰۰ خطی).
3. `npx prisma migrate dev` → deploy → `prisma migrate deploy`.
4. اسکریپت **backfill** از legacy JSON در صورت وجود.
5. service + API؛ قرارداد فرانت را نشکن.
6. تیک در **todo-v5** و در صورت نیاز چک‌باکس‌های این فایل.

**قانون طلایی:** هر فاز = promote → `migration` → `backfill` → `service` → `/api` + Zod → **deploy** + `migrate deploy` → UAT → تیک **todo-v5**.

**برآورد کلی:** ۴–۷ ماه (۱ dev) · ۲٫۵–۴ ماه MVP محدود — جزئیات در [todo-v5.md](todo-v5.md).

---

## سه ستون هر فاز

| ستون | معنی | مثال |
|------|------|------|
| **پایداری** | گارد فرانت، خطای شبکه، UAT P0 | `normalizeWorkspaceCard`, پیام ذخیرهٔ ناموفق |
| **API** | `requireBusinessAccess`, Zod, `handleAuthRouteError` | [`src/lib/business/access.ts`](src/lib/business/access.ts) |
| **داده** | جداول Prisma از blueprint | جایگزینی slice JSON با ردیف‌های relation |

**الگوی API (ثابت):**

- Route: `app/api/...` → `requireBusinessAccess(req, businessId)`
- Body: Zod
- Logic: `src/lib/<domain>/*-service.ts`
- Response: `jsonOk` / `handleAuthRouteError` — کلاینت: `parseApiJson` ([`src/lib/http/parse-api-response.ts`](src/lib/http/parse-api-response.ts))

---

## وضعیت کلی (خلاصه)

- [x] Blueprint طراحی (`nexa-db-blueprint/prisma/schema.prisma` — validate)
- [x] Auth / tenant / business API (نرمال)
- [x] **v11 promote شده در `prisma/schema.prisma`:** Person FK، Catalog SSOT، Workspace DB، `EntityAttachment`, Decimal, `@db.Date`, flow enums
- [x] Meizito comms/workspace روی جداول Prisma (`comms-db-service`, `workspace-db-service`) وقتی `MEIZITO_*_STORAGE=db`
- [ ] Json legacy داخل مدل‌ها (~۵۶ فیلد) — **فاز ۸ پس از freeze** (نه blocker UAT)
- [x] Roadmap migration v11 روی dev (زنجیره در freeze doc)
- [ ] `prisma migrate deploy` + UAT روی staging
- [ ] Playwright smoke (پس از freeze — `qa/uat-nexapoint/e2e/`)

---

## فاز M0 — زیرساخت و «سیم‌کشی» (مرحله ۰ + پایداری مشترک)

*قبل از گسترش اسکیما؛ هم‌زمان با بستن مرحله ۱ محصول.*

**پایداری**

- [ ] Deploy آخرین کد روی `https://nexapoint.ir`
- [ ] `prisma migrate deploy` روی سرور
- [ ] UAT مرحله ۱ — [ری‌تست پس از fix](updates/03/copilot-phase-01-quick-access.md)
- [ ] بررسی یکسان بودن پیام خطا برای ذخیره (یادداشت/گزارش/کارت) — بدون «silent fail» روی 502/5xx
- [ ] مستند کردن قرارداد پاسخ API (`ok` + `data` / `error`)

**داده / API**

- [ ] بدون تغییر بزرگ schema (فقط migrateهای موجود)
- [ ] چک‌لیست env VPS: `DATABASE_URL`, `DIRECT_URL`, storage پیوست

**تایید:** P0 در [todo-v5.md](todo-v5.md) + مرحله ۰–۱ در `completion-plan.md`.

---

## فاز M1 — Tenant و تنظیمات پایه (مرحله ۵ — بخش‌های آماده)

*اسکیما فعلی تقریباً کامل؛ تکمیل API و تست.*

| بخش | مدل Prisma (فعلی) | API |
|-----|-------------------|-----|
| پروژه | `BusinessProject` | `/api/businesses/[id]/projects` |
| پروفایل / سال مالی | `BusinessProfile`, `FiscalYear` | `/api/businesses/[id]/profile`, `fiscal-years` |

- [ ] migration (در صورت فیلد جدید)
- [ ] backfill —
- [ ] service + Zod سخت‌گیر
- [ ] تست سرور + تیک completion-plan مرحله ۵ (پروژه، کسب‌وکار)

**Blueprint بعداً:** `SettingsPicklist`, `FormTemplate`, `NotificationRule`, `ExchangeRate` ([RELATIONS.fa.md](nexa-db-blueprint/RELATIONS.fa.md)).

---

## فاز M2 — Meizito: workspace (میز کار، یادداشت، گزارش، پروژه) — مرحله ۱

**الان:** `MeizitoSlice` کلید `workspace` + [`server-handler`](src/lib/meizito/server-handler.ts) + `normalize*`.

**مقصد blueprint:** `WorkspaceBoard`, `WorkspaceColumn`, `WorkspaceCard`, `NoteBoard`, `WorkspaceNote`, `DailyReport`, `FieldVisit`, `WorkspaceProject`, …

| کار | وضعیت |
|-----|--------|
| پایداری: `normalizeWorkspaceCard/Board`, repair, `cardIds` | کد [x] — Copilot [ ] |
| API: `/api/meizito/[businessId]/...` | [x] روی JSON |
| migration workspace tables | [ ] |
| backfill slice → rows | [ ] |
| dual-read یا cutover | [ ] |
| flip `MEIZITO_DATA_SOURCES.workspace` | [x] api در non–FRONTEND_ONLY |

**چک‌لیست فاز**

- [ ] migration (زیرمجموعه workspace از blueprint)
- [ ] backfill اسکریپت یک‌بار روی VPS
- [ ] service: خواندن/نوشتن Prisma + همان shape پاسخ برای فرانت
- [ ] routeها بدون شکستن قرارداد `WorkspaceSnapshot`
- [ ] deploy + migrate deploy
- [ ] Copilot: boards, notes, reports, projects, F5
- [ ] (اختیاری) حذف وابستگی به slice `workspace` پس از cutover

---

## فاز M3 — Meizito: letters, requests, calendar, chat — مرحله ۱ + گفتگو

**الان:** sliceهای `letters`, `requests`, `calendar`, `chat` + پیوست [`/api/attachments`](app/api/attachments).

**مقصد blueprint:** `InternalLetter`, `InternalWorkRequest`, `MeizitoCalendar`, `ChatThread`, `ApprovalInstance`, `FileAttachment`, …

- [ ] migration
- [ ] backfill per slice
- [ ] service + تایید (`ApprovalInstance`)
- [ ] UAT نامه (گیرنده، پیوست، F5) — todo ۱‑D, ۱‑K
- [ ] UAT تقویم — ۱‑J
- [ ] UAT درخواست‌ها (work-requests منو)
- [ ] UAT گفتگو (`/dashboard/chats`)

---

## فاز M4 — اشخاص + اسناد مالی اشخاص — مرحله ۲

**الان:** `ErpPerson.data` — [`/api/businesses/[id]/people`](app/api/businesses/[id]/people/route.ts).

**مقصد blueprint:** `Person` + فرزندها، `MoneyDocument*`, `VendorRecord`, `ShareholderRecord`.

- [ ] migration `Person*` (+ `MoneyDocument*` برای دریافت/پرداخت)
- [ ] backfill `ErpPerson` → `Person`
- [ ] Zod از [`src/types/person.ts`](src/types/person.ts) (نه `z.record` آزاد)
- [ ] API لیست/CRUD + زیربخش‌های دریافت/پرداخت/سهامدار/فروشنده
- [ ] تست سرور + تیک completion-plan مرحله ۲
- [ ] نگه‌داشتن `ErpPerson` تا پایان backfill؛ سپس deprecate

---

## فاز M5 — کالاها و کاتالوگ — مرحله ۳ (اول بازرگانی)

**الان:** `BusinessProduct` + `BusinessCatalogMeta` — [`/api/products/[businessId]/...`](app/api/products/[businessId]/products/route.ts).

**مقصد blueprint:** `Product`, `ProductCategory`, `PriceList`, `ProductPrice`, `ProductImage`.

- [ ] migration
- [ ] backfill محصولات + categories + price lists از JSON meta
- [ ] بازنویسی [`catalog-service.ts`](src/lib/products/catalog-service.ts)
- [ ] CRUD + رفرش view Products
- [ ] تیک completion-plan «کالاها و خدمات»

---

## فاز M6 — انبار — مرحله ۴

**الان:** `WarehouseItem.data` — [`/api/businesses/[id]/warehouse/items`](app/api/businesses/[id]/warehouse/items/route.ts).

**مقصد blueprint:** `WarehouseLocation`, `WarehouseVoucher`, `StockBalance`, `StocktakingSession`, …

- [ ] migration
- [ ] backfill locations
- [ ] API حواله / موجودی / انبارگردانی (تب‌های UI)
- [ ] تیک‌های انبار در completion-plan مرحله ۴

---

## فاز M7 — فروش، خرید، سفارش — مرحله ۳–۴

**الان:** عمدتاً mock در viewها + catalog اشخاص/کالا.

**مقصد blueprint:** `SaleInvoice`, `PurchaseDocument`, `ExpenseDocument`, `CustomerOrder`, …

- [ ] migration (پس از M4 + M5)
- [ ] service + `/api/businesses/[id]/sales/...` (یا مسیر یکسان با convention پروژه)
- [ ] Zod + ارتباط `Person` / `Product` / `BusinessProject`
- [ ] تیک: فروش و درآمد، خرید و هزینه، سفارشات

---

## فاز M8 — تولید و تدارکات ERP — مرحله ۴

**مقصد blueprint:** `ProductionFormula`, `ProductionOrder`, `WorkOrder`, `ProcurementRequest`.

- [ ] migration
- [ ] API + تست view Production / Orders / requests (تدارکات منو)

---

## فاز M9 — تنظیمات پیشرفته — مرحله ۵ (باقی‌مانده)

**مقصد blueprint:** `SettingsPicklist`, `FormTemplate`, `NotificationRule`, `ExchangeRate`.

- [ ] migration
- [ ] API settings (جایگزین یا الحاق به `SettingsContext` / mock stores)
- [ ] picklistها برای بازدید/CRM/Meizito
- [ ] فرم‌ساز، اعلانات، نرخ ارز
- [ ] کاربران و دسترسی (ادامه admin API موجود)

---

## فاز M10 — CRM، سازمان، مالی، سیستم — مرحله ۲ و ۶

| منو | مدل‌های blueprint (نمونه) |
|-----|---------------------------|
| CRM | `CrmLead`, `CrmClubMember` |
| HR | `Employee`, `HrRequest`, `TrainingCourse` |
| مارکتینگ | `MarketingCampaign`, `MarketingSurvey` |
| شبکه فروش / پس از فروش | `SalesAgent`, `ServiceTicket`, … |
| بانک / حسابداری | `BankAccount`, `JournalEntry`, … |
| گزارش / استعلام / اتومیشن / گردشکار | `ReportSnapshot`, `InquiryLog`, `AutomationRule`, `WorkflowDefinition` |
| فروشگاه / بلاگ | `StoreProduct`, `BlogPost`, … |

هر زیرماژول همان چک‌لیست ۶‌گانه (migration → … → deploy).

- [ ] CRM (مرحله ۲)
- [ ] گزارشات، استعلام‌ها، اتومیشن، گردشکارها
- [ ] HR، مارکتینگ، شبکه فروش، خدمات پس از فروش
- [ ] بانکداری، حسابداری
- [ ] مدیریت فروشگاه، مدیریت بلاگ (اگر در مرحله ۳ نمانده)

---

## فاز M11 — پاک‌سازی legacy

- [ ] حذف نوشتن به `MeizitoSlice` (همه کلیدها)
- [ ] حذف `ErpPerson`, `BusinessProduct`, `BusinessCatalogMeta`, `WarehouseItem`
- [ ] migration حذف جدول یا نگه‌داشت خالی برای audit
- [ ] `prisma validate` + smoke روی nexapoint.ir
- [ ] مرحله ۷ completion-plan (lint, 403, ریگرسیون)

---

## نگاشت: todo-v5 (P) ↔ roadmap (M) ↔ completion-plan

| P | M | completion |
|---|-----|------------|
| P0 | M0 | ۰–۱ (UAT) |
| P1 | M2 | ۱ داده workspace |
| P2 | M3 | ۱ comms + گفتگو |
| P3 | M4 | ۲ |
| P4 | M5 | ۳ کالا |
| P5 | M6 | ۴ انبار |
| P6 | M7 | ۳–۴ فروش/خرید/سفارش |
| P7 | M8 | ۴ تولید/تدارکات |
| P8 | M1+M9 | ۵ |
| P9 | M10 | ۲ CRM + ۶ سازمان |
| P10 | M10 | ۳ فروشگاه/بلاگ + ۶ مالی/سیستم |
| P11 | M11 | legacy |
| P12 | QA | ۷ |

---

## چک‌لیست تکراری هر زیرفاز (کپی برای PR)

```markdown
- [ ] طرح فیلدها با blueprint هم‌خوان است (در صورت تغییر schema، قبل از کد اعلام/ثبت در PR)
- [ ] `prisma migrate dev` محلی + `migrate deploy` روی VPS
- [ ] backfill (اسکریپت idempotent) + لاگ اجرا
- [ ] service layer + تست دستی/واحد در صورت وجود
- [ ] API route + Zod + status codes
- [ ] فرانت: flip mock→api در صورت نیاز
- [ ] deploy + UAT/Copilot
- [ ] به‌روز [todo-v5.md](todo-v5.md) / `completion-plan.md` / این فایل
```

---

## یادداشت‌های مهندسی (از UAT فاز ۱)

1. **فرانت تدافعی بماند** حتی بعد از Prisma: `normalize*` و آرایهٔ خالی به‌جای `undefined` در پاسخ API.
2. **ذخیرهٔ ناموفق** باید برای کاربر قابل‌مشاهده باشد (نه فقط لاگ سرور).
3. **یک migration کوچک** روی VPS بهتر از merge یک‌جای blueprint است.
4. Blueprint مرجع است؛ منبع حقیقت لایو فقط [`prisma/schema.prisma`](prisma/schema.prisma) + migration history.

---

**فاز فعال:** [todo-v5.md](todo-v5.md) — **P0** سپس **P1/P2** (M2/M3).
