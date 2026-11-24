# طرح تکمیل Nexapoint — مرحله‌به‌مرحله

**چک‌لیست عملیاتی (تیک بزنید):** [todo-v5.md](todo-v5.md)  
**طراحی دیتا (مرجع قبل از هر migration):** [nexa-db-blueprint/prisma/schema.prisma](nexa-db-blueprint/prisma/schema.prisma) · [nexa-db-blueprint/RELATIONS.fa.md](nexa-db-blueprint/RELATIONS.fa.md)  
**نقشه promote اسکیما + API:** [schema-api-roadmap.md](schema-api-roadmap.md)  
**آرشیو چک‌لیست قبلی:** [todo-v4.md](todo-v4.md)

**رویکرد:** طراحی از **nexa-db-blueprint** → promote تدریجی به [`prisma/schema.prisma`](prisma/schema.prisma) → service → API → deploy → UAT. یک **P** در `todo-v5` را کامل کن، بعد برو بعدی. منوها را **به ترتیب همین فایل** پیش ببر.

**الان:** **P0** در [todo-v5.md](todo-v5.md) (معادل مرحله **۰** یا **۱** محصول).

---

## قانون blueprint

| لایه | مسیر |
|------|------|
| طراحی (SSOT) | `nexa-db-blueprint/` — ~۱۰۰ مدل؛ `npx prisma validate --schema nexa-db-blueprint/prisma/schema.prisma` |
| اجرا (VPS) | `prisma/schema.prisma` + migrations — **فقط** بلوک‌های مربوط به فاز فعلی از blueprint |
| Legacy تا cutover | `MeizitoSlice`, `ErpPerson`, `BusinessProduct`, `WarehouseItem` |

---

## مرحله ۰ — آماده‌سازی سرور

*یک‌بار؛ قبل از بقیه. · **todo-v5:** P0*

- [ ] دیپلوی آخرین کد روی `https://nexapoint.ir`
- [ ] `prisma migrate deploy` روی دیتابیس سرور
- [ ] ورود OTP و رسیدن به داشبورد + انتخاب «شرکت تست نکسا»
- [ ] (در صورت وجود) حذف داده تست قدیمی اشخاص کد `10004`

**Blueprint:** بدون تغییر (auth/tenant از قبل نرمال).

**تمام شد وقتی:** هر چهار خط بالا `[x]` و آیتم‌های P0 در todo-v5.

---

## مرحله ۱ — دسترسی سریع

**تست:** [updates/03/copilot-phase-01-quick-access.md](updates/03/copilot-phase-01-quick-access.md) → **ری‌تست پس از fix**  
**جزئیات تیک:** [todo-v5.md](todo-v5.md) P0 (UAT) + P1/P2 (دیتابیس)

**Blueprint (بخش دسترسی سریع):** `WorkspaceBoard`…`FieldVisit`, `InternalLetter`…, `ChatThread`…, `PhoneDirectoryEntry`, `FileAttachment`, `ApprovalInstance` — مطابق [RELATIONS.fa.md](nexa-db-blueprint/RELATIONS.fa.md).

| فاز محصول | محتوا | کد | UAT |
|-----|--------|-----|---------|
| ۱‑A | crash کارت (`normalizeWorkspaceCard`) | [x] | [ ] |
| ۱‑B | `prompt()` → مودال | [x] | [ ] |
| ۱‑C | ستاره + `aria-label` | [x] | [ ] |
| ۱‑D | نامه — گیرنده + پیوست | [x] | [ ] |
| ۱‑E | تب‌های میز کار | جزئی | [ ] |
| ۱‑F | بستن مرحله ۱ | — | [ ] |

- [ ] deploy + ری‌تست Copilot کامل (P0)
- [ ] promote workspace/comms از blueprint (P1, P2) — پس از UAT یا موازی با برنامه

**تمام شد وقتی:** UAT مرحله ۱ سبز + (برای «دیتابیس کامل») P1 و P2 بسته شوند.

---

## مرحله ۲ — فروش

**todo-v5:** P3 (+ CRM در P9)

**Blueprint:** `Person*` · `MoneyDocument*` · `VendorRecord` · `ShareholderRecord` · `CrmLead` · `CrmClubMember`

- [ ] **اشخاص** — لیست و فرم (Prisma، نه `ErpPerson`)
- [ ] اشخاص — دریافت · لیست دریافت‌ها · پرداخت · لیست پرداخت‌ها
- [ ] اشخاص — سهامداران · فروشندگان
- [ ] **مدیریت مشتریان (CRM)**

---

## مرحله ۳ — بازرگانی

**todo-v5:** P4 · P6 · بخشی از P10 (فروشگاه/بلاگ)

**Blueprint:** `Product*` · `SaleInvoice*` · `PurchaseDocument*` · `ExpenseDocument` · `StoreProduct*` · `BlogPost*`

- [ ] **کالاها و خدمات** (CRUD + رفرش)
- [ ] **فروش و درآمد**
- [ ] **خرید و هزینه**
- [ ] **مدیریت فروشگاه**
- [ ] **مدیریت بلاگ**

---

## مرحله ۴ — تولید

**todo-v5:** P5 · P6 · P7

**Blueprint:** `WarehouseLocation*` · `ProductionFormula*` · `CustomerOrder*` · `ProcurementRequest*`

- [ ] **مدیریت انبار** — حواله جدید · حواله انبار · موجودی · انبارگردانی
- [ ] **سفارشات**
- [ ] **تولید**
- [ ] **تدارکات و ملزومات**

---

## مرحله ۵ — تنظیمات (سیستم)

**todo-v5:** P8

**Blueprint:** `SettingsPicklist*` · `FormTemplate*` · `NotificationRule` · `ExchangeRate` (+ `BusinessProject` / `FiscalYear` در لایو)

- [ ] پروژه‌ها · کسب‌وکار و سال مالی
- [ ] نرخ ارز · کاربران و دسترسی · فرم‌ساز · اعلانات · فهرست‌های انتخابی

*(دسترسی بانک — بعداً.)*

---

## مرحله ۶ — گزارش، اتومیشن، سازمان، مالی

**todo-v5:** P9 · P10

**Blueprint:** `ReportSnapshot` · `InquiryLog` · `AutomationRule*` · `WorkflowDefinition*` · `Employee*` · `BankAccount*` · `JournalEntry*` · …

- [ ] گزارشات · استعلام‌ها · اتومیشن · گردشکارها
- [ ] HR · مارکتینگ · شبکه فروش · خدمات پس از فروش
- [ ] بانکداری · حسابداری

---

## مرحله ۷ — جمع‌بندی فنی

**todo-v5:** P11 · P12

- [ ] حذف legacy JSON (blueprint فقط در DB نرمال)
- [ ] `npm run lint` · `403` · ریگرسیون مرورگر

---

## خلاصه ترتیب

```text
طراحی: nexa-db-blueprint
اجرا:  P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10 → P11 → P12
منو:   ۰ → ۱ → ۲ → ۳ → ۴ → ۵ → ۶ → ۷  (completion-plan)
```

بعد از هر **P**: deploy → `migrate deploy` → UAT → تیک **todo-v5** (و در صورت نیاز تیک‌های همین فایل).
