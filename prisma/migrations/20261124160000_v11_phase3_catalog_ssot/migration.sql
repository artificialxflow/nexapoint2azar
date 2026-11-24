-- v11 phase 3 — Catalog SSOT (Store, WarehouseItem, Voucher lines)

-- StoreProduct: FK column + drop legacy string money fields
ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS "catalogProductId" TEXT;

UPDATE "StoreProduct" sp
SET "catalogProductId" = sp."id"
WHERE sp."catalogProductId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "CatalogProduct" cp
    WHERE cp."businessId" = sp."businessId" AND cp."productId" = sp."id"
  );

UPDATE "StoreProduct" sp
SET "catalogProductId" = cp."productId"
FROM "CatalogProduct" cp
WHERE sp."catalogProductId" IS NULL
  AND cp."businessId" = sp."businessId"
  AND cp."code" = sp."id";

WITH dups AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY "businessId", "catalogProductId" ORDER BY "createdAt" ASC) AS rn
  FROM "StoreProduct"
  WHERE "catalogProductId" IS NOT NULL
)
UPDATE "StoreProduct" sp
SET "catalogProductId" = NULL
FROM dups
WHERE sp.id = dups.id AND dups.rn > 1;

ALTER TABLE "StoreProduct" DROP COLUMN IF EXISTS "price";
ALTER TABLE "StoreProduct" DROP COLUMN IF EXISTS "stock";

ALTER TABLE "StoreOrder" DROP COLUMN IF EXISTS "total";

-- Warehouse voucher lines
ALTER TABLE "WarehouseVoucherItem" ADD COLUMN IF NOT EXISTS "businessId" TEXT;
ALTER TABLE "WarehouseVoucherItem" ADD COLUMN IF NOT EXISTS "catalogProductId" TEXT;

UPDATE "WarehouseVoucherItem" wi
SET "businessId" = v."businessId"
FROM "WarehouseVoucher" v
WHERE wi."voucherId" = v."id" AND wi."businessId" IS NULL;

UPDATE "WarehouseVoucherItem" wi
SET "catalogProductId" = cp."productId"
FROM "CatalogProduct" cp
WHERE wi."businessId" = cp."businessId"
  AND wi."itemCode" <> ''
  AND cp."code" = wi."itemCode"
  AND wi."catalogProductId" IS NULL;

DELETE FROM "WarehouseVoucherItem" WHERE "businessId" IS NULL;

ALTER TABLE "WarehouseVoucherItem" ALTER COLUMN "businessId" SET NOT NULL;

-- WarehouseItem: add normalized columns (keep data during backfill)
ALTER TABLE "WarehouseItem" ADD COLUMN IF NOT EXISTS "catalogProductId" TEXT;
ALTER TABLE "WarehouseItem" ADD COLUMN IF NOT EXISTS "warehouseLocationId" TEXT;
ALTER TABLE "WarehouseItem" ADD COLUMN IF NOT EXISTS "stockQty" DECIMAL(20,3) DEFAULT 0;
ALTER TABLE "WarehouseItem" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'عدد';

-- Legacy JSON = physical warehouse location → WarehouseLocation
INSERT INTO "WarehouseLocation" (
  "id", "businessId", "code", "name", "address", "manager", "isDefault", "active", "createdAt", "updatedAt"
)
SELECT
  COALESCE(wi."data"->>'id', wi."id"),
  wi."businessId",
  COALESCE(NULLIF(wi."data"->>'code', ''), 'WH-MIG-' || substring(wi."id", 1, 8)),
  COALESCE(NULLIF(wi."data"->>'name', ''), 'انبار'),
  COALESCE(wi."data"->>'description', ''),
  '',
  false,
  COALESCE((wi."data"->>'isActive')::boolean, true),
  wi."createdAt",
  wi."updatedAt"
FROM "WarehouseItem" wi
WHERE wi."data" IS NOT NULL
  AND (wi."data" ? 'isActive' OR NOT (wi."data" ? 'qty'))
ON CONFLICT ("businessId", "code") DO NOTHING;

-- Stock JSON rows → catalog + stock qty
INSERT INTO "CatalogProduct" (
  "businessId", "productId", "name", "code", "accountingCode", "type", "status", "data", "createdAt", "updatedAt"
)
SELECT DISTINCT
  wi."businessId",
  COALESCE(NULLIF(wi."data"->>'id', ''), wi."id"),
  COALESCE(NULLIF(wi."data"->>'name', ''), 'کالا'),
  COALESCE(NULLIF(wi."data"->>'code', ''), 'MIG-' || substring(wi."id", 1, 8)),
  COALESCE(NULLIF(wi."data"->>'code', ''), 'MIG'),
  'goods',
  'active',
  jsonb_build_object(
    'id', COALESCE(NULLIF(wi."data"->>'id', ''), wi."id"),
    'name', COALESCE(NULLIF(wi."data"->>'name', ''), 'کالا'),
    'code', COALESCE(NULLIF(wi."data"->>'code', ''), 'MIG'),
    'status', 'active',
    'type', 'goods'
  ),
  NOW(),
  NOW()
FROM "WarehouseItem" wi
WHERE wi."data" IS NOT NULL
  AND wi."data" ? 'qty'
  AND NOT EXISTS (
    SELECT 1 FROM "CatalogProduct" cp
    WHERE cp."businessId" = wi."businessId"
      AND (
        cp."productId" = COALESCE(NULLIF(wi."data"->>'id', ''), wi."id")
        OR cp."code" = wi."data"->>'code'
      )
  )
ON CONFLICT DO NOTHING;

UPDATE "WarehouseItem" wi
SET
  "catalogProductId" = sub.cp_id,
  "stockQty" = sub.stock_qty,
  "unit" = sub.unit,
  "warehouseLocationId" = sub.wl_id
FROM (
  SELECT
    wi2."id" AS wi_id,
    cp."productId" AS cp_id,
    COALESCE(NULLIF(wi2."data"->>'qty', '')::numeric, 0) AS stock_qty,
    COALESCE(NULLIF(wi2."data"->>'unit', ''), 'عدد') AS unit,
    wl."id" AS wl_id
  FROM "WarehouseItem" wi2
  INNER JOIN "CatalogProduct" cp
    ON cp."businessId" = wi2."businessId"
    AND (
      cp."productId" = COALESCE(NULLIF(wi2."data"->>'id', ''), wi2."id")
      OR (wi2."data"->>'code' <> '' AND cp."code" = wi2."data"->>'code')
    )
  LEFT JOIN "WarehouseLocation" wl
    ON wl."businessId" = wi2."businessId"
    AND (
      wl."id" = wi2."data"->>'warehouseId'
      OR wl."code" = wi2."data"->>'warehouseId'
    )
  WHERE wi2."data" IS NOT NULL AND wi2."data" ? 'qty'
) sub
WHERE wi."id" = sub.wi_id;

DELETE FROM "WarehouseItem"
WHERE "catalogProductId" IS NULL;

ALTER TABLE "WarehouseItem" DROP COLUMN IF EXISTS "data";
ALTER TABLE "WarehouseItem" ALTER COLUMN "catalogProductId" SET NOT NULL;
ALTER TABLE "WarehouseItem" ALTER COLUMN "stockQty" SET NOT NULL;
ALTER TABLE "WarehouseItem" ALTER COLUMN "unit" SET NOT NULL;

-- Prisma-generated indexes & FKs
CREATE UNIQUE INDEX "StoreProduct_businessId_catalogProductId_key" ON "StoreProduct"("businessId", "catalogProductId");

CREATE INDEX "WarehouseItem_businessId_catalogProductId_idx" ON "WarehouseItem"("businessId", "catalogProductId");

CREATE UNIQUE INDEX "WarehouseItem_businessId_catalogProductId_warehouseLocation_key" ON "WarehouseItem"("businessId", "catalogProductId", "warehouseLocationId");

CREATE INDEX "WarehouseVoucherItem_businessId_catalogProductId_idx" ON "WarehouseVoucherItem"("businessId", "catalogProductId");

ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_businessId_catalogProductId_fkey" FOREIGN KEY ("businessId", "catalogProductId") REFERENCES "CatalogProduct"("businessId", "productId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_warehouseLocationId_fkey" FOREIGN KEY ("warehouseLocationId") REFERENCES "WarehouseLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseVoucherItem" ADD CONSTRAINT "WarehouseVoucherItem_businessId_catalogProductId_fkey" FOREIGN KEY ("businessId", "catalogProductId") REFERENCES "CatalogProduct"("businessId", "productId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_businessId_catalogProductId_fkey" FOREIGN KEY ("businessId", "catalogProductId") REFERENCES "CatalogProduct"("businessId", "productId") ON DELETE SET NULL ON UPDATE CASCADE;