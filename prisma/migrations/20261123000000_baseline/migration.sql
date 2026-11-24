-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled', 'pending');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "BusinessPlan" AS ENUM ('trial', 'active');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "MoneyDocumentKind" AS ENUM ('receipt', 'payment');

-- CreateEnum
CREATE TYPE "CommerceDocumentKind" AS ENUM ('sale', 'sale_return', 'purchase', 'purchase_return', 'expense', 'waste', 'income');

-- CreateEnum
CREATE TYPE "PhoneDirectoryEntryKind" AS ENUM ('internal', 'linked_user', 'linked_person');

-- CreateEnum
CREATE TYPE "WarehouseVoucherType" AS ENUM ('issue', 'transfer', 'receipt');

-- CreateEnum
CREATE TYPE "FormulaRowKind" AS ENUM ('material', 'direct_labor', 'overhead');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee');

-- CreateEnum
CREATE TYPE "CheckDirection" AS ENUM ('receivable', 'payable');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('pending', 'cleared', 'bounced', 'endorsed', 'cancelled');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('draft', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'leave', 'remote', 'late');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'diagnosing', 'waiting_part', 'repairing', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('active', 'expired', 'void');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('running', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'in_review', 'quoted', 'closed');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "SystemRole" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "permissions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "mobilePhone" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "systemRoleId" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "avatarFileKey" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "mobilePhone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "roleSlug" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "displayName" TEXT,
    "mobilePhone" TEXT,
    "credentialMode" TEXT NOT NULL DEFAULT 'self',
    "presetUsername" TEXT,
    "presetPasswordHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "mobilePhone" TEXT NOT NULL,
    "displayName" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRestriction" (
    "userId" TEXT NOT NULL,
    "ownSalesOnly" BOOLEAN NOT NULL DEFAULT false,
    "ownPurchaseOnly" BOOLEAN NOT NULL DEFAULT false,
    "timeWindowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowedFrom" TEXT,
    "allowedTo" TEXT,

    CONSTRAINT "UserRestriction_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserBankAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserBankAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "BusinessPlan" NOT NULL DEFAULT 'trial',
    "expiresAt" TIMESTAMP(3),
    "creditLabel" TEXT NOT NULL DEFAULT 'نامحدود',
    "defaultLocale" TEXT NOT NULL DEFAULT 'fa',
    "status" "BusinessStatus" NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "businessId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL DEFAULT '',
    "tradeName" TEXT NOT NULL DEFAULT '',
    "nationalId" TEXT NOT NULL DEFAULT '',
    "economicCode" TEXT NOT NULL DEFAULT '',
    "regNo" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "fax" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "logoFileKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "FiscalYear" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProject" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "rateToRial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveAt" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'general',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fieldsJson" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PicklistItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PicklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "uploaderId" TEXT,
    "entityType" TEXT NOT NULL DEFAULT 'general',
    "entityId" TEXT,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "accountingCode" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'natural',
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("businessId","personId")
);

-- CreateTable
CREATE TABLE "BusinessPeopleMeta" (
    "businessId" TEXT NOT NULL,
    "personCategories" JSONB NOT NULL,
    "personGroups" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPeopleMeta_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "MoneyDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "MoneyDocumentKind" NOT NULL,
    "docDate" TEXT NOT NULL DEFAULT '',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareholderRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareholderRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sellPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseAccount" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "accountingCode" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'goods',
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("businessId","productId")
);

-- CreateTable
CREATE TABLE "BusinessCatalogMeta" (
    "businessId" TEXT NOT NULL,
    "productCategories" JSONB NOT NULL,
    "priceLists" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCatalogMeta_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "interest" TEXT NOT NULL DEFAULT '',
    "registeredDate" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'جدید',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmVisit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT '',
    "companions" INTEGER NOT NULL DEFAULT 0,
    "withDesigner" BOOLEAN NOT NULL DEFAULT false,
    "gender" TEXT NOT NULL DEFAULT 'female',
    "buyProbability" INTEGER NOT NULL DEFAULT 0,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL DEFAULT 'خنثی',
    "designerName" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOpportunity" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" TEXT,
    "personId" TEXT,
    "amount" DOUBLE PRECISION,
    "expectedClose" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmClubMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "personId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "source" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommerceDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "CommerceDocumentKind" NOT NULL,
    "docDate" TEXT NOT NULL DEFAULT '',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCommerceMeta" (
    "businessId" TEXT NOT NULL,
    "incomeTypes" JSONB NOT NULL,
    "installments" JSONB NOT NULL,
    "productDiscounts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCommerceMeta_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "WarehouseLocation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "manager" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseVoucher" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ثبت شده',
    "description" TEXT NOT NULL DEFAULT '',
    "type" "WarehouseVoucherType" NOT NULL DEFAULT 'issue',
    "warehouseReceiptStatus" TEXT NOT NULL DEFAULT 'pending',
    "sourceInvoiceNumber" TEXT NOT NULL DEFAULT '',
    "sourceWarehouseId" TEXT NOT NULL DEFAULT '',
    "destinationWarehouseId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseVoucherItem" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'عدد',

    CONSTRAINT "WarehouseVoucherItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakingSession" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StocktakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakingRow" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "systemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StocktakingRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL DEFAULT '',
    "customer" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'در انتظار تایید',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'new',
    "amount" TEXT NOT NULL DEFAULT '',
    "totalRial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingSchedule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNo" TEXT NOT NULL DEFAULT '',
    "customerName" TEXT NOT NULL DEFAULT '',
    "carrierName" TEXT NOT NULL DEFAULT '',
    "scheduledDate" TEXT NOT NULL DEFAULT '',
    "trackingCode" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'برنامه‌ریزی شده',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'تأمین کالا',
    "requester" TEXT NOT NULL DEFAULT '',
    "requesterId" TEXT,
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'در انتظار تایید',
    "priority" TEXT NOT NULL DEFAULT 'متوسط',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFormula" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "project" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productItemCode" TEXT NOT NULL DEFAULT '',
    "outputWarehouse" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFormulaRow" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "kind" "FormulaRowKind" NOT NULL DEFAULT 'material',
    "title" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'عدد',
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionFormulaRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "invoiceRef" TEXT NOT NULL DEFAULT '',
    "customer" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'در حال تولید',
    "deliveryDate" TEXT NOT NULL DEFAULT '',
    "qtyPlanned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qtyDone" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'باز',
    "formulaId" TEXT NOT NULL DEFAULT '',
    "productTitle" TEXT NOT NULL DEFAULT '',
    "outputWarehouse" TEXT NOT NULL DEFAULT '',
    "customer" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "cardNumber" TEXT NOT NULL DEFAULT '',
    "iban" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'تومان',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cashbox" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keeperName" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'تومان',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cashbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCash" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "holderName" TEXT NOT NULL DEFAULT '',
    "limitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PettyCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "cashboxId" TEXT,
    "pettyCashId" TEXT,
    "type" "BankTransactionType" NOT NULL DEFAULT 'deposit',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL DEFAULT '',
    "counterpartyName" TEXT NOT NULL DEFAULT '',
    "referenceNo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundTransfer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fromSource" TEXT NOT NULL,
    "toTarget" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL DEFAULT '',
    "referenceNo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "direction" "CheckDirection" NOT NULL DEFAULT 'receivable',
    "checkNo" TEXT NOT NULL,
    "sayadId" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "counterparty" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issueDate" TEXT NOT NULL DEFAULT '',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "status" "CheckStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'asset',
    "parentCode" TEXT NOT NULL DEFAULT '',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fiscalYearId" TEXT,
    "entryNo" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sourceModule" TEXT NOT NULL DEFAULT 'manual',
    "status" "JournalStatus" NOT NULL DEFAULT 'posted',
    "totalDebit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMeizitoWorkspaceMeta" (
    "businessId" TEXT NOT NULL,
    "activeBoardId" TEXT,
    "activeNoteBoardId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMeizitoWorkspaceMeta_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "WorkspaceBoard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberNames" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceColumn" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "cardIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceLabel" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',

    CONSTRAINT "WorkspaceLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceBoardMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT,
    "personId" TEXT,
    "displayName" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkspaceBoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceCard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "labelIds" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT '',
    "assignee" TEXT NOT NULL DEFAULT '',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "dueDate" TEXT NOT NULL DEFAULT '',
    "dueTime" TEXT NOT NULL DEFAULT '',
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "calendarId" TEXT,
    "calendarEventId" TEXT,
    "addToCalendar" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER,
    "assigneeUserId" TEXT,
    "endDueDate" TEXT NOT NULL DEFAULT '',
    "sourceChatMessageId" TEXT,
    "sourceChatThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteBoard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#e5e7eb',
    "order" INTEGER NOT NULL DEFAULT 0,
    "memberUserIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#fef08a',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "labelIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceDailyReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceFieldVisit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hasReferrer" BOOLEAN,
    "referrerName" TEXT,
    "referrerTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceFieldVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceProject" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberIds" JSONB NOT NULL DEFAULT '[]',
    "members" JSONB NOT NULL DEFAULT '[]',
    "boardId" TEXT,
    "phases" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLetter" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "labels" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'open',
    "box" TEXT NOT NULL DEFAULT 'inbox',
    "templateId" TEXT,
    "referredTo" JSONB NOT NULL DEFAULT '[]',
    "referredFrom" TEXT NOT NULL DEFAULT '',
    "authorUserId" TEXT NOT NULL DEFAULT '',
    "replyToLetterId" TEXT,
    "threadId" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "approvalState" TEXT,
    "currentAssigneeUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalLetterRecipient" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "letterId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientUserId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InternalLetterRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeizitoCalendar" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "kind" TEXT NOT NULL DEFAULT 'custom',
    "sharedWith" JSONB NOT NULL DEFAULT '[]',
    "ownerUserId" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeizitoCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeizitoCalendarEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "endDateKey" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT,
    "sourceCardId" TEXT,
    "notes" TEXT,
    "reminderMinutes" INTEGER,
    "endTime" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceUntil" TEXT,
    "seriesId" TEXT,
    "attendeeIds" JSONB NOT NULL DEFAULT '[]',
    "rsvp" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeizitoCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "threadType" TEXT NOT NULL DEFAULT 'direct',
    "participantNames" JSONB NOT NULL DEFAULT '[]',
    "participantIds" JSONB NOT NULL DEFAULT '[]',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "attachmentNames" JSONB NOT NULL DEFAULT '[]',
    "attachmentRefs" JSONB NOT NULL DEFAULT '[]',
    "voiceDurationSec" INTEGER,
    "imageDataUrl" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalWorkRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT '',
    "requestKind" TEXT NOT NULL DEFAULT 'admin',
    "hrSubtype" TEXT,
    "hrFormPayload" JSONB,
    "box" TEXT NOT NULL DEFAULT 'outbox',
    "authorUserId" TEXT NOT NULL DEFAULT '',
    "authorName" TEXT NOT NULL DEFAULT '',
    "referredToUserIds" JSONB NOT NULL DEFAULT '[]',
    "referredTo" JSONB NOT NULL DEFAULT '[]',
    "ccUserIds" JSONB NOT NULL DEFAULT '[]',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "threadId" TEXT,
    "replyToRequestId" TEXT,
    "sourceChatMessageId" TEXT,
    "approvalState" TEXT,
    "currentAssigneeUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalWorkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeizitoApprovalStep" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "comment" TEXT,
    "forwardedToIds" JSONB NOT NULL DEFAULT '[]',
    "forwardedToNames" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeizitoApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetterCategoryConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelFa" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetterCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneDirectoryGroup" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneDirectoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneDirectoryEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "groupId" TEXT,
    "entryKind" "PhoneDirectoryEntryKind" NOT NULL DEFAULT 'internal',
    "visibilityTags" JSONB NOT NULL DEFAULT '[]',
    "displayName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL DEFAULT '',
    "landline" TEXT NOT NULL DEFAULT '',
    "internalCode" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "extension" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "personId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneDirectoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrRequestType" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelFa" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'hr',
    "formSchema" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrEligibilityRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requestTypeId" TEXT,
    "hrSubtype" TEXT,
    "conditionJson" JSONB NOT NULL,
    "userMessageFa" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HrEligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgAssignment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerUserId" TEXT,
    "roleTitle" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelFile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formTemplateId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonnelFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeName" TEXT NOT NULL,
    "workDate" TEXT NOT NULL,
    "checkIn" TEXT NOT NULL DEFAULT '',
    "checkOut" TEXT NOT NULL DEFAULT '',
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriodSummary" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeName" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimePay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'در انتظار پرداخت',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriodSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructor" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'عمومی',
    "durationHours" INTEGER NOT NULL DEFAULT 0,
    "startDate" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT,
    "participantName" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'اینستاگرام',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "conversionsCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSurvey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'فعال',
    "questionsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "respondentName" TEXT NOT NULL DEFAULT '',
    "respondentPhone" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesNetworkMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'نماینده',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesNetworkMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCommission" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "salesAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'در انتظار تسویه',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "warrantyNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "status" "WarrantyStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AfterSalesTicket" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "warrantyId" TEXT,
    "ticketNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" "TicketPriority" NOT NULL DEFAULT 'normal',
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "technician" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AfterSalesTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairEstimate" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL,
    "conditionsJson" JSONB NOT NULL DEFAULT '[]',
    "actionsJson" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleName" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'success',
    "summary" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'عمومی',
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "approverRoleKey" TEXT NOT NULL DEFAULT 'manager',
    "slaHours" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT NOT NULL DEFAULT 'general',
    "entityId" TEXT NOT NULL DEFAULT '',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'running',
    "initiatedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inquiryNo" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterPhone" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'تلفن',
    "category" TEXT NOT NULL DEFAULT 'استعلام قیمت',
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignedTo" TEXT NOT NULL DEFAULT '',
    "status" "InquiryStatus" NOT NULL DEFAULT 'new',
    "responseNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "businessId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL DEFAULT 'فروشگاه نکسا',
    "currency" TEXT NOT NULL DEFAULT 'تومان',
    "shippingNote" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "seoKeywords" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'عمومی',
    "price" TEXT NOT NULL DEFAULT '0',
    "priceNum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" TEXT NOT NULL DEFAULT '0',
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "seo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageKey" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL DEFAULT '',
    "customer" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "shippingAddress" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "total" TEXT NOT NULL DEFAULT '0',
    "totalNum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'در انتظار پردازش',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeProductId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogSettings" (
    "businessId" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL DEFAULT 'بلاگ نکساپوینت',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogSettings_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "coverImageKey" TEXT,
    "author" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'منتشر شده',
    "publishState" "PublishStatus" NOT NULL DEFAULT 'published',
    "categoryName" TEXT NOT NULL DEFAULT 'عمومی',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "postId" TEXT,
    "user" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "postTitle" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'در انتظار تایید',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemRole_slug_key" ON "SystemRole"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobilePhone_key" ON "User"("mobilePhone");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_mobilePhone_createdAt_idx" ON "OtpChallenge"("mobilePhone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessRequest_mobilePhone_status_idx" ON "AccessRequest"("mobilePhone", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");

-- CreateIndex
CREATE INDEX "UserBankAccess_userId_idx" ON "UserBankAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBankAccess_userId_bankCode_key" ON "UserBankAccess"("userId", "bankCode");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE INDEX "Business_createdById_idx" ON "Business"("createdById");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");

-- CreateIndex
CREATE INDEX "FiscalYear_businessId_idx" ON "FiscalYear"("businessId");

-- CreateIndex
CREATE INDEX "BusinessProject_businessId_idx" ON "BusinessProject"("businessId");

-- CreateIndex
CREATE INDEX "ExchangeRate_businessId_idx" ON "ExchangeRate"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_businessId_code_key" ON "ExchangeRate"("businessId", "code");

-- CreateIndex
CREATE INDEX "FormTemplate_businessId_module_idx" ON "FormTemplate"("businessId", "module");

-- CreateIndex
CREATE INDEX "NotificationRule_businessId_idx" ON "NotificationRule"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_businessId_eventKey_key" ON "NotificationRule"("businessId", "eventKey");

-- CreateIndex
CREATE INDEX "PicklistItem_businessId_groupKey_idx" ON "PicklistItem"("businessId", "groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_fileKey_key" ON "Attachment"("fileKey");

-- CreateIndex
CREATE INDEX "Attachment_businessId_entityType_entityId_idx" ON "Attachment"("businessId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Person_businessId_idx" ON "Person"("businessId");

-- CreateIndex
CREATE INDEX "Person_businessId_status_idx" ON "Person"("businessId", "status");

-- CreateIndex
CREATE INDEX "MoneyDocument_businessId_kind_idx" ON "MoneyDocument"("businessId", "kind");

-- CreateIndex
CREATE INDEX "ShareholderRecord_businessId_idx" ON "ShareholderRecord"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareholderRecord_businessId_personId_key" ON "ShareholderRecord"("businessId", "personId");

-- CreateIndex
CREATE INDEX "VendorRecord_businessId_idx" ON "VendorRecord"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRecord_businessId_personId_key" ON "VendorRecord"("businessId", "personId");

-- CreateIndex
CREATE INDEX "CatalogProduct_businessId_idx" ON "CatalogProduct"("businessId");

-- CreateIndex
CREATE INDEX "CatalogProduct_businessId_status_idx" ON "CatalogProduct"("businessId", "status");

-- CreateIndex
CREATE INDEX "CrmLead_businessId_idx" ON "CrmLead"("businessId");

-- CreateIndex
CREATE INDEX "CrmVisit_businessId_idx" ON "CrmVisit"("businessId");

-- CreateIndex
CREATE INDEX "CrmPipelineStage_businessId_idx" ON "CrmPipelineStage"("businessId");

-- CreateIndex
CREATE INDEX "CrmOpportunity_businessId_idx" ON "CrmOpportunity"("businessId");

-- CreateIndex
CREATE INDEX "CrmOpportunity_stageId_idx" ON "CrmOpportunity"("stageId");

-- CreateIndex
CREATE INDEX "CrmClubMember_businessId_idx" ON "CrmClubMember"("businessId");

-- CreateIndex
CREATE INDEX "CommerceDocument_businessId_kind_idx" ON "CommerceDocument"("businessId", "kind");

-- CreateIndex
CREATE INDEX "WarehouseLocation_businessId_idx" ON "WarehouseLocation"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseLocation_businessId_code_key" ON "WarehouseLocation"("businessId", "code");

-- CreateIndex
CREATE INDEX "WarehouseItem_businessId_idx" ON "WarehouseItem"("businessId");

-- CreateIndex
CREATE INDEX "WarehouseVoucher_businessId_type_idx" ON "WarehouseVoucher"("businessId", "type");

-- CreateIndex
CREATE INDEX "WarehouseVoucherItem_voucherId_idx" ON "WarehouseVoucherItem"("voucherId");

-- CreateIndex
CREATE INDEX "StocktakingSession_businessId_idx" ON "StocktakingSession"("businessId");

-- CreateIndex
CREATE INDEX "StocktakingRow_sessionId_idx" ON "StocktakingRow"("sessionId");

-- CreateIndex
CREATE INDEX "CustomerOrder_businessId_type_idx" ON "CustomerOrder"("businessId", "type");

-- CreateIndex
CREATE INDEX "ShippingSchedule_businessId_idx" ON "ShippingSchedule"("businessId");

-- CreateIndex
CREATE INDEX "ProcurementRequest_businessId_status_idx" ON "ProcurementRequest"("businessId", "status");

-- CreateIndex
CREATE INDEX "ProductionFormula_businessId_idx" ON "ProductionFormula"("businessId");

-- CreateIndex
CREATE INDEX "ProductionFormulaRow_formulaId_kind_idx" ON "ProductionFormulaRow"("formulaId", "kind");

-- CreateIndex
CREATE INDEX "ProductionOrder_businessId_status_idx" ON "ProductionOrder"("businessId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_businessId_status_idx" ON "WorkOrder"("businessId", "status");

-- CreateIndex
CREATE INDEX "BankAccount_businessId_idx" ON "BankAccount"("businessId");

-- CreateIndex
CREATE INDEX "Cashbox_businessId_idx" ON "Cashbox"("businessId");

-- CreateIndex
CREATE INDEX "PettyCash_businessId_idx" ON "PettyCash"("businessId");

-- CreateIndex
CREATE INDEX "BankTransaction_businessId_type_idx" ON "BankTransaction"("businessId", "type");

-- CreateIndex
CREATE INDEX "FundTransfer_businessId_idx" ON "FundTransfer"("businessId");

-- CreateIndex
CREATE INDEX "CheckItem_businessId_direction_status_idx" ON "CheckItem"("businessId", "direction", "status");

-- CreateIndex
CREATE INDEX "AccountingAccount_businessId_type_idx" ON "AccountingAccount"("businessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_businessId_code_key" ON "AccountingAccount"("businessId", "code");

-- CreateIndex
CREATE INDEX "JournalEntry_businessId_status_idx" ON "JournalEntry"("businessId", "status");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "WorkspaceBoard_businessId_idx" ON "WorkspaceBoard"("businessId");

-- CreateIndex
CREATE INDEX "WorkspaceColumn_businessId_boardId_idx" ON "WorkspaceColumn"("businessId", "boardId");

-- CreateIndex
CREATE INDEX "WorkspaceLabel_businessId_boardId_idx" ON "WorkspaceLabel"("businessId", "boardId");

-- CreateIndex
CREATE INDEX "WorkspaceBoardMember_businessId_boardId_idx" ON "WorkspaceBoardMember"("businessId", "boardId");

-- CreateIndex
CREATE INDEX "WorkspaceCard_businessId_boardId_idx" ON "WorkspaceCard"("businessId", "boardId");

-- CreateIndex
CREATE INDEX "WorkspaceCard_businessId_columnId_idx" ON "WorkspaceCard"("businessId", "columnId");

-- CreateIndex
CREATE INDEX "WorkspaceCard_businessId_sourceChatMessageId_idx" ON "WorkspaceCard"("businessId", "sourceChatMessageId");

-- CreateIndex
CREATE INDEX "NoteBoard_businessId_idx" ON "NoteBoard"("businessId");

-- CreateIndex
CREATE INDEX "WorkspaceNote_businessId_boardId_idx" ON "WorkspaceNote"("businessId", "boardId");

-- CreateIndex
CREATE INDEX "WorkspaceDailyReport_businessId_idx" ON "WorkspaceDailyReport"("businessId");

-- CreateIndex
CREATE INDEX "WorkspaceFieldVisit_businessId_idx" ON "WorkspaceFieldVisit"("businessId");

-- CreateIndex
CREATE INDEX "WorkspaceProject_businessId_idx" ON "WorkspaceProject"("businessId");

-- CreateIndex
CREATE INDEX "InternalLetter_businessId_box_idx" ON "InternalLetter"("businessId", "box");

-- CreateIndex
CREATE INDEX "InternalLetter_businessId_threadId_idx" ON "InternalLetter"("businessId", "threadId");

-- CreateIndex
CREATE INDEX "InternalLetterRecipient_businessId_letterId_idx" ON "InternalLetterRecipient"("businessId", "letterId");

-- CreateIndex
CREATE INDEX "MeizitoCalendar_businessId_idx" ON "MeizitoCalendar"("businessId");

-- CreateIndex
CREATE INDEX "MeizitoCalendarEvent_businessId_calendarId_idx" ON "MeizitoCalendarEvent"("businessId", "calendarId");

-- CreateIndex
CREATE INDEX "MeizitoCalendarEvent_businessId_dateKey_idx" ON "MeizitoCalendarEvent"("businessId", "dateKey");

-- CreateIndex
CREATE INDEX "MeizitoCalendarEvent_businessId_endDateKey_idx" ON "MeizitoCalendarEvent"("businessId", "endDateKey");

-- CreateIndex
CREATE INDEX "ChatThread_businessId_idx" ON "ChatThread"("businessId");

-- CreateIndex
CREATE INDEX "ChatMessage_businessId_threadId_idx" ON "ChatMessage"("businessId", "threadId");

-- CreateIndex
CREATE INDEX "InternalWorkRequest_businessId_status_idx" ON "InternalWorkRequest"("businessId", "status");

-- CreateIndex
CREATE INDEX "InternalWorkRequest_businessId_box_idx" ON "InternalWorkRequest"("businessId", "box");

-- CreateIndex
CREATE INDEX "MeizitoApprovalStep_businessId_entityType_entityId_idx" ON "MeizitoApprovalStep"("businessId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "LetterCategoryConfig_businessId_idx" ON "LetterCategoryConfig"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "LetterCategoryConfig_businessId_slug_key" ON "LetterCategoryConfig"("businessId", "slug");

-- CreateIndex
CREATE INDEX "PhoneDirectoryGroup_businessId_idx" ON "PhoneDirectoryGroup"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneDirectoryGroup_businessId_slug_key" ON "PhoneDirectoryGroup"("businessId", "slug");

-- CreateIndex
CREATE INDEX "PhoneDirectoryEntry_businessId_idx" ON "PhoneDirectoryEntry"("businessId");

-- CreateIndex
CREATE INDEX "PhoneDirectoryEntry_businessId_department_idx" ON "PhoneDirectoryEntry"("businessId", "department");

-- CreateIndex
CREATE INDEX "PhoneDirectoryEntry_groupId_idx" ON "PhoneDirectoryEntry"("groupId");

-- CreateIndex
CREATE INDEX "HrRequestType_businessId_idx" ON "HrRequestType"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "HrRequestType_businessId_slug_key" ON "HrRequestType"("businessId", "slug");

-- CreateIndex
CREATE INDEX "HrEligibilityRule_businessId_idx" ON "HrEligibilityRule"("businessId");

-- CreateIndex
CREATE INDEX "HrEligibilityRule_businessId_hrSubtype_idx" ON "HrEligibilityRule"("businessId", "hrSubtype");

-- CreateIndex
CREATE INDEX "OrgUnit_businessId_idx" ON "OrgUnit"("businessId");

-- CreateIndex
CREATE INDEX "OrgAssignment_businessId_unitId_idx" ON "OrgAssignment"("businessId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgAssignment_businessId_userId_key" ON "OrgAssignment"("businessId", "userId");

-- CreateIndex
CREATE INDEX "PersonnelFile_businessId_idx" ON "PersonnelFile"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelFile_businessId_userId_key" ON "PersonnelFile"("businessId", "userId");

-- CreateIndex
CREATE INDEX "AttendanceLog_businessId_workDate_idx" ON "AttendanceLog"("businessId", "workDate");

-- CreateIndex
CREATE INDEX "PayrollPeriodSummary_businessId_periodLabel_idx" ON "PayrollPeriodSummary"("businessId", "periodLabel");

-- CreateIndex
CREATE INDEX "TrainingCourse_businessId_idx" ON "TrainingCourse"("businessId");

-- CreateIndex
CREATE INDEX "TrainingEnrollment_courseId_idx" ON "TrainingEnrollment"("courseId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_businessId_status_idx" ON "MarketingCampaign"("businessId", "status");

-- CreateIndex
CREATE INDEX "MarketingSurvey_businessId_idx" ON "MarketingSurvey"("businessId");

-- CreateIndex
CREATE INDEX "SurveyResponse_surveyId_idx" ON "SurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "SalesNetworkMember_businessId_idx" ON "SalesNetworkMember"("businessId");

-- CreateIndex
CREATE INDEX "SalesCommission_businessId_memberId_idx" ON "SalesCommission"("businessId", "memberId");

-- CreateIndex
CREATE INDEX "WarrantyRecord_businessId_status_idx" ON "WarrantyRecord"("businessId", "status");

-- CreateIndex
CREATE INDEX "AfterSalesTicket_businessId_status_idx" ON "AfterSalesTicket"("businessId", "status");

-- CreateIndex
CREATE INDEX "RepairEstimate_ticketId_idx" ON "RepairEstimate"("ticketId");

-- CreateIndex
CREATE INDEX "AutomationRule_businessId_active_idx" ON "AutomationRule"("businessId", "active");

-- CreateIndex
CREATE INDEX "AutomationLog_businessId_executedAt_idx" ON "AutomationLog"("businessId", "executedAt");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_businessId_idx" ON "WorkflowDefinition"("businessId");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_stepOrder_idx" ON "WorkflowStep"("workflowId", "stepOrder");

-- CreateIndex
CREATE INDEX "WorkflowRun_businessId_status_idx" ON "WorkflowRun"("businessId", "status");

-- CreateIndex
CREATE INDEX "InquiryRecord_businessId_status_idx" ON "InquiryRecord"("businessId", "status");

-- CreateIndex
CREATE INDEX "StoreProduct_businessId_status_idx" ON "StoreProduct"("businessId", "status");

-- CreateIndex
CREATE INDEX "StoreOrder_businessId_status_idx" ON "StoreOrder"("businessId", "status");

-- CreateIndex
CREATE INDEX "StoreOrderItem_orderId_idx" ON "StoreOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "BlogCategory_businessId_idx" ON "BlogCategory"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_businessId_slug_key" ON "BlogCategory"("businessId", "slug");

-- CreateIndex
CREATE INDEX "BlogPost_businessId_publishState_idx" ON "BlogPost"("businessId", "publishState");

-- CreateIndex
CREATE INDEX "BlogComment_businessId_status_idx" ON "BlogComment"("businessId", "status");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_businessId_idx" ON "NewsletterSubscriber"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_businessId_email_key" ON "NewsletterSubscriber"("businessId", "email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_systemRoleId_fkey" FOREIGN KEY ("systemRoleId") REFERENCES "SystemRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRestriction" ADD CONSTRAINT "UserRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBankAccess" ADD CONSTRAINT "UserBankAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalYear" ADD CONSTRAINT "FiscalYear_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProject" ADD CONSTRAINT "BusinessProject_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PicklistItem" ADD CONSTRAINT "PicklistItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPeopleMeta" ADD CONSTRAINT "BusinessPeopleMeta_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyDocument" ADD CONSTRAINT "MoneyDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareholderRecord" ADD CONSTRAINT "ShareholderRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRecord" ADD CONSTRAINT "VendorRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCatalogMeta" ADD CONSTRAINT "BusinessCatalogMeta_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmLead" ADD CONSTRAINT "CrmLead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmVisit" ADD CONSTRAINT "CrmVisit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CrmPipelineStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmClubMember" ADD CONSTRAINT "CrmClubMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceDocument" ADD CONSTRAINT "CommerceDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCommerceMeta" ADD CONSTRAINT "BusinessCommerceMeta_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseLocation" ADD CONSTRAINT "WarehouseLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseVoucher" ADD CONSTRAINT "WarehouseVoucher_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseVoucherItem" ADD CONSTRAINT "WarehouseVoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "WarehouseVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakingSession" ADD CONSTRAINT "StocktakingSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakingRow" ADD CONSTRAINT "StocktakingRow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StocktakingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingSchedule" ADD CONSTRAINT "ShippingSchedule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingSchedule" ADD CONSTRAINT "ShippingSchedule_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFormula" ADD CONSTRAINT "ProductionFormula_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFormulaRow" ADD CONSTRAINT "ProductionFormulaRow_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "ProductionFormula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashbox" ADD CONSTRAINT "Cashbox_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCash" ADD CONSTRAINT "PettyCash_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "Cashbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_pettyCashId_fkey" FOREIGN KEY ("pettyCashId") REFERENCES "PettyCash"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundTransfer" ADD CONSTRAINT "FundTransfer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckItem" ADD CONSTRAINT "CheckItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckItem" ADD CONSTRAINT "CheckItem_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMeizitoWorkspaceMeta" ADD CONSTRAINT "BusinessMeizitoWorkspaceMeta_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBoard" ADD CONSTRAINT "WorkspaceBoard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceColumn" ADD CONSTRAINT "WorkspaceColumn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceColumn" ADD CONSTRAINT "WorkspaceColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "WorkspaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLabel" ADD CONSTRAINT "WorkspaceLabel_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLabel" ADD CONSTRAINT "WorkspaceLabel_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "WorkspaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBoardMember" ADD CONSTRAINT "WorkspaceBoardMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBoardMember" ADD CONSTRAINT "WorkspaceBoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "WorkspaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCard" ADD CONSTRAINT "WorkspaceCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCard" ADD CONSTRAINT "WorkspaceCard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "WorkspaceBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteBoard" ADD CONSTRAINT "NoteBoard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceNote" ADD CONSTRAINT "WorkspaceNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceNote" ADD CONSTRAINT "WorkspaceNote_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "NoteBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDailyReport" ADD CONSTRAINT "WorkspaceDailyReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFieldVisit" ADD CONSTRAINT "WorkspaceFieldVisit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceProject" ADD CONSTRAINT "WorkspaceProject_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLetter" ADD CONSTRAINT "InternalLetter_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalLetterRecipient" ADD CONSTRAINT "InternalLetterRecipient_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "InternalLetter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeizitoCalendar" ADD CONSTRAINT "MeizitoCalendar_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeizitoCalendarEvent" ADD CONSTRAINT "MeizitoCalendarEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeizitoCalendarEvent" ADD CONSTRAINT "MeizitoCalendarEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "MeizitoCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalWorkRequest" ADD CONSTRAINT "InternalWorkRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeizitoApprovalStep" ADD CONSTRAINT "MeizitoApprovalStep_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetterCategoryConfig" ADD CONSTRAINT "LetterCategoryConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneDirectoryGroup" ADD CONSTRAINT "PhoneDirectoryGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneDirectoryEntry" ADD CONSTRAINT "PhoneDirectoryEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneDirectoryEntry" ADD CONSTRAINT "PhoneDirectoryEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PhoneDirectoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrRequestType" ADD CONSTRAINT "HrRequestType_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEligibilityRule" ADD CONSTRAINT "HrEligibilityRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrEligibilityRule" ADD CONSTRAINT "HrEligibilityRule_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "HrRequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgAssignment" ADD CONSTRAINT "OrgAssignment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgAssignment" ADD CONSTRAINT "OrgAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelFile" ADD CONSTRAINT "PersonnelFile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriodSummary" ADD CONSTRAINT "PayrollPeriodSummary_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCourse" ADD CONSTRAINT "TrainingCourse_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSurvey" ADD CONSTRAINT "MarketingSurvey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "MarketingSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesNetworkMember" ADD CONSTRAINT "SalesNetworkMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCommission" ADD CONSTRAINT "SalesCommission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCommission" ADD CONSTRAINT "SalesCommission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "SalesNetworkMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyRecord" ADD CONSTRAINT "WarrantyRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfterSalesTicket" ADD CONSTRAINT "AfterSalesTicket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AfterSalesTicket" ADD CONSTRAINT "AfterSalesTicket_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "WarrantyRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairEstimate" ADD CONSTRAINT "RepairEstimate_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AfterSalesTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryRecord" ADD CONSTRAINT "InquiryRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrder" ADD CONSTRAINT "StoreOrder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "StoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogSettings" ADD CONSTRAINT "BlogSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

