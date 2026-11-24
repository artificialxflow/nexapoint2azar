# v11 Schema Freeze

**تاریخ freeze:** ۲۰۲۶-۱۱-۲۴  
**Baseline:** `20261123000000_baseline`  
**آخرین مایگریشن v11:** `20261124200000_v11_phase7_flow_status_enums`  
**SHA-256 `prisma/schema.prisma`:** `8551B958BA6DCF77CB75DBBB6B86D8330E36D3D08198F153979B84464BA31782`

اسکیما و زنجیرهٔ migration زیر **قفل v11** هستند. هر تغییر breaking جدید → branch جدا + مایگریشن جدید (نه بازنویسی baseline).

---

## زنجیرهٔ migration (ترتیب اعمال)

| Migration | فاز v11 |
|-----------|---------|
| `20261123000000_baseline` | baseline |
| `20261124142921_v11_phase1_banking_accounting_decimal` | ۱ Decimal (بانک/حسابداری) |
| `20261124144245_v11_phase1_money_remaining` | ۱ Decimal (بقیه مبالغ) |
| `20261124150434_v11_phase2_person_fk` | ۲ Person SSOT / FK |
| `20261124160000_v11_phase3_catalog_ssot` | ۳ Catalog SSOT |
| `20261124170000_v11_phase4_workspace_kanban` | ۴ Workspace / کانبان |
| `20261124180000_v11_phase5_entity_attachment` | ۵ Attachment |
| `20261124190000_v11_phase6_sortable_dates` | ۶ تاریخ `@db.Date` |
| `20261124200000_v11_phase7_flow_status_enums` | ۷ enum وضعیت flow |

اعمال روی محیط:

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## درگاه‌های تأیید‌شده (فاز ۱–۷)

| فاز | اسکریپت / یادداشت |
|-----|-------------------|
| قرارداد | `npm run test:v9-schema-contract` |
| بک‌اند | `npm run test:v9-backend` |
| deploy DB | `npm run test:v9-deploy` |
| ۵ Attachment | `npm run test:v11-phase5-attachments` |
| ۶ تاریخ | `npm run test:v11-phase6-sortable-dates` |
| ۷ enum | `npm run test:v11-phase7-flow-status` |
| میزیتو DB | `npm run test:meizito-db-p1` (فاز ۴) |
| typecheck | `npx tsc --noEmit` |

---

## SSOT پس از freeze (خلاصه)

| حوزه | وضعیت |
|------|--------|
| مبالغ | `Decimal(20,0)` / نرخ `Decimal(18,6)` — بدون `Float` مالی |
| اشخاص | FK مرکب به `Person` / `User` (فاز ۲) |
| کالا | `catalogProductId`، `WarehouseItem` نرمال (فاز ۳) |
| Workspace | `sortOrder` روی کارت؛ بدون `cardIds`؛ junction اعضا (فاز ۴) |
| پیوست | `EntityAttachment`؛ بدون `ChatMessage.imageDataUrl` (فاز ۵) |
| تاریخ عملیاتی | `@db.Date` + `business-date.ts` (فاز ۶) |
| وضعیت flow | enum انگلیسی در DB؛ برچسب فارسی در UI (`flow-status.ts`) (فاز ۷) |

---

## فاز ۸ — Json legacy (**پس از freeze، تدریجی**)

فاز ۸ عمداً **خارج از freeze** است: هر بلوک = PR جدا با مایگریشن/backfill خودش؛ بدون blocker برای UAT و Playwright.

| # | مدل / فیلد | یادداشت |
|---|------------|---------|
| 8.1 | `Person.data` | پس از فاز ۲ — promote فیلدهای پرکاربرد |
| 8.2 | `CatalogProduct.data` | پس از فاز ۳ |
| 8.3 | `MoneyDocument.data`, `CommerceDocument.data` | با ERP |
| 8.4 | `BusinessPeopleMeta`, `BusinessCatalogMeta`, `BusinessCommerceMeta` | config vs normalize |
| 8.5 | `WorkspaceDailyReport.payload`, `WorkspaceFieldVisit.payload` | جدا از کانبان |
| 8.6 | `HrRequestType.formSchema`, automation `conditionsJson` | موقت قابل قبول |

**تصمیم freeze:** نگه‌داری Json برای موارد بالا تا تکمیل promote؛ جزئیات → [schema-v11-audit.md](schema-v11-audit.md) §۴.

تقریباً **۵۶** فیلد `Json` در `schema.prisma` (شمارش پس از freeze).

---

## Fixture dev (فاز ۹)

```bash
npm run db:tenant-ronak
```

tenant نمونه «روناک» برای smoke دستی / آماده‌سازی Playwright روی dev — **بعد از** migrate deploy و enum/date.

---

## بازگشت به v10 UAT / Playwright

1. env dev/staging با migration chain بالا  
2. `db:tenant-ronak` (یا داده واقعی tenant)  
3. ادامه [todo-v10.md](../todo-v10.md) — منو، MemberPicker، HR  
4. Playwright: نصب `@playwright/test` + smoke (پیشنهاد در `qa/uat-nexapoint/e2e/README.md`)

---

## خط قرمز پس از freeze

- بدون `prisma migrate` تصادفی روی production بدون review  
- بدون regenerate کل `schema.prisma` از AI Studio  
- Json فاز ۸ فقط با طرح backfill مشخص  
- staging: `migrate deploy` + `test:v9-deploy` قبل از cutover (چک‌لیست 9.3 در [todo-v11.md](../todo-v11.md))