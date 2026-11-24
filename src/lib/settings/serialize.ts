import type { BusinessProfile as BusinessProfileRow, BusinessProject, FiscalYear } from '@prisma/client';
import type { BusinessProfile as BusinessProfileDto, FiscalYearSettings } from '@/src/types/settings';
import { attachmentUrlFromFileKey } from '@/src/lib/media/attachment-url';

export function serializeProfile(row: BusinessProfileRow): BusinessProfileDto {
  const logoFileKey = row.logoFileKey?.trim() || null;
  return {
    legalName: row.legalName,
    tradeName: row.tradeName,
    nationalId: row.nationalId,
    economicCode: row.economicCode,
    regNo: row.regNo,
    phone: row.phone,
    fax: row.fax,
    address: row.address,
    postalCode: row.postalCode,
    city: row.city,
    website: row.website,
    email: row.email,
    logoFileKey,
    logoUrl: attachmentUrlFromFileKey(logoFileKey),
  };
}

export function serializeProject(row: BusinessProject) {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    active: row.active,
  };
}

export function serializeFiscalYear(row: FiscalYear): FiscalYearSettings & { id: string; isActive: boolean } {
  return {
    id: row.id,
    label: row.label,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
  };
}
