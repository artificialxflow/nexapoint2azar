# ممیزی اسکیما v11 — Nexapoint

> **Freeze:** نسخهٔ قفل‌شده و زنجیره migration → [schema-v11-freeze.md](schema-v11-freeze.md) (۲۰۲۶-۱۱-۲۴).

**تاریخ:** ۱۴۰۴/۰۹/۰۳ (۲۰۲۶-۱۱-۲۴)  
**منبع:** `prisma/schema.prisma` (۲۲۴۸ خط)  
**مایگریشن baseline:** `20261123000000_baseline`  
**چک‌لیست اجرا:** [todo-v11.md](../todo-v11.md)

---

## ۱. خلاصه عددی

| معیار | تعداد / وضعیت |
|--------|----------------|
| فیلد `Float` (مبالغ/مقدار) | **۰** (فاز ۱ کامل) |
| فیلد `Json` | **۵۸** |
| Enums تعریف‌شده در بالای فایل | **۲۴+** (بانک، چک، حسابداری، HR، …) |
| `MeizitoSlice` / `ErpPerson` / `BusinessProduct` | **حذف شده** ✓ |
| `WarehouseItem` | **نرمال** — `catalogProductId` + `stockQty` + FK (فاز ۳) |
| FK به `Person` | **فعال (فاز ۲)** — سهامدار، فروشنده، CRM، دفترچه، workspace، شبکه فروش |

---

## ۲. سیاست پول (**تأیید شده — v11 فاز ۱**)

**وضعیت (۲۰۲۶-۱۱-۲۴):** همه مبالغ/مقادیر عددی حسابداری، بانک، commerce، store، payroll، CRM، انبار به `Decimal` منتقل شدند.

**نمونه مدل‌ها:**

- `MoneyDocument.totalAmount`, `CommerceDocument.totalAmount`
- `JournalLine.debit` / `credit`, `JournalEntry.totalDebit` / `totalCredit`
- `BankAccount.balance`, `CheckItem.amount`, `BankTransaction.amount`
- `PayrollPeriodSummary.netPay`, `StoreOrder.totalNum`, `StoreOrderItem.lineTotal`
- `ShareholderRecord.percent`, `VendorRecord.sellPercent`

| نوع | Prisma | وضعیت |
|-----|--------|--------|
| مبالغ ریالی | `Decimal @db.Decimal(20, 0)` | **اعمال شد** — همه مدل‌های مالی + store |
| نرخ / درصد | `Decimal @db.Decimal(18, 6)` | **اعمال شد** — ارز، سهامدار، فروشنده، شبکه فروش، آموزش |
| مقادیر فیزیکی | `Decimal @db.Decimal(20, 3)` | **اعمال شد** — انبار، تولید |
| Helper | `src/lib/money/decimal.ts` | `moneyFromNumber` / `moneyToNumber` / `qtyFromNumber` / `qtyToNumber` |

Migrations: `20261124142921_v11_phase1_banking_accounting_decimal`, `20261124144245_v11_phase1_money_remaining`

**قانون:** فیلد پولی جدید با `Float` ممنوع.

---

## ۳. سیاست تاریخ (فاز ۶ — اعمال شد)

**ERP / HR / Store:** فیلدهای عملیاتی `@db.Date`؛ نمایش شمسی در لایهٔ اپ (`business-date.ts`).

**نمونه فیلدها:**

| مدل | فیلد |
|-----|------|
| `JournalEntry` | `date` |
| `CheckItem` | `issueDate`, `dueDate` |
| `BankTransaction` | `date` |
| `AttendanceLog` | `workDate` |
| `CustomerOrder` | `date` |
| `StoreOrder` | `date` |
| `BlogPost` | `date` |
| `WorkspaceCard` | `dueDate`, `endDueDate` |
| `MeizitoCalendarEvent` | `dateKey`, `endDateKey` |

**پیشنهاد:**

- **ERP / HR / Store:** `DateTime` UTC یا `Date` @db.Date + تبدیل شمسی در اپ
- **میز کار / تقویم:** یا همان قرارداد `dateKey` ثابت (با validation) یا migrate به DateTime با قرارداد موجود در `task-calendar-contract.ts`

---

## ۴. Json legacy (فاز ۸)

| مدل / فیلد | نقش | اولویت اصلاح |
|------------|-----|----------------|
| `Person.data` | بدنهٔ شخص ERP | پس از FK Person |
| `CatalogProduct.data` | بدنهٔ کالا | پس از فاز ۳ |
| `WarehouseItem.data` | کل انبار در یک blob | **فاز ۳ P0** |
| `MoneyDocument.data`, `CommerceDocument.data` | سند جزئیات | تدریجی |
| `BusinessPeopleMeta.*`, `BusinessCatalogMeta.*`, `BusinessCommerceMeta.*` | تنظیمات UI | نگه‌داری یا نرمال |
| `WorkspaceColumn.cardIds` | ترتیب کانبان تکراری | **فاز ۴** |
| `WorkspaceCard.attachments`, `InternalLetter.attachments` | پیوست | **فاز ۵** |
| `WorkspaceDailyReport.payload`, `WorkspaceFieldVisit.payload` | گزارش/بازدید | بعد از ۴–۵ |

---

## ۵. SSOT اشخاص — وضعیت فعلی

**مرکز:** `Person` با `@@id([businessId, personId])`.

| مدل | personId | FK به Person | کپی نام/تلفن |
|-----|----------|--------------|--------------|
| `ShareholderRecord` | ✓ اجباری | ✗ | در Person.data |
| `VendorRecord` | ✓ اجباری | ✗ | — |
| `CrmOpportunity` | اختیاری | ✗ | — |
| `CrmClubMember` | اختیاری | ✗ | `name`, `phone` |
| `PhoneDirectoryEntry` | اختیاری | ✗ | `displayName`, `mobile` |
| `WorkspaceBoardMember` | اختیاری | ✗ | `displayName` |
| `SalesNetworkMember` | — | ✗ | `fullName`, `phone` |
| `CrmLead` | — | ✗ | `name` (lead مستقل — OK) |
| `CrmVisit` | — | ✗ | `customerName`, `phone` |

**هدف فاز ۲:** FK مرکب + کاهش کپی؛ دفتر تلفن `linked_person` حتماً به Person.

---

## ۶. SSOT کالا — وضعیت فعلی

| مدل | ارتباط با CatalogProduct |
|-----|---------------------------|
| `CatalogProduct` | مرکز (`businessId`, `productId`) |
| `StoreProduct` | **جزیره** — `price`+`priceNum`, `stock`+`stockQty` |
| `WarehouseItem` | **جزیره** — کل `data Json` |
| `WarehouseVoucherItem` | `itemCode`, `title` رشته — بدون FK |
| `StoreOrderItem` | اختیاری `storeProductId` فقط به Store |

**هدف فاز ۳:** `catalogProductId` (مرکب) + نرمال `WarehouseItem`.

---

## ۷. Workspace / Comms — وضعیت فعلی

| مشکل | جزئیات |
|------|--------|
| کانبان دوباره‌کاری | `WorkspaceColumn.cardIds Json` + `WorkspaceCard.columnId` **بدون** `@relation` به Column |
| عضو بورد | `WorkspaceBoardMember` — `userId`/`personId` بدون FK |
| پروژه | `WorkspaceProject.memberIds`, `members` Json |
| نامه | `InternalLetterRecipient.recipientName` + `recipientUserId` بدون FK User |
| چت | `ChatThread.participantNames` Json؛ پیوست‌ها `EntityAttachment` + `attachmentRefs` (بدون `imageDataUrl`) |
| نام نویسنده چت | `ChatMessage.author` رشته — نه userId |

**تایید:** بخش‌های ERP جدید enum دارند؛ میزیتو هنوز الگوی legacy.

---

## ۸. Enums موجود vs رشتهٔ فارسی (فاز ۷)

**به enum تبدیل شد:** `CustomerOrderStatus`, `ProductionOrderStatus`, `StoreOrderStatus`, `WarehouseVoucherStatus`, `CrmLeadStatus`, `InternalLetter*`, `WorkRequest*`, `MeizitoApprovalState`؛ `BlogPost.status` حذف شد.

**هنوز `String` فارسی (خارج از فاز ۷):** `PayrollPeriodSummary.status`, `ProcurementRequest.status`, …

---

## ۹. زیرساخت و تست

| مورد | وضعیت |
|------|--------|
| `npm run test:v9-deploy` | **به‌روز:** `20261123000000_baseline` یا v9 legacy — اجرای Pass روی DB هنوز فاز ۰ |
| `schema-api-roadmap.md` | هنوز اشاره به blueprint / MeizitoSlice — به‌روز پس از freeze |
| Prod storage | `MEIZITO_*_STORAGE=db` (طبق todo-v10) |

---

## ۱۰. گام بعدی فوری

1. تأیید سیاست Decimal (§۲) و تاریخ (§۳) در تیم  
2. فاز ۰.۶: fix deploy test  
3. شروع فاز ۱ migration روی **dev DB**  
4. قبل از `db:tenant-ronak --create` پس از فاز ۲–۳ — به‌روز fixture

---

*این سند با هر فاز v11 به‌روز می‌شود.*