-- v11 phase 7 — وضعیت‌های flow به enum

CREATE TYPE "InternalLetterStatus" AS ENUM ('open', 'closed');
CREATE TYPE "InternalLetterBox" AS ENUM ('inbox', 'outbox', 'archive');
CREATE TYPE "MeizitoApprovalState" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE "WorkRequestStatus" AS ENUM ('open', 'closed');
CREATE TYPE "WorkRequestPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "WorkRequestBox" AS ENUM ('inbox', 'outbox', 'archive');
CREATE TYPE "CustomerOrderStatus" AS ENUM ('pending_approval', 'confirmed', 'in_production', 'completed', 'cancelled');
CREATE TYPE "ProductionOrderStatus" AS ENUM ('pending_approval', 'in_production', 'completed', 'cancelled');
CREATE TYPE "StoreOrderStatus" AS ENUM ('pending_processing', 'processing', 'shipped', 'completed', 'cancelled');
CREATE TYPE "WarehouseVoucherStatus" AS ENUM ('draft', 'posted', 'cancelled');
CREATE TYPE "WarehouseReceiptStatus" AS ENUM ('pending', 'posted');
CREATE TYPE "CrmLeadStatus" AS ENUM ('new', 'in_progress', 'contact_failed', 'converted');
CREATE TYPE "CrmClubMemberStatus" AS ENUM ('active', 'inactive', 'suspended');

-- InternalLetter
ALTER TABLE "InternalLetter" ADD COLUMN "status_new" "InternalLetterStatus";
UPDATE "InternalLetter" SET "status_new" = CASE
  WHEN lower(trim("status")) = 'closed' THEN 'closed'::"InternalLetterStatus"
  ELSE 'open'::"InternalLetterStatus"
END;
ALTER TABLE "InternalLetter" DROP COLUMN "status";
ALTER TABLE "InternalLetter" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "InternalLetter" ALTER COLUMN "status" SET DEFAULT 'open'::"InternalLetterStatus";
ALTER TABLE "InternalLetter" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "InternalLetter" ADD COLUMN "box_new" "InternalLetterBox";
UPDATE "InternalLetter" SET "box_new" = CASE lower(trim("box"))
  WHEN 'outbox' THEN 'outbox'::"InternalLetterBox"
  WHEN 'archive' THEN 'archive'::"InternalLetterBox"
  ELSE 'inbox'::"InternalLetterBox"
END;
ALTER TABLE "InternalLetter" DROP COLUMN "box";
ALTER TABLE "InternalLetter" RENAME COLUMN "box_new" TO "box";
ALTER TABLE "InternalLetter" ALTER COLUMN "box" SET DEFAULT 'inbox'::"InternalLetterBox";
ALTER TABLE "InternalLetter" ALTER COLUMN "box" SET NOT NULL;

ALTER TABLE "InternalLetter" ADD COLUMN "approvalState_new" "MeizitoApprovalState";
UPDATE "InternalLetter" SET "approvalState_new" = CASE lower(trim(COALESCE("approvalState", '')))
  WHEN 'draft' THEN 'draft'::"MeizitoApprovalState"
  WHEN 'pending' THEN 'pending'::"MeizitoApprovalState"
  WHEN 'approved' THEN 'approved'::"MeizitoApprovalState"
  WHEN 'rejected' THEN 'rejected'::"MeizitoApprovalState"
  WHEN 'cancelled' THEN 'cancelled'::"MeizitoApprovalState"
  ELSE NULL
END;
ALTER TABLE "InternalLetter" DROP COLUMN "approvalState";
ALTER TABLE "InternalLetter" RENAME COLUMN "approvalState_new" TO "approvalState";

-- InternalWorkRequest
ALTER TABLE "InternalWorkRequest" ADD COLUMN "status_new" "WorkRequestStatus";
UPDATE "InternalWorkRequest" SET "status_new" = CASE lower(trim("status"))
  WHEN 'closed' THEN 'closed'::"WorkRequestStatus"
  ELSE 'open'::"WorkRequestStatus"
END;
ALTER TABLE "InternalWorkRequest" DROP COLUMN "status";
ALTER TABLE "InternalWorkRequest" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "status" SET DEFAULT 'open'::"WorkRequestStatus";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "InternalWorkRequest" ADD COLUMN "priority_new" "WorkRequestPriority";
UPDATE "InternalWorkRequest" SET "priority_new" = CASE lower(trim("priority"))
  WHEN 'low' THEN 'low'::"WorkRequestPriority"
  WHEN 'high' THEN 'high'::"WorkRequestPriority"
  WHEN 'urgent' THEN 'urgent'::"WorkRequestPriority"
  ELSE 'medium'::"WorkRequestPriority"
END;
ALTER TABLE "InternalWorkRequest" DROP COLUMN "priority";
ALTER TABLE "InternalWorkRequest" RENAME COLUMN "priority_new" TO "priority";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "priority" SET DEFAULT 'medium'::"WorkRequestPriority";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "priority" SET NOT NULL;

ALTER TABLE "InternalWorkRequest" ADD COLUMN "box_new" "WorkRequestBox";
UPDATE "InternalWorkRequest" SET "box_new" = CASE lower(trim("box"))
  WHEN 'inbox' THEN 'inbox'::"WorkRequestBox"
  WHEN 'archive' THEN 'archive'::"WorkRequestBox"
  ELSE 'outbox'::"WorkRequestBox"
END;
ALTER TABLE "InternalWorkRequest" DROP COLUMN "box";
ALTER TABLE "InternalWorkRequest" RENAME COLUMN "box_new" TO "box";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "box" SET DEFAULT 'outbox'::"WorkRequestBox";
ALTER TABLE "InternalWorkRequest" ALTER COLUMN "box" SET NOT NULL;

ALTER TABLE "InternalWorkRequest" ADD COLUMN "approvalState_new" "MeizitoApprovalState";
UPDATE "InternalWorkRequest" SET "approvalState_new" = CASE lower(trim(COALESCE("approvalState", '')))
  WHEN 'draft' THEN 'draft'::"MeizitoApprovalState"
  WHEN 'pending' THEN 'pending'::"MeizitoApprovalState"
  WHEN 'approved' THEN 'approved'::"MeizitoApprovalState"
  WHEN 'rejected' THEN 'rejected'::"MeizitoApprovalState"
  WHEN 'cancelled' THEN 'cancelled'::"MeizitoApprovalState"
  ELSE NULL
END;
ALTER TABLE "InternalWorkRequest" DROP COLUMN "approvalState";
ALTER TABLE "InternalWorkRequest" RENAME COLUMN "approvalState_new" TO "approvalState";

-- CustomerOrder
ALTER TABLE "CustomerOrder" ADD COLUMN "status_new" "CustomerOrderStatus";
UPDATE "CustomerOrder" SET "status_new" = CASE trim("status")
  WHEN 'در انتظار تایید' THEN 'pending_approval'::"CustomerOrderStatus"
  WHEN 'تایید شده' THEN 'confirmed'::"CustomerOrderStatus"
  WHEN 'در حال تولید' THEN 'in_production'::"CustomerOrderStatus"
  WHEN 'تکمیل شده' THEN 'completed'::"CustomerOrderStatus"
  WHEN 'لغو شده' THEN 'cancelled'::"CustomerOrderStatus"
  WHEN 'pending_approval' THEN 'pending_approval'::"CustomerOrderStatus"
  WHEN 'confirmed' THEN 'confirmed'::"CustomerOrderStatus"
  WHEN 'in_production' THEN 'in_production'::"CustomerOrderStatus"
  WHEN 'completed' THEN 'completed'::"CustomerOrderStatus"
  WHEN 'cancelled' THEN 'cancelled'::"CustomerOrderStatus"
  ELSE 'pending_approval'::"CustomerOrderStatus"
END;
ALTER TABLE "CustomerOrder" DROP COLUMN "status";
ALTER TABLE "CustomerOrder" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "CustomerOrder" ALTER COLUMN "status" SET DEFAULT 'pending_approval'::"CustomerOrderStatus";
ALTER TABLE "CustomerOrder" ALTER COLUMN "status" SET NOT NULL;
CREATE INDEX "CustomerOrder_businessId_status_idx" ON "CustomerOrder"("businessId", "status");

-- ProductionOrder
ALTER TABLE "ProductionOrder" ADD COLUMN "status_new" "ProductionOrderStatus";
UPDATE "ProductionOrder" SET "status_new" = CASE trim("status")
  WHEN 'در انتظار تایید' THEN 'pending_approval'::"ProductionOrderStatus"
  WHEN 'در حال تولید' THEN 'in_production'::"ProductionOrderStatus"
  WHEN 'تکمیل شده' THEN 'completed'::"ProductionOrderStatus"
  WHEN 'لغو شده' THEN 'cancelled'::"ProductionOrderStatus"
  WHEN 'pending_approval' THEN 'pending_approval'::"ProductionOrderStatus"
  WHEN 'in_production' THEN 'in_production'::"ProductionOrderStatus"
  WHEN 'completed' THEN 'completed'::"ProductionOrderStatus"
  WHEN 'cancelled' THEN 'cancelled'::"ProductionOrderStatus"
  ELSE 'in_production'::"ProductionOrderStatus"
END;
ALTER TABLE "ProductionOrder" DROP COLUMN "status";
ALTER TABLE "ProductionOrder" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "ProductionOrder" ALTER COLUMN "status" SET DEFAULT 'in_production'::"ProductionOrderStatus";
ALTER TABLE "ProductionOrder" ALTER COLUMN "status" SET NOT NULL;

-- StoreOrder
ALTER TABLE "StoreOrder" ADD COLUMN "status_new" "StoreOrderStatus";
UPDATE "StoreOrder" SET "status_new" = CASE trim("status")
  WHEN 'در انتظار پردازش' THEN 'pending_processing'::"StoreOrderStatus"
  WHEN 'در حال پردازش' THEN 'processing'::"StoreOrderStatus"
  WHEN 'ارسال شده' THEN 'shipped'::"StoreOrderStatus"
  WHEN 'تکمیل شده' THEN 'completed'::"StoreOrderStatus"
  WHEN 'لغو شده' THEN 'cancelled'::"StoreOrderStatus"
  WHEN 'pending_processing' THEN 'pending_processing'::"StoreOrderStatus"
  WHEN 'processing' THEN 'processing'::"StoreOrderStatus"
  WHEN 'shipped' THEN 'shipped'::"StoreOrderStatus"
  WHEN 'completed' THEN 'completed'::"StoreOrderStatus"
  WHEN 'cancelled' THEN 'cancelled'::"StoreOrderStatus"
  ELSE 'pending_processing'::"StoreOrderStatus"
END;
ALTER TABLE "StoreOrder" DROP COLUMN "status";
ALTER TABLE "StoreOrder" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "StoreOrder" ALTER COLUMN "status" SET DEFAULT 'pending_processing'::"StoreOrderStatus";
ALTER TABLE "StoreOrder" ALTER COLUMN "status" SET NOT NULL;

-- WarehouseVoucher
ALTER TABLE "WarehouseVoucher" ADD COLUMN "status_new" "WarehouseVoucherStatus";
UPDATE "WarehouseVoucher" SET "status_new" = CASE trim("status")
  WHEN 'ثبت شده' THEN 'posted'::"WarehouseVoucherStatus"
  WHEN 'پیش‌نویس' THEN 'draft'::"WarehouseVoucherStatus"
  WHEN 'لغو شده' THEN 'cancelled'::"WarehouseVoucherStatus"
  WHEN 'posted' THEN 'posted'::"WarehouseVoucherStatus"
  WHEN 'draft' THEN 'draft'::"WarehouseVoucherStatus"
  WHEN 'cancelled' THEN 'cancelled'::"WarehouseVoucherStatus"
  ELSE 'posted'::"WarehouseVoucherStatus"
END;
ALTER TABLE "WarehouseVoucher" DROP COLUMN "status";
ALTER TABLE "WarehouseVoucher" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "WarehouseVoucher" ALTER COLUMN "status" SET DEFAULT 'posted'::"WarehouseVoucherStatus";
ALTER TABLE "WarehouseVoucher" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "WarehouseVoucher" ADD COLUMN "warehouseReceiptStatus_new" "WarehouseReceiptStatus";
UPDATE "WarehouseVoucher" SET "warehouseReceiptStatus_new" = CASE lower(trim("warehouseReceiptStatus"))
  WHEN 'posted' THEN 'posted'::"WarehouseReceiptStatus"
  ELSE 'pending'::"WarehouseReceiptStatus"
END;
ALTER TABLE "WarehouseVoucher" DROP COLUMN "warehouseReceiptStatus";
ALTER TABLE "WarehouseVoucher" RENAME COLUMN "warehouseReceiptStatus_new" TO "warehouseReceiptStatus";
ALTER TABLE "WarehouseVoucher" ALTER COLUMN "warehouseReceiptStatus" SET DEFAULT 'pending'::"WarehouseReceiptStatus";
ALTER TABLE "WarehouseVoucher" ALTER COLUMN "warehouseReceiptStatus" SET NOT NULL;

-- CrmLead
ALTER TABLE "CrmLead" ADD COLUMN "status_new" "CrmLeadStatus";
UPDATE "CrmLead" SET "status_new" = CASE trim("status")
  WHEN 'جدید' THEN 'new'::"CrmLeadStatus"
  WHEN 'در حال پیگیری' THEN 'in_progress'::"CrmLeadStatus"
  WHEN 'تماس ناموفق' THEN 'contact_failed'::"CrmLeadStatus"
  WHEN 'تبدیل‌شده' THEN 'converted'::"CrmLeadStatus"
  WHEN 'new' THEN 'new'::"CrmLeadStatus"
  WHEN 'in_progress' THEN 'in_progress'::"CrmLeadStatus"
  WHEN 'contact_failed' THEN 'contact_failed'::"CrmLeadStatus"
  WHEN 'converted' THEN 'converted'::"CrmLeadStatus"
  ELSE 'new'::"CrmLeadStatus"
END;
ALTER TABLE "CrmLead" DROP COLUMN "status";
ALTER TABLE "CrmLead" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "CrmLead" ALTER COLUMN "status" SET DEFAULT 'new'::"CrmLeadStatus";
ALTER TABLE "CrmLead" ALTER COLUMN "status" SET NOT NULL;
CREATE INDEX "CrmLead_businessId_status_idx" ON "CrmLead"("businessId", "status");

-- CrmClubMember
ALTER TABLE "CrmClubMember" ADD COLUMN "status_new" "CrmClubMemberStatus";
UPDATE "CrmClubMember" SET "status_new" = CASE trim("status")
  WHEN 'فعال' THEN 'active'::"CrmClubMemberStatus"
  WHEN 'غیرفعال' THEN 'inactive'::"CrmClubMemberStatus"
  WHEN 'معلق' THEN 'suspended'::"CrmClubMemberStatus"
  WHEN 'active' THEN 'active'::"CrmClubMemberStatus"
  WHEN 'inactive' THEN 'inactive'::"CrmClubMemberStatus"
  WHEN 'suspended' THEN 'suspended'::"CrmClubMemberStatus"
  ELSE 'active'::"CrmClubMemberStatus"
END;
ALTER TABLE "CrmClubMember" DROP COLUMN "status";
ALTER TABLE "CrmClubMember" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "CrmClubMember" ALTER COLUMN "status" SET DEFAULT 'active'::"CrmClubMemberStatus";
ALTER TABLE "CrmClubMember" ALTER COLUMN "status" SET NOT NULL;

-- BlogPost: حذف status تکراری
ALTER TABLE "BlogPost" DROP COLUMN IF EXISTS "status";