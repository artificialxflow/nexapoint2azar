# UAT r2 — فقط موارد Fail/Blocked از دور اول

**تاریخ هدف:** پس از deploy اصلاحات chat/letter/HR/meizito.

ضمیمه: `MASTER-UAT-SYSTEM.md`, `nexapoint-v9.config.md`, `updates/08/reports/phase3-functional-log.md`

فقط این سناریوها — **نه** کل 01–11 از نو:

1. **چت** — پیام `تست UAT r2` · refresh · Network
2. **نامه** — گیرنده خودم · outbox · refresh
3. **میز** — ذخیره تنظیمات میز + افزودن به تقویم روی کارت
4. **یادداشت** — انتخاب بورد UAT · refresh
5. **HR** — هم‌خوانی ویجت حضور با بنر زنده
6. **وام HR** — در صورت اجازهٔ کاربر: 403 یا موفق

خروجی: جدول Pass/Fail در قالب `phase3-functional-log-r2.md`
