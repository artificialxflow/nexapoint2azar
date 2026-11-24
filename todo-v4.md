# Nexapoint — چک‌لیست منوها (آرشیو)

> **چک‌لیست فعال:** [todo-v5.md](todo-v5.md) — از این فایل فقط برای جزئیات فازهای ۱‑A…۱‑M استفاده کنید.

**مراحل:** [completion-plan.md](completion-plan.md)  
**طراحی دیتا:** [nexa-db-blueprint/RELATIONS.fa.md](nexa-db-blueprint/RELATIONS.fa.md)  
**اسکیما + API:** [schema-api-roadmap.md](schema-api-roadmap.md)  
**تست مرحله ۱:** [updates/03/copilot-phase-01-quick-access.md](updates/03/copilot-phase-01-quick-access.md)

**الان (عملیاتی):** P0 در todo-v5 — deploy → Copilot ری‌تست.

---

## مرحله ۱ — فازهای پیاده‌سازی

### فاز ۱‑A — crash کارت

- [x] `normalizeWorkspaceCard` + guardهای trim
- [ ] Copilot P0

### فاز ۱‑B — `prompt()` → UI

- [x] مودال میز/ستون/چک‌لیست + testid
- [ ] Copilot تست زنده

### فاز ۱‑C — UX کارت

- [x] ستاره · حذف/ویرایش

### فاز ۱‑D — نامه (کد)

- [x] گیرنده + testid پیوست
- [ ] Copilot ارسال/F5

### فاز ۱‑E — تب‌های میز کار

- [ ] Copilot کامل + ریگرسیون

### فاز ۱‑F — بستن مرحله ۱

- [ ] Copilot + completion-plan

### فاز ۱‑G — میز جدید P0

- [x] `POST /boards` + ستون پیش‌فرض
- [x] repair + `normalizeWorkspaceBoard`
- [x] guards `BoardsPanel`
- [ ] Copilot

### فاز ۱‑H — یکپارچگی کارت

- [x] reconcile تک‌ستونی `cardIds`
- [ ] Copilot

### فاز ۱‑I — persist workspace

- [x] notes · reports · projects · note-boards
- [x] UX خطا/ذخیره یادداشت و گزارش
- [ ] Copilot F5

### فاز ۱‑J — persist تقویم

- [x] `calendar-events` POST/PATCH حذف
- [ ] Copilot رویداد در گرید

### فاز ۱‑K — نامه گیرنده

- [x] PersonCombobox sync + chip انتخاب‌شده
- [ ] Copilot

### فاز ۱‑L — دفتر تلفن

- [x] `tel:` با ارقام فارسی + testid
- [ ] Copilot

### فاز ۱‑M — پروژه

- [x] عضو تیم داخلی UAT
- [ ] Copilot F5

---

## دسترسی سریع

- [x] داشبورد · گفتگو · درخواست‌ها · دفتر تلفن *(جستجو)*
- [ ] میز کار · نامه‌ها *(پس از Copilot)*

---

## زیرساخت

- [x] tsc
- [ ] deploy

---

# توضیحات (آخر)

Deploy → Copilot. `COPILOT-UAT-2026-10-20` را دوباره submit نکن.
