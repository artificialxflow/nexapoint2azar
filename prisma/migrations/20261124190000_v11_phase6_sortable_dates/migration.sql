-- v11 phase 6 — تاریخ‌های قابل مرتب‌سازی (@db.Date)

-- JournalEntry.date
ALTER TABLE "JournalEntry" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "JournalEntry" ADD COLUMN "date" DATE;
UPDATE "JournalEntry"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "JournalEntry" DROP COLUMN "dateLegacy";
CREATE INDEX "JournalEntry_businessId_date_idx" ON "JournalEntry"("businessId", "date");

-- BankTransaction.date
ALTER TABLE "BankTransaction" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "BankTransaction" ADD COLUMN "date" DATE;
UPDATE "BankTransaction"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "BankTransaction" DROP COLUMN "dateLegacy";
CREATE INDEX "BankTransaction_businessId_date_idx" ON "BankTransaction"("businessId", "date");

-- FundTransfer.date
ALTER TABLE "FundTransfer" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "FundTransfer" ADD COLUMN "date" DATE;
UPDATE "FundTransfer"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "FundTransfer" DROP COLUMN "dateLegacy";
CREATE INDEX "FundTransfer_businessId_date_idx" ON "FundTransfer"("businessId", "date");

-- CheckItem.issueDate / dueDate
ALTER TABLE "CheckItem" RENAME COLUMN "issueDate" TO "issueDateLegacy";
ALTER TABLE "CheckItem" RENAME COLUMN "dueDate" TO "dueDateLegacy";
ALTER TABLE "CheckItem" ADD COLUMN "issueDate" DATE;
ALTER TABLE "CheckItem" ADD COLUMN "dueDate" DATE;
UPDATE "CheckItem"
SET "issueDate" = "issueDateLegacy"::date
WHERE trim("issueDateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "CheckItem"
SET "dueDate" = "dueDateLegacy"::date
WHERE trim("dueDateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "CheckItem" DROP COLUMN "issueDateLegacy";
ALTER TABLE "CheckItem" DROP COLUMN "dueDateLegacy";
CREATE INDEX "CheckItem_businessId_dueDate_idx" ON "CheckItem"("businessId", "dueDate");

-- AttendanceLog.workDate
ALTER TABLE "AttendanceLog" RENAME COLUMN "workDate" TO "workDateLegacy";
ALTER TABLE "AttendanceLog" ADD COLUMN "workDate" DATE;
UPDATE "AttendanceLog"
SET "workDate" = "workDateLegacy"::date
WHERE trim("workDateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "AttendanceLog" DROP COLUMN "workDateLegacy";

-- StoreOrder.date
ALTER TABLE "StoreOrder" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "StoreOrder" ADD COLUMN "date" DATE;
UPDATE "StoreOrder"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "StoreOrder" DROP COLUMN "dateLegacy";
CREATE INDEX "StoreOrder_businessId_date_idx" ON "StoreOrder"("businessId", "date");

-- BlogPost.date
ALTER TABLE "BlogPost" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "BlogPost" ADD COLUMN "date" DATE;
UPDATE "BlogPost"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "BlogPost" DROP COLUMN "dateLegacy";

-- BlogComment.date
ALTER TABLE "BlogComment" RENAME COLUMN "date" TO "dateLegacy";
ALTER TABLE "BlogComment" ADD COLUMN "date" DATE;
UPDATE "BlogComment"
SET "date" = "dateLegacy"::date
WHERE trim("dateLegacy") ~ '^\d{4}-\d{2}-\d{2}$';
ALTER TABLE "BlogComment" DROP COLUMN "dateLegacy";

-- WorkspaceCard dueOn / endDueOn (رشتهٔ dueDate برای UI نگه داشته می‌شود)
ALTER TABLE "WorkspaceCard" ADD COLUMN "dueOn" DATE;
ALTER TABLE "WorkspaceCard" ADD COLUMN "endDueOn" DATE;
UPDATE "WorkspaceCard"
SET "dueOn" = "dueDate"::date
WHERE trim("dueDate") ~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "WorkspaceCard"
SET "endDueOn" = "endDueDate"::date
WHERE trim("endDueDate") ~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "WorkspaceCard"
SET "endDueOn" = "dueOn"
WHERE "endDueOn" IS NULL AND "dueOn" IS NOT NULL;
CREATE INDEX "WorkspaceCard_businessId_dueOn_idx" ON "WorkspaceCard"("businessId", "dueOn");

-- MeizitoCalendarEvent: dateKey SSOT نمایش؛ startOn/endOn برای مرتب‌سازی DB
ALTER TABLE "MeizitoCalendarEvent" ADD COLUMN "startOn" DATE;
ALTER TABLE "MeizitoCalendarEvent" ADD COLUMN "endOn" DATE;
UPDATE "MeizitoCalendarEvent"
SET "startOn" = "dateKey"::date
WHERE trim("dateKey") ~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "MeizitoCalendarEvent"
SET "endOn" = "endDateKey"::date
WHERE trim(COALESCE("endDateKey", '')) ~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "MeizitoCalendarEvent"
SET "endOn" = "startOn"
WHERE "endOn" IS NULL AND "startOn" IS NOT NULL;
CREATE INDEX "MeizitoCalendarEvent_businessId_startOn_idx" ON "MeizitoCalendarEvent"("businessId", "startOn");