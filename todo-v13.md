# Nexapoint — todo-v13 (بسته بازخورد `updates/03`)

**منبع:** `updates/03/` — ۲۰۲۶-۱۱-۲۸  
**هدف:** P0/P1 ممیزی + UX پرونده / کانبان / چت / HR  
**وضعیت:** بسته — کد + tsc؛ UAT دستی در `updates/03/*/RETEST-GUIDE.fa.md`

## جدول کیس‌ها

| case | موضوع | فاز |
|------|--------|-----|
| 04 | HR تأیید، ساعتی، شمسی، UX، P1 | ۰–۲ |
| 01 | پرونده preview، حذف تیک موقت | ۳ |
| 02 | پیوست کارت preview/download | ۴ |
| 03 | نوتیف گفتگو in-app | ۵ |

---

## فاز ۰ — P0 (case 04)

- [x] ۴-P0-1 assignee HR = مدیر مستقیم
- [x] ۴-P0-2 مرخصی ساعتی

## فاز ۱ — P1 (case 04)

- [x] ۴-P1-3 ارجاع کارت محدود به اعضای میز
- [x] ۴-P1-4a فیلدهای `OrgUnit` + migration
- [x] ۴-P1-4b مخفی تب‌های ادمین HR برای پرسنل

## فاز ۲ — UX (case 04)

- [x] تقویم شمسی در فرم مرخصی HR
- [x] بنر راهنما پس از ثبت درخواست HR

## فاز ۳ — پرونده (case 01)

- [x] پیش‌نمایش تصویر
- [x] حذف تیک موقت

## فاز ۴ — کانبان (case 02)

- [x] آپلود سرور پیوست + preview/download

## فاز ۵ — چت (case 03)

- [x] اعلان in-app + polling + زنگ هدر

## فاز ۶ — مستندات و CI

- [x] `RETEST-GUIDE.fa.md` × 4 + `COPILOT-UAT-PACK.md` + `BATCH-CLOSEOUT.fa.md`
- [x] `npx tsc --noEmit`