# Nexapoint — تکمیل بک‌اند (todo-v2)

**نسخه:** 2 · **مرجع فرانت/mock:** [todo.md](todo.md) · **معماری:** [updates/01/01.txt](updates/01/01.txt) · **فایل/UX:** [updates/01/02.txt](updates/01/02.txt) · **تست سرور:** [updates/01/e2e-copilot-playbook.md](updates/01/e2e-copilot-playbook.md) · **رتست test01:** [updates/01/test01-retest-copilot.md](updates/01/test01-retest-copilot.md)

---

## فیکس‌های UX پروداکشن (test01 — 2026-10-19)

- [x] لندینگ: SVG UTF-8 بدون متن خراب؛ اولویت `/images/dashboard-preview.svg`
- [x] `/dashboard/letters` → redirect به `/dashboard/tasks?tab=letters`
- [x] Meizito: عدم پاک‌کردن letters/chat/… روی خطای موقت API

---

## وضعیت API (خلاصه)

| وضعیت | مسیرها |
|--------|--------|
| پیاده‌شده | `POST/GET` auth OTP · `GET /api/auth/me` · `POST /api/auth/logout` · `GET/POST /api/businesses` · `GET/PATCH/DELETE /api/businesses/[id]` · `GET /api/storage/public/*` |
| فاز ۱ | `/api/businesses/[id]/profile` · `projects` · `fiscal-years` |
| فاز ۲ | `/api/admin/*` |
| فاز ۳ | `/api/dashboard/[businessId]/summary` |
| فاز ۴ | `/api/products/[businessId]/catalog` · `products` CRUD |
| فاز ۵-A | `/api/meizito/[businessId]/*` (snapshot JSON) |
| فاز ۶ | `/api/attachments` · دانلود امن |
| فاز ۷+ | `/api/businesses/[id]/people` · ماژول‌های ERP (تدریجی) |

### کلاینت‌های فرانت (منبع قرارداد)

| فایل | پیشوند API |
|------|------------|
| [src/lib/settings/business-client.ts](src/lib/settings/business-client.ts) | `/api/businesses/{id}/...` |
| [src/lib/admin/client.ts](src/lib/admin/client.ts) | `/api/admin/...` |
| [src/lib/dashboard/client.ts](src/lib/dashboard/client.ts) | `/api/dashboard/{id}/summary` |
| [src/lib/products/client.ts](src/lib/products/client.ts) | `/api/products/{id}/...` |
| [src/lib/meizito/client.ts](src/lib/meizito/client.ts) | `/api/meizito/{id}/...` |

---

## قرارداد API

- پاسخ موفق: `{ "ok": true, "data": { ... } }`
- خطا: `{ "ok": false, "error": { "code", "message", "details?" } }`
- کدها: `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `INTERNAL_ERROR`
- Tenant: `requireBusinessAccess(req, businessId)` در [src/lib/business/access.ts](src/lib/business/access.ts)
- Admin: `requireSessionUser` + `systemRole.level >= 100` (super_admin)

---

## فاز ۰ — پلتفرم

- [x] [src/lib/http/parse-api-response.ts](src/lib/http/parse-api-response.ts) — اعتبارسنجی JSON قبل از parse
- [x] استفاده در کلاینت‌های API اصلی
- [x] [env.example](env.example) — `NEXA_STORAGE_ROOT` و SMS/OTP
- [ ] `npm run lint` سبز

---

## فاز ۱ — تنظیمات کسب‌وکار

- [x] Prisma `BusinessProject`
- [x] `GET/POST /api/businesses/[id]/projects`
- [x] `PATCH/DELETE /api/businesses/[id]/projects/[projectId]`
- [x] `GET/PATCH /api/businesses/[id]/profile`
- [x] `GET/POST/PATCH /api/businesses/[id]/fiscal-years`
- [x] Seed: پروژه `پروژه-E2E-01` برای کسب‌وکار تست

---

## فاز ۲ — ادمین

- [x] `GET /api/admin/users` (+ roles)
- [x] `GET /api/admin/roles` · `PATCH /api/admin/roles/[roleId]`
- [x] `GET /api/admin/invites` · `POST .../revoke`
- [x] `POST /api/admin/users/provision`
- [x] `PATCH /api/admin/users/[userId]` · reset-password
- [x] restrictions / bank-access — stub JSON

---

## فاز ۳ — داشبورد

- [x] `GET /api/dashboard/[businessId]/summary`

---

## فاز ۴ — کاتالوگ

- [x] Prisma `BusinessProduct` + `BusinessCatalogMeta`
- [x] `GET .../catalog` · `POST/PATCH/DELETE .../products/[id]`
- [x] Seed: محصول `مبل تست E2E`

---

## فاز ۵-A — میزیتو (snapshot)

- [x] Prisma `MeizitoSlice`
- [x] Router [app/api/meizito/[businessId]/[...path]/route.ts](app/api/meizito/[businessId]/[...path]/route.ts)
- [x] Seed از [src/lib/meizito/mock-bootstrap.ts](src/lib/meizito/mock-bootstrap.ts)
- [ ] فاز ۵-B: جداول نرمال (letters, boards, …) — **موکول**

---

## فاز ۶ — پیوست (بدون Nextcloud)

- [x] `POST /api/attachments` (multipart → disk)
- [x] `GET /api/attachments/[fileKey]` (دانلود امن)
- [x] حذف برچسب Nextcloud در UI نامه
- [ ] فاز ۶-۲: Presigned S3 (`S3_*` env) — **موکول**

---

## فاز ۷–۱۲ — ERP هسته (تدریجی)

| فاز | ماژول | API | Wire فرانت |
|-----|--------|-----|------------|
| ۷ | Person / CRM | [x] `GET/POST /api/businesses/[id]/people` | [ ] People.tsx |
| ۸ | انبار + BOM | [ ] | [ ] Warehouse, Production |
| ۹ | Order → Invoice | [ ] | [ ] Orders, Sales |
| ۱۰ | Ledger | [ ] | [ ] Accounting |
| ۱۱ | بانک / چک / اقساط | [ ] | [ ] Banking |
| ۱۲ | Automation + پس از فروش | [ ] | [ ] Automation, AfterSales |

---

## Tenant checklist (جدول جدید)

هر مدل دامنه‌ای: `businessId` + `@@index([businessId])` · هر query با `where: { businessId }`.

---

## test02 — دعوت، OTP، تأیید مدیر (انجام شد در کد)

- [x] `GET/POST /api/invite/[inviteId]?t=` + صفحه دعوت با `t`
- [x] فرم افزودن کاربر موبایل‌محور + `mobilePhone` در provision
- [x] `AccessRequest` + OTP برای شماره ناشناس → پیام «در دست بررسی»
- [x] پنل تأیید/رد مدیر در تنظیمات → کاربران
- [x] UX کپی لینک/اطلاعات ورود
- [x] `?tab=access` روی کلیک تب تنظیمات + `data-testid` میزکار
- [x] ساخت فوری → `pending` تا فعال‌سازی؛ منوی عملیات Portal؛ حذف کاربر؛ login تب رمز
- [ ] migration روی prod: `20261019140000_access_invite`
- [ ] رتست Copilot: [updates/01/test02-access-invite-copilot.md](updates/01/test02-access-invite-copilot.md)
- [ ] کاربران قبلی فعال (مثل 09214843361): غیرفعال/حذف یا دستی `pending` در DB

---

## Env (Runflare)

| متغیر | کاربرد |
|--------|--------|
| `DATABASE_URL` / `DIRECT_URL` | Postgres |
| `AUTH_SESSION_SECRET` | session + OTP hash |
| `NEXA_STORAGE_ROOT` | `/data` روی دیسک |
| `SMS_PROVIDER` / `SMS_IR_*` | OTP |
| `NEXT_PUBLIC_FRONTEND_ONLY=false` | **بیلد** |
| `SKIP_MIGRATE` | فقط اگر migrate جدا |

---

## عمداً موکول (Deferred)

- میزیتو ۵-B relational
- S3 presigned (۶-۲)
- AI automation درون اپ
- wire کامل ۲۵+ view ERP تا داشتن API همان ماژول
- Playwright config در repo (اختیاری؛ playbook برای Copilot کافی است)

---

## ترتیب deploy + تست

1. `prisma migrate deploy` · `prisma db seed`
2. Playbook فاز gate — [updates/01/e2e-copilot-playbook.md](updates/01/e2e-copilot-playbook.md)
3. بعد از هر فاز: تیک این فایل + گزارش Copilot
