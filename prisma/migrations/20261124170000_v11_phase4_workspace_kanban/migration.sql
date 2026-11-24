-- v11 phase 4 — Workspace / Kanban SSOT

-- 1) sortOrder on cards (before dropping cardIds)
ALTER TABLE "WorkspaceCard" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "WorkspaceCard" c
SET "sortOrder" = sub.ord
FROM (
  SELECT
    c2."id" AS card_id,
    (t.ordinality - 1)::int AS ord
  FROM "WorkspaceColumn" col
  CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(col."cardIds", '[]'::jsonb)) WITH ORDINALITY AS t(card_id, ordinality)
  INNER JOIN "WorkspaceCard" c2 ON c2."id" = t.card_id
) sub
WHERE c."id" = sub.card_id;

UPDATE "WorkspaceCard" c
SET "columnId" = col."id"
FROM "WorkspaceColumn" col
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(col."cardIds", '[]'::jsonb)) AS t(card_id)
WHERE c."id" = t.card_id;

DELETE FROM "WorkspaceCard" c
WHERE NOT EXISTS (SELECT 1 FROM "WorkspaceColumn" wc WHERE wc."id" = c."columnId");

UPDATE "WorkspaceCard"
SET "assigneeUserId" = NULL
WHERE "assigneeUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = "assigneeUserId");

ALTER TABLE "WorkspaceColumn" DROP COLUMN IF EXISTS "cardIds";

-- 2) junction tables
CREATE TABLE "WorkspaceProjectMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "personId" TEXT,
    "displayName" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WorkspaceProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatThreadParticipant" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChatThreadParticipant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WorkspaceProjectMember" ("id", "businessId", "projectId", "personId", "displayName", "sortOrder")
SELECT
  md5(p."id" || ':person:' || t.member_id || ':' || t.ordinality::text),
  p."businessId",
  p."id",
  t.member_id,
  '',
  (t.ordinality - 1)::int
FROM "WorkspaceProject" p
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p."memberIds", '[]'::jsonb)) WITH ORDINALITY AS t(member_id, ordinality)
WHERE t.member_id <> '';

INSERT INTO "WorkspaceProjectMember" ("id", "businessId", "projectId", "userId", "displayName", "sortOrder")
SELECT
  md5(p."id" || ':name:' || t.member_name || ':' || t.ordinality::text),
  p."businessId",
  p."id",
  NULL,
  t.member_name,
  (t.ordinality - 1)::int
FROM "WorkspaceProject" p
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p."members", '[]'::jsonb)) WITH ORDINALITY AS t(member_name, ordinality)
WHERE t.member_name <> '';

INSERT INTO "ChatThreadParticipant" ("id", "businessId", "threadId", "userId", "displayName", "sortOrder")
SELECT
  md5(t."id" || ':' || n.ordinality::text),
  t."businessId",
  t."id",
  CASE
    WHEN u.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM "User" ux WHERE ux."id" = u.user_id) THEN u.user_id
    ELSE NULL
  END,
  n.participant_name,
  (n.ordinality - 1)::int
FROM "ChatThread" t
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(t."participantNames", '[]'::jsonb)) WITH ORDINALITY AS n(participant_name, ordinality)
LEFT JOIN LATERAL (
  SELECT value::text AS user_id, ordinality AS ord
  FROM jsonb_array_elements_text(COALESCE(t."participantIds", '[]'::jsonb)) WITH ORDINALITY AS x(value, ordinality)
) u ON u.ord = n.ordinality;

UPDATE "InternalLetterRecipient" r
SET "recipientUserId" = NULL
WHERE r."recipientUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = r."recipientUserId");

UPDATE "WorkspaceProjectMember" w
SET "userId" = NULL
WHERE w."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."userId");

UPDATE "WorkspaceProjectMember" w
SET "personId" = NULL
WHERE w."personId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Person" p WHERE p."businessId" = w."businessId" AND p."personId" = w."personId"
  );

-- 3) indexes & foreign keys (from Prisma diff)
CREATE INDEX "WorkspaceProjectMember_businessId_projectId_idx" ON "WorkspaceProjectMember"("businessId", "projectId");
CREATE INDEX "ChatThreadParticipant_businessId_threadId_idx" ON "ChatThreadParticipant"("businessId", "threadId");
CREATE INDEX "WorkspaceCard_businessId_columnId_sortOrder_idx" ON "WorkspaceCard"("businessId", "columnId", "sortOrder");

ALTER TABLE "WorkspaceCard" ADD CONSTRAINT "WorkspaceCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "WorkspaceColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceCard" ADD CONSTRAINT "WorkspaceCard_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceProjectMember" ADD CONSTRAINT "WorkspaceProjectMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceProjectMember" ADD CONSTRAINT "WorkspaceProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkspaceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceProjectMember" ADD CONSTRAINT "WorkspaceProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceProjectMember" ADD CONSTRAINT "WorkspaceProjectMember_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InternalLetterRecipient" ADD CONSTRAINT "InternalLetterRecipient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternalLetterRecipient" ADD CONSTRAINT "InternalLetterRecipient_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatThreadParticipant" ADD CONSTRAINT "ChatThreadParticipant_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatThreadParticipant" ADD CONSTRAINT "ChatThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatThreadParticipant" ADD CONSTRAINT "ChatThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;