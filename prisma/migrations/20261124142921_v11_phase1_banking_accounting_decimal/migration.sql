/*
  Warnings:

  - You are about to alter the column `balance` on the `AccountingAccount` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `openingBalance` on the `BankAccount` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `balance` on the `BankAccount` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `amount` on the `BankTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `balance` on the `Cashbox` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `amount` on the `CheckItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `rateToRial` on the `ExchangeRate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `amount` on the `FundTransfer` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `fee` on the `FundTransfer` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `totalDebit` on the `JournalEntry` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `totalCredit` on the `JournalEntry` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `debit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `credit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `limitAmount` on the `PettyCash` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.
  - You are about to alter the column `balance` on the `PettyCash` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,0)`.

*/
-- AlterTable
ALTER TABLE "AccountingAccount" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "BankAccount" ALTER COLUMN "openingBalance" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "BankTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "Cashbox" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "CheckItem" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "ExchangeRate" ALTER COLUMN "rateToRial" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "FundTransfer" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "fee" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "totalDebit" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "totalCredit" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "JournalLine" ALTER COLUMN "debit" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "credit" SET DATA TYPE DECIMAL(20,0);

-- AlterTable
ALTER TABLE "PettyCash" ALTER COLUMN "limitAmount" SET DATA TYPE DECIMAL(20,0),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,0);
