import { Prisma } from '@prisma/client';

export function moneyFromNumber(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(Math.round(value));
}

export function moneyToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return value.toNumber();
}

/** Journals must balance to the riyal */
export function moneyBalancesEqual(a: number, b: number): boolean {
  return Math.round(a) === Math.round(b);
}

export function rateFromNumber(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export function rateToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  return moneyToNumber(value);
}

/** Physical qty — up to 3 decimal places */
export function qtyFromNumber(value: number): Prisma.Decimal {
  if (!Number.isFinite(value)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

export function qtyToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  return moneyToNumber(value);
}