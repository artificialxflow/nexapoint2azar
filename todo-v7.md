# Nexapoint — todo-v7

**بسته:** میز کار + comms ([updates/06](updates/06/New%20Text%20Document.txt)) + **P1/P2 DB** (promote از blueprint، [schema-api-roadmap.md](schema-api-roadmap.md) M2/M3).

**شما الان کجایید؟** اولین ردیف جدول زیر که ستون **Schema** یا **Backend** یا **Frontend** هنوز `[ ]` است = کار Agent بعدی. **ترتیب اجباری:** Schema → Backend → Frontend → Deploy → UAT.

**مرجع v5:** پس از بستن v7، تیک [P1/P2](todo-v5.md) و «مرحله ۱ کاملِ دیتا».

| فاز | Schema | Backend | Frontend | Deploy (شما) | UAT (شما) |
|-----|--------|---------|----------|--------------|-----------|
| ۰ spec | [x] | [x] | — | — | — |
| ۱ phone | [x] | [x] | [x] | [ ] | [ ] |
| ۱ P1 workspace | [x] | [x] | [x] | [ ] | [ ] |
| ۱ P2 comms | [x] | [x] | [x] | [ ] | [ ] |
| ۲ backfill + API | — | [x] | — | [ ] | [ ] |
| ۳ UX جلسه 06 | — | — | [x] | [ ] | [ ] |
| ۴ UAT + v5 | — | — | [x] | [ ] | [ ] |

---

## فاز ۰ — spec

- [x] [updates/06/requirements.fa.md](updates/06/requirements.fa.md)
- [x] [updates/06/promote-models-m2-m3.md](updates/06/promote-models-m2-m3.md)
- [x] [updates/06/cutover-policy.md](updates/06/cutover-policy.md)

---

## فاز ۱.۱ — اسکیما دفتر تلفن (P06)

- [x] enum `PhoneDirectoryEntryKind` · فیلدهای `entryKind`, `visibilityTags`, `groupId`
- [x] مدل `PhoneDirectoryGroup`
- [x] migration `*_p06_phone_directory_*`
- [x] Zod + types [`phone-directory.ts`](src/types/phone-directory.ts)
- [x] service: فیلتر visibility · بدون sync خودکار به CRM

---

## فاز ۱.2 — اسکیما P1 workspace (M2)

- [x] `BusinessMeizitoWorkspaceMeta` (activeBoardId, activeNoteBoardId)
- [x] `WorkspaceBoard`, `WorkspaceColumn`, `WorkspaceCard`, `WorkspaceLabel`, `WorkspaceBoardMember`
- [x] `NoteBoard`, `WorkspaceNote`, `WorkspaceDailyReport`, `WorkspaceFieldVisit`, `WorkspaceProject`
- [x] فیلدهای card: `calendarId`, `calendarEventId`
- [x] migration `*_p1_workspace_*`

---

## فاز ۱.3 — اسکیما P2 comms (M3)

- [x] `InternalLetter`, `InternalLetterRecipient`, `MeizitoApprovalStep`
- [x] `MeizitoCalendar`, `MeizitoCalendarEvent`
- [x] `ChatThread`, `ChatMessage`
- [x] `InternalWorkRequest`
- [x] migration `*_p2_meizito_comms_*`

---

## فاز ۲ — بک‌اند

### Backfill

- [x] [`scripts/backfill-workspace-p1.ts`](scripts/backfill-workspace-p1.ts) (+ `--dry-run`)
- [x] [`scripts/backfill-meizito-comms-p2.ts`](scripts/backfill-meizito-comms-p2.ts)
- [x] [`package.json`](package.json) scripts

### Services + storage

- [x] [`workspace-db-service.ts`](src/lib/meizito/workspace/workspace-db-service.ts)
- [x] [`workspace-storage.ts`](src/lib/meizito/workspace/workspace-storage.ts) (slice | db | dual)
- [x] [`comms-db-service.ts`](src/lib/meizito/comms-db-service.ts) + [`comms-storage.ts`](src/lib/meizito/comms-storage.ts)
- [x] [`server-handler.ts`](src/lib/meizito/server-handler.ts) از storage استفاده کند
- [x] [`config.ts`](src/lib/meizito/config.ts) + env در [cutover-policy.md](updates/06/cutover-policy.md)

### تست

- [x] [`scripts/test-workspace-guards.mts`](scripts/test-workspace-guards.mts) گسترش
- [x] `scripts/test-meizito-db-p1.mts`
- [x] `scripts/test-phone-directory-p06.mts`

---

## فاز ۳ — فرانت (جلسه 06)

- [x] [`MeizitoWorkspace.tsx`](src/views/meizito/MeizitoWorkspace.tsx) — header ساده
- [x] [`BoardsPanel.tsx`](src/views/meizito/panels/BoardsPanel.tsx) — تب میزها، برچسب جدید، اعضا، وظیفه کامل
- [x] [`LettersPanel.tsx`](src/views/meizito/panels/LettersPanel.tsx) — جستجو گسترده، چند گیرنده
- [x] [`ProjectsPanel.tsx`](src/views/meizito/panels/ProjectsPanel.tsx) — تب پروژه
- [x] [`CalendarPanel.tsx`](src/views/meizito/panels/CalendarPanel.tsx) — شمسی + انتخاب تقویم در وظیفه
- [x] [`PhoneDirectoryPanel.tsx`](src/views/meizito/panels/PhoneDirectoryPanel.tsx) — گروه/visibility
- [x] [`MeizitoContext.tsx`](src/context/MeizitoContext.tsx) — `addBoardLabel`, members

---

## فاز ۴ — deploy و UAT

- [ ] (شما) push + `npx prisma migrate deploy` (هر migration فاز ۱)
- [ ] (شما) backfill production — [updates/06/deploy-runbook.md](updates/06/deploy-runbook.md)
- [ ] UAT: [updates/06/uat-meizito-06.md](updates/06/uat-meizito-06.md)
- [ ] رگرسیون: [updates/03/copilot-phase-01-quick-access.md](updates/03/copilot-phase-01-quick-access.md)
- [ ] تیک P1/P2 در [todo-v5.md](todo-v5.md)

---

## deploy محلی (Agent)

```bash
npx prisma migrate dev   # یا migrate deploy روی VPS
npx prisma generate
npm run db:backfill-workspace-p1 -- --dry-run
npm run db:backfill-meizito-comms-p2 -- --dry-run
```

---

## بسته تقویم 07/02 (Meizito)

- [x] فاز 1–4 — [updates/07/02/calendar-07-02.md](updates/07/02/calendar-07-02.md)
- [ ] (شما) `prisma migrate deploy` برای `20261102120000_calendar_event_recurrence`
- [ ] UAT تقویم طبق همان فایل
