-- v11 phase 5 — EntityAttachment + حذف ChatMessage.imageDataUrl

CREATE TABLE "EntityAttachment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EntityAttachment_entityType_entityId_attachmentId_key" ON "EntityAttachment"("entityType", "entityId", "attachmentId");
CREATE INDEX "EntityAttachment_businessId_entityType_entityId_idx" ON "EntityAttachment"("businessId", "entityType", "entityId");

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5(a."id" || ':' || a."entityType" || ':' || a."entityId"),
  a."businessId",
  a."entityType",
  a."entityId",
  a."id",
  0,
  a."createdAt"
FROM "Attachment" a
WHERE a."businessId" IS NOT NULL
  AND a."entityId" IS NOT NULL
  AND a."entityId" <> ''
  AND a."entityType" <> 'general';

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5('chat:' || m."id" || ':' || t.ordinality::text),
  m."businessId",
  'chat_message',
  m."id",
  a."id",
  (t.ordinality - 1)::int,
  m."createdAt"
FROM "ChatMessage" m
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m."attachmentRefs", '[]'::jsonb)) WITH ORDINALITY AS t(ref, ordinality)
INNER JOIN "Attachment" a ON a."fileKey" = (t.ref->>'fileKey')
WHERE (t.ref->>'fileKey') IS NOT NULL AND (t.ref->>'fileKey') <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5('wcard:' || c."id" || ':' || t.ordinality::text),
  c."businessId",
  'workspace_card',
  c."id",
  a."id",
  (t.ordinality - 1)::int,
  c."createdAt"
FROM "WorkspaceCard" c
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c."attachments"::jsonb, '[]'::jsonb)) WITH ORDINALITY AS t(ref, ordinality)
INNER JOIN "Attachment" a ON a."fileKey" = (t.ref->>'fileKey')
WHERE (t.ref->>'fileKey') IS NOT NULL AND (t.ref->>'fileKey') <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5('wnote:' || n."id" || ':' || t.ordinality::text),
  n."businessId",
  'workspace_note',
  n."id",
  a."id",
  (t.ordinality - 1)::int,
  n."createdAt"
FROM "WorkspaceNote" n
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(n."attachments"::jsonb, '[]'::jsonb)) WITH ORDINALITY AS t(ref, ordinality)
INNER JOIN "Attachment" a ON a."fileKey" = (t.ref->>'fileKey')
WHERE (t.ref->>'fileKey') IS NOT NULL AND (t.ref->>'fileKey') <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5('letter:' || l."id" || ':' || t.ordinality::text),
  l."businessId",
  'internal_letter',
  l."id",
  a."id",
  (t.ordinality - 1)::int,
  l."createdAt"
FROM "InternalLetter" l
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(l."attachments"::jsonb, '[]'::jsonb)) WITH ORDINALITY AS t(ref, ordinality)
INNER JOIN "Attachment" a ON a."fileKey" = (t.ref->>'fileKey')
WHERE (t.ref->>'fileKey') IS NOT NULL AND (t.ref->>'fileKey') <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "EntityAttachment" ("id", "businessId", "entityType", "entityId", "attachmentId", "sortOrder", "createdAt")
SELECT
  md5('request:' || r."id" || ':' || t.ordinality::text),
  r."businessId",
  'internal_work_request',
  r."id",
  a."id",
  (t.ordinality - 1)::int,
  r."createdAt"
FROM "InternalWorkRequest" r
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r."attachments"::jsonb, '[]'::jsonb)) WITH ORDINALITY AS t(ref, ordinality)
INNER JOIN "Attachment" a ON a."fileKey" = (t.ref->>'fileKey')
WHERE (t.ref->>'fileKey') IS NOT NULL AND (t.ref->>'fileKey') <> ''
ON CONFLICT DO NOTHING;

UPDATE "ChatMessage"
SET "attachmentRefs" = '[]'::jsonb
WHERE COALESCE("attachmentRefs"::text, '') LIKE '%data:image%';

ALTER TABLE "ChatMessage" DROP COLUMN IF EXISTS "imageDataUrl";

ALTER TABLE "EntityAttachment" ADD CONSTRAINT "EntityAttachment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityAttachment" ADD CONSTRAINT "EntityAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;