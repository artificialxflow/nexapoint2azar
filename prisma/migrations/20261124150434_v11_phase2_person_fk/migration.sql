-- v11 phase 2: پاک‌سازی ارجاع‌های یتیم قبل از FK
DELETE FROM "ShareholderRecord" s
WHERE NOT EXISTS (
  SELECT 1 FROM "Person" p
  WHERE p."businessId" = s."businessId" AND p."personId" = s."personId"
);

DELETE FROM "VendorRecord" v
WHERE NOT EXISTS (
  SELECT 1 FROM "Person" p
  WHERE p."businessId" = v."businessId" AND p."personId" = v."personId"
);

UPDATE "CrmOpportunity" o
SET "personId" = NULL
WHERE o."personId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p."businessId" = o."businessId" AND p."personId" = o."personId"
  );

UPDATE "CrmClubMember" m
SET "personId" = NULL
WHERE m."personId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p."businessId" = m."businessId" AND p."personId" = m."personId"
  );

UPDATE "WorkspaceBoardMember" w
SET "personId" = NULL
WHERE w."personId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p."businessId" = w."businessId" AND p."personId" = w."personId"
  );

UPDATE "WorkspaceBoardMember" w
SET "userId" = NULL
WHERE w."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = w."userId");

UPDATE "PhoneDirectoryEntry" e
SET "personId" = NULL
WHERE e."personId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p."businessId" = e."businessId" AND p."personId" = e."personId"
  );

UPDATE "PhoneDirectoryEntry" e
SET "userId" = NULL
WHERE e."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = e."userId");

-- AlterTable
ALTER TABLE "SalesNetworkMember" ADD COLUMN     "personId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "ShareholderRecord" ADD CONSTRAINT "ShareholderRecord_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRecord" ADD CONSTRAINT "VendorRecord_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmClubMember" ADD CONSTRAINT "CrmClubMember_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBoardMember" ADD CONSTRAINT "WorkspaceBoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBoardMember" ADD CONSTRAINT "WorkspaceBoardMember_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneDirectoryEntry" ADD CONSTRAINT "PhoneDirectoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneDirectoryEntry" ADD CONSTRAINT "PhoneDirectoryEntry_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesNetworkMember" ADD CONSTRAINT "SalesNetworkMember_businessId_personId_fkey" FOREIGN KEY ("businessId", "personId") REFERENCES "Person"("businessId", "personId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesNetworkMember" ADD CONSTRAINT "SalesNetworkMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
