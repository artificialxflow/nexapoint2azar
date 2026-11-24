# Nexapoint — todo-v8

**بسته:** پرفورمنس + امنیت کش + UX میزیتو (write-on-read، lazy API، scope Provider، repair script، React Query، تقویم/میز).

**شما الان کجایید؟** اولین ردیف جدول زیر که هنوز `[ ]` است = کار بعدی. **ترتیب اجباری Agent:** فاز ۱ → ۲ → ۳ → ۴ → ۵ → ۶ → ۷ → تست فاز ۸.

| فاز | Backend | Frontend | Deploy (شما) | UAT (شما) |
|-----|---------|----------|--------------|-----------|
| ۱ write-on-read | [x] | — | [ ] | [ ] |
| ۲ cache headers | [x] | — | [ ] | [ ] |
| ۳ lazy fetch | — | [x] | [ ] | [ ] |
| ۴ Provider scope | — | [x] | [ ] | [ ] |
| ۵ repair script | [x] | — | [ ] | [ ] |
| ۶ React Query | — | [x] | [ ] | [ ] |
| ۷ UX | — | [x] | [ ] | [ ] |
| ۸ verify | [x] | [x] | [ ] | [ ] |

**خارج از scope v8:** `MEIZITO_*_STORAGE=dual` → `db` (todo-v8.1).

---

## فاز ۱ — حذف persist روی GET workspace (حیاتی)

- [x] حذف `persistWorkspaceSnapshot` از `GET workspace` در [`server-handler.ts`](src/lib/meizito/server-handler.ts)
- [x] `prepareWorkspaceSnapshot` فقط در حافظه قبل از پاسخ GET
- [x] audit: سایر GETها persist نمی‌کنند

**UAT:** GET `/api/meizito/{id}/workspace` سریع؛ بدون deleteMany تکراری در DB.

---

## فاز ۲ — Cache-Control روی API میزیتو

- [x] `private, no-store` (+ `Vary: Cookie`) در [`app/api/meizito/[businessId]/[...path]/route.ts`](app/api/meizito/[businessId]/[...path]/route.ts)

**UAT:** Network headers روی پاسخ workspace.

---

## فاز ۳ — Lazy fetch ماژول‌ها

- [x] mount: فقط `team-directory` + `workspace`
- [x] `ensureMeizitoModuleLoaded('chat' | 'calendar' | 'letters' | 'requests')` در [`MeizitoContext.tsx`](src/context/MeizitoContext.tsx)
- [x] [`MeizitoWorkspace.tsx`](src/views/meizito/MeizitoWorkspace.tsx) — trigger بر اساس tab
- [x] [`ChatsPage.tsx`](src/views/ChatsPage.tsx) — chat در mount
- [x] [`tabHydration.ts`](src/lib/meizito/tabHydration.ts) — فیلد `chat`

**UAT:** ورود `?tab=boards` → فقط workspace + team-directory؛ تقویم بعد از tab=calendar.

---

## فاز ۴ — محدودسازی MeizitoProvider

- [x] حذف Provider از [`DashboardShell.tsx`](src/layouts/DashboardShell.tsx) و [`DashboardLayout.tsx`](src/layouts/DashboardLayout.tsx)
- [x] [`MeizitoProviders.tsx`](src/context/MeizitoProviders.tsx) — QueryClient + MeizitoProvider
- [x] [`Tasks.tsx`](src/views/Tasks.tsx) + [`ChatsPage.tsx`](src/views/ChatsPage.tsx)

**UAT:** CRM/Settings بدون fetch workspace در Network.

---

## فاز ۵ — اسکریپت repair یک‌باره

- [x] [`workspace-prepare.ts`](src/lib/meizito/workspace/workspace-prepare.ts)
- [x] [`scripts/repair-workspace-snapshot.ts`](scripts/repair-workspace-snapshot.ts)
- [x] `npm run db:repair-workspace`

**Deploy (شما):** پس از فاز ۱ در prod: `npm run db:repair-workspace -- --dry-run` سپس بدون dry-run.

---

## فاز ۶ — TanStack Query + optimistic move

- [x] `@tanstack/react-query` + [`useWorkspaceQuery`](src/lib/meizito/workspace/useWorkspaceQuery.ts) / ادغام در context
- [x] `moveCard`: invalidate بدون `refreshWorkspace()` blocking پس از optimistic

**UAT:** drag کارت — UI فوری، POST `card-move`.

---

## فاز ۷ — UX (updates/07/01)

- [x] بازگردانی نوار تب‌های `MEIZITO_NAV_TABS` (فقط تب‌های workspace؛ نه تکرار سایدبار)
- [x] `addBoard`: بدون `refreshWorkspace` وقتی columns در پاسخ POST هست
- [x] تقویم: عنوان شمسی + [`JalaliDateInput`](src/views/meizito/components/JalaliDateInput.tsx) جای `type="date"` در scope میزیتo

**UAT:** میز جدید سه ستون؛ تقویم «آبان ۱۴۰۴» نه عدد گیج‌کننده.

---

## فاز ۸ — تست خودکار و build

- [x] `npx tsx scripts/test-workspace-guards.mts`
- [x] `npm run build`
- [ ] UAT کامل: [`updates/06/uat-meizito-06.md`](updates/06/uat-meizito-06.md)
- [ ] Deploy production

---

## مرجع

- پلن: todo-v8 performance UX (Cursor plan)
- نسخه قبل: [`todo-v7.md`](todo-v7.md)
- نسخه محصولی بعد (updates/08): [`todo-v9.md`](todo-v9.md)
