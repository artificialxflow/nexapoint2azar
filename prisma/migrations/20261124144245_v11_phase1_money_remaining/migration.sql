/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `CommerceDocument` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `amount` on the `CrmOpportunity` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `totalRial` on the `CustomerOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `estimatedValue` on the `InquiryRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `budget` on the `MarketingCampaign` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `spent` on the `MarketingCampaign` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `totalAmount` on the `MoneyDocument` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `baseSalary` on the `PayrollPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `overtimePay` on the `PayrollPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `bonuses` on the `PayrollPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `deductions` on the `PayrollPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `netPay` on the `PayrollPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `qty` on the `ProductionFormulaRow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `amount` on the `ProductionFormulaRow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `qtyPlanned` on the `ProductionOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `qtyDone` on the `ProductionOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `laborCost` on the `RepairEstimate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `partsCost` on the `RepairEstimate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `totalCost` on the `RepairEstimate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `salesAmount` on the `SalesCommission` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `commissionAmount` on the `SalesCommission` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `commissionRate` on the `SalesNetworkMember` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `totalSales` on the `SalesNetworkMember` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `percent` on the `ShareholderRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `systemQty` on the `StocktakingRow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `countedQty` on the `StocktakingRow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `totalNum` on the `StoreOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `unitPrice` on the `StoreOrderItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `lineTotal` on the `StoreOrderItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `priceNum` on the `StoreProduct` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `score` on the `TrainingEnrollment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `sellPercent` on the `VendorRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `refundPercent` on the `VendorRecord` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `requestedQty` on the `WarehouseVoucherItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `availableQty` on the `WarehouseVoucherItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.
  - You are about to alter the column `quantity` on the `WarehouseVoucherItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,3)`.

*/
-- AlterTable
ALTER TABLE "CommerceDocument" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "CrmOpportunity" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "CustomerOrder" ALTER COLUMN "totalRial" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "InquiryRecord" ALTER COLUMN "estimatedValue" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "MarketingCampaign" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "spent" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "MoneyDocument" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "PayrollPeriodSummary" ALTER COLUMN "baseSalary" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "overtimePay" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "bonuses" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "deductions" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "netPay" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "ProductionFormulaRow" ALTER COLUMN "qty" SET DATA TYPE DECIMAL(20,3),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "ProductionOrder" ALTER COLUMN "qtyPlanned" SET DATA TYPE DECIMAL(20,3),
ALTER COLUMN "qtyDone" SET DATA TYPE DECIMAL(20,3);

-- AlterTable
ALTER TABLE "RepairEstimate" ALTER COLUMN "laborCost" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "partsCost" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "SalesCommission" ALTER COLUMN "salesAmount" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "commissionAmount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "SalesNetworkMember" ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "totalSales" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "ShareholderRecord" ALTER COLUMN "percent" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "StocktakingRow" ALTER COLUMN "systemQty" SET DATA TYPE DECIMAL(20,3),
ALTER COLUMN "countedQty" SET DATA TYPE DECIMAL(20,3);

-- AlterTable
ALTER TABLE "StoreOrder" ALTER COLUMN "totalNum" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "StoreOrderItem" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "lineTotal" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "StoreProduct" ALTER COLUMN "priceNum" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "TrainingEnrollment" ALTER COLUMN "score" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "VendorRecord" ALTER COLUMN "sellPercent" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "refundPercent" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "WarehouseVoucherItem" ALTER COLUMN "requestedQty" SET DATA TYPE DECIMAL(20,3),
ALTER COLUMN "availableQty" SET DATA TYPE DECIMAL(20,3),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(20,3);
