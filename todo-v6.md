# Nexapoint — todo-v6

**هدف:** تکمیل **کاربردی + DB + CRUD** برای هر ۸ منو (ادامهٔ [`todo-v5.md`](todo-v5.md))، با UAT کوپایلت (داده `FAUX-M{N}-` + اسکرین‌شات).

**شما الان کجایید؟** فاز **۲.۶** (UX) کد `[x]` — **deploy + UAT** فاز ۲ هنوز باز است.

### تیک فاز کامل (کد + deploy + کوپایلت)

- [x] **فاز ۱** — دسترسی سریع + میز کار (مرجع v5)
- [ ] **فاز ۲** — فروش (اشخاص · CRM · دفتر تلفن DB)
- [ ] **فاز ۳** — بازرگانی
- [ ] **فاز ۴** — تولید
- [ ] **فاز ۵** — تنظیمات
- [ ] **فاز ۶** — سازمان
- [ ] **فاز ۷** — مالی + سیستم
- [ ] **فاز ۸** — جمع‌بندی

| فاز | منو | کد (Agent) | push + deploy (شما) | UAT کوپایلت + M{N} screenshots |
|-----|-----|------------|---------------------|----------------------------------|
| ۱ | میز کار | [x] ref v5 | [x] | [x] |
| ۲ | فروش | [x] (+۲.۶ UX) | [ ] | [ ] |
| ۳ | بازرگانی | [ ] | [ ] | [ ] |
| ۴ | تولید | [ ] | [ ] | [ ] |
| ۵ | تنظیمات | [ ] | [ ] | [ ] |
| ۶ | سازمان | [ ] | [ ] | [ ] |
| ۷ | مالی | [ ] | [ ] | [ ] |
| ۸ | QA/legacy | [ ] | [ ] | [ ] |

**ترتیب:** Agent کد → گزارش + ماتریس → شما deploy → کوپایلت طبق [`updates/03/copilot-phase-0N-….md`](updates/03/) → تیک فاز.

---

## قوانین مشترک

| قانون | توضیح |
|--------|--------|
| داده فیک | `FAUX-M{N}-` + تاریخ؛ tenant آزمایشی |
| Agent | push/deploy نمی‌کند |
| DB | `npx prisma migrate deploy` روی VPS بعد از هر migration |
| اسکرین‌شات | `updates/03/screenshots/M{N}/` — نام: `M2-crm-leads-after-f5.png` |
| کوپایلت | PASS فقط با UI زنده **و** بازبینی عکس |

---

## قالب گزارش Agent (خلاصه)

همان [`todo-v5.md`](todo-v5.md) § «قالب گزارش Agent» + ستون **بازبینی اسکرین‌شات**.

---

## فاز ۱ — میز کار

- [x] طبق v5؛ رگرسیون فقط در صورت شکست UAT.

اسکرین‌شات مرجع: `updates/03/screenshots/M1/`

---

## فاز ۲ — فروش (فعال)

UAT: [`updates/03/copilot-phase-02-sales-practical.md`](updates/03/copilot-phase-02-sales-practical.md)  
Audit قبلی: [`updates/03/sales-crm-phonebook-audit/UAT-REPORT.md`](updates/03/sales-crm-phonebook-audit/UAT-REPORT.md)

### ۲.۱ اشخاص + people-module

- [x] دریافت: لیست — ویرایش/حذف + flush + F5
- [x] پرداخت: لیست — ویرایش/حذف + flush + F5
- [x] سهامدار: حذف با flush؛ جمع ۱۰۰٪؛ شخص تکراری
- [x] فروشنده: حذف با flush؛ شمارنده از DB
- [ ] اشخاص: create/edit/delete رگرسیون (UAT کوپایلت)

### ۲.۲ CRM

- [x] سرنخ edit/delete/search
- [x] سرنخ جدید (فرم production)
- [x] بازدید edit + ثبت آنی تب
- [x] باشگاه PATCH/DELETE + UI
- [x] گزارش KPI از DB

### ۲.۳ کانبان (کامل)

- [x] `CrmPipelineStage` + `CrmOpportunity` + migration
- [x] API stages/opportunities + move
- [x] UI CRUD + DnD + تبدیل سرنخ → فرصت

### ۲.۴ دفتر تلفن

- [x] `PhoneDirectoryEntry` + API CRUD
- [x] `PhoneDirectoryPanel` از DB

### ۲.۵ عملیات

- [x] `npm run test:sales-m2`
- [ ] گزارش UAT-v6 (کوپایلت + `screenshots/M2/`)

اسکرین‌شات: `updates/03/screenshots/M2/`

### ۲.۶ UX + بستن شکاف‌های UAT (کد Agent)

- [x] فوتر / فاصله پایین سراسری (`DashboardLayout` + `DashboardPageFooter`)
- [x] حذف دکمه FAUX-M2 از UI سرنخ‌ها؛ پیش‌فرض کانبان بدون `FAUX-M2`
- [x] دفتر تلفن: دکمه **انصراف** در فرم مخاطب
- [x] فروشنده + سهامدار: پیام وقتی شخص آزاد نیست؛ هشدار اگر سرور ردیف را فیلتر کند
- [x] کانبان: ویرایش inline نام مرحله و فرصت (PATCH)
- [x] تب بازدید: KPI امروز از داده واقعی (نه اعداد ثابت ۴ و ۳۵)

**بعد از deploy (شما):**

- [ ] `NEXT_PUBLIC_CRM_FAUX` را روی پروداکشن خاموش نگه دارید (دکمه از UI حذف شده)
- [ ] کوپایلت + `screenshots/M2/` + تکمیل `UAT-REPORT-v6.md`

---

## فاز ۳ — بازرگانی

- [ ] P4 کالا · P6 فروش/خرید · P10 فروشگاه/بلاگ
- [ ] FAUX-M3-… · `screenshots/M3/`

## فاز ۴ — تولید

- [ ] P5 انبار · P7 تولید/تدارکات · FAUX-M4-… · `M4/`

## فاز ۵ — تنظیمات

- [ ] P8 · FAUX-M5-… · `M5/`

## فاز ۶ — سازمان

- [ ] P9 HR/مارکتینگ · FAUX-M6-… · `M6/`

## فاز ۷ — مالی + سیستم

- [ ] P10 · FAUX-M7-… · `M7/`

## فاز ۸ — جمع‌بندی

- [ ] P11 legacy · P12 QA · FAUX-M8-… · `M8/`

---

## آرشیو

[`todo-v5.md`](todo-v5.md) · [`completion-plan.md`](completion-plan.md)
