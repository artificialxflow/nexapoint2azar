# Nexapoint — todo-v3 (Gate تا انبار)

**نسخه:** 3 · **پیش‌نیاز:** [todo-v2.md](todo-v2.md) · **تست Copilot:** [updates/02/copilot-todo-v3-playbook.md](updates/02/copilot-todo-v3-playbook.md) · **مرجع v2:** [updates/01/e2e-copilot-playbook.md](updates/01/e2e-copilot-playbook.md)  
**ادامهٔ کار (منو‌محور، سرور واحد):** [todo-v4.md](todo-v4.md) · [updates/02/v3-progress-checklist.md](updates/02/v3-progress-checklist.md)

---

## Phase 0 — Gate پروداکشن

**وابستگی:** —

- [ ] Deploy کامل ریپو (Runflare)
- [ ] `NEXT_PUBLIC_FRONTEND_ONLY=false`
- [ ] Env: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SESSION_SECRET`, `NEXA_STORAGE_ROOT=/data`, SMS
- [ ] `npx prisma migrate deploy`
- [ ] `prisma db seed` (در صورت نیاز E2E)
- [ ] دیسک `/data` + bootstrap لندینگ
- [ ] Smoke login OTP

**Gate Copilot:** [§ Phase 0](updates/02/copilot-todo-v3-playbook.md#phase-0--gate-پروداکشن)

---

## Phase 1 — Copilot retest (test01 + test02 + G0–G7)

**وابستگی:** Phase 0

- [ ] [test01-retest-copilot.md](updates/01/test01-retest-copilot.md)
- [ ] [test02-access-invite-copilot.md](updates/01/test02-access-invite-copilot.md)
- [ ] Gates G0–G7 در playbook v1
- [ ] جدول Pass/Fail در playbook v3

**Gate Copilot:** [§ Phase 1](updates/02/copilot-todo-v3-playbook.md#phase-1--copilot-retest)

---

## Phase 2 — Lint

**وابستگی:** Phase 1 (توصیه)

- [ ] `npm run lint` exit 0 (محلی: ۸۳ error legacy — عمدتاً `react-hooks/set-state-in-effect` در meizito/settings)
- [x] `npm run build` exit 0 (تأیید dev پس از v3)

**Gate Copilot:** —

---

## Phase 3 — پاکسازی legacy prod

**وابستگی:** Phase 0

- [ ] حذف/غیرفعال کاربران تست اشتباه
- [ ] لغو دعوت‌های منقضی
- [ ] فقط admin E2E: `09126723365`

**Gate Copilot:** [§ Phase 3](updates/02/copilot-todo-v3-playbook.md#phase-3--پاکسازی-legacy)

---

## Phase 4 — پیوست UI → API

**وابستگی:** Phase 2

**فایل‌ها:** `src/lib/attachments/client.ts` · `AttachmentPickerModal.tsx` · `LettersPanel.tsx` · `src/types/attachment.ts`

- [x] `uploadServerAttachment` → `POST /api/attachments`
- [x] باز کردن پیوست سرور با session
- [x] Picker در production از سرور

**Gate Copilot:** [§ Phase 4](updates/02/copilot-todo-v3-playbook.md#phase-4--پیوست)

---

## Phase 5 — اشخاص / CRM

**وابستگی:** Phase 4

**فایل‌ها:** `app/api/businesses/[id]/people/[personId]/route.ts` · `src/lib/erp/people-client.ts` · `CatalogContext.tsx` · `module-registry.ts`

- [x] PATCH/DELETE people API
- [x] people-client + refreshPeopleFromApi
- [x] add/replace/remove person → API
- [x] `uiWired: true` در registry

**Gate Copilot:** [§ Phase 5](updates/02/copilot-todo-v3-playbook.md#phase-5--اشخاص)

---

## Phase 6 — محدودیت‌ها و بانک

**وابستگی:** Phase 5

**فایل‌ها:** `prisma/schema.prisma` · migration · `restrictions/route.ts` · `bank-access/route.ts`

- [x] Prisma `UserRestriction` + `UserBankAccess`
- [x] Persist GET/PATCH (نه stub)

**Gate Copilot:** [§ Phase 6](updates/02/copilot-todo-v3-playbook.md#phase-6--محدودیت‌ها-و-بانک)

---

## Phase 7 — Permission در API admin

**وابستگی:** Phase 6

**فایل‌ها:** `src/lib/auth/admin-access.ts` · `app/api/admin/**`

- [x] `requirePermission`
- [x] جایگزینی `requireSuperAdmin` در routes admin

**Gate Copilot:** [§ Phase 7](updates/02/copilot-todo-v3-playbook.md#phase-7--permissions)

---

## Phase 8 — انبار MVP

**وابستگی:** Phase 7

**فایل‌ها:** `WarehouseItem` · `warehouse/items` API · `warehouse-client.ts` · `Warehouse.tsx` / context

- [x] Prisma + migration
- [x] CRUD API
- [x] Wire لیست/ثبت در UI

**Gate Copilot:** [§ Phase 8](updates/02/copilot-todo-v3-playbook.md#phase-8--انبار)

---

## خارج از scope v3

میزیتو 5-B · S3 presigned · سفارش/حسابداری/بانک ERP · Playwright CI · HR/بلاگ/فروشگاه کامل
