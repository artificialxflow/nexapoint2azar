import type {
  CrmClubMemberStatus,
  CrmLeadStatus,
  CustomerOrderStatus,
  ProductionOrderStatus,
  StoreOrderStatus,
  WarehouseVoucherStatus,
} from '@prisma/client';
import {
  CrmClubMemberStatus as ClubEnum,
  CrmLeadStatus as LeadEnum,
  CustomerOrderStatus as CustomerOrderEnum,
  ProductionOrderStatus as ProductionOrderEnum,
  StoreOrderStatus as StoreOrderEnum,
  WarehouseVoucherStatus as WarehouseVoucherEnum,
} from '@prisma/client';

export const CUSTOMER_ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  pending_approval: 'در انتظار تایید',
  confirmed: 'تایید شده',
  in_production: 'در حال تولید',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
};

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  pending_approval: 'در انتظار تایید',
  in_production: 'در حال تولید',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
};

export const STORE_ORDER_STATUS_LABELS: Record<StoreOrderStatus, string> = {
  pending_processing: 'در انتظار پردازش',
  processing: 'در حال پردازش',
  shipped: 'ارسال شده',
  completed: 'تکمیل شده',
  cancelled: 'لغو شده',
};

export const WAREHOUSE_VOUCHER_STATUS_LABELS: Record<WarehouseVoucherStatus, string> = {
  draft: 'پیش‌نویس',
  posted: 'ثبت شده',
  cancelled: 'لغو شده',
};

export const CRM_LEAD_STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'جدید',
  in_progress: 'در حال پیگیری',
  contact_failed: 'تماس ناموفق',
  converted: 'تبدیل‌شده',
};

export const CRM_CLUB_STATUS_LABELS: Record<CrmClubMemberStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  suspended: 'معلق',
};

const CUSTOMER_ORDER_ALIASES: Record<string, CustomerOrderStatus> = {
  'در انتظار تایید': CustomerOrderEnum.pending_approval,
  pending_approval: CustomerOrderEnum.pending_approval,
  confirmed: CustomerOrderEnum.confirmed,
  'در حال تولید': CustomerOrderEnum.in_production,
  in_production: CustomerOrderEnum.in_production,
  completed: CustomerOrderEnum.completed,
  'تکمیل شده': CustomerOrderEnum.completed,
  cancelled: CustomerOrderEnum.cancelled,
};

const PRODUCTION_ORDER_ALIASES: Record<string, ProductionOrderStatus> = {
  'در انتظار تایید': ProductionOrderEnum.pending_approval,
  pending_approval: ProductionOrderEnum.pending_approval,
  'در حال تولید': ProductionOrderEnum.in_production,
  in_production: ProductionOrderEnum.in_production,
  completed: ProductionOrderEnum.completed,
  'تکمیل شده': ProductionOrderEnum.completed,
  cancelled: ProductionOrderEnum.cancelled,
};

const STORE_ORDER_ALIASES: Record<string, StoreOrderStatus> = {
  'در انتظار پردازش': StoreOrderEnum.pending_processing,
  pending_processing: StoreOrderEnum.pending_processing,
  processing: StoreOrderEnum.processing,
  shipped: StoreOrderEnum.shipped,
  completed: StoreOrderEnum.completed,
  cancelled: StoreOrderEnum.cancelled,
};

const WAREHOUSE_VOUCHER_ALIASES: Record<string, WarehouseVoucherStatus> = {
  'ثبت شده': WarehouseVoucherEnum.posted,
  posted: WarehouseVoucherEnum.posted,
  draft: WarehouseVoucherEnum.draft,
  cancelled: WarehouseVoucherEnum.cancelled,
};

const CRM_LEAD_ALIASES: Record<string, CrmLeadStatus> = {
  جدید: LeadEnum.new,
  new: LeadEnum.new,
  'در حال پیگیری': LeadEnum.in_progress,
  in_progress: LeadEnum.in_progress,
  'تماس ناموفق': LeadEnum.contact_failed,
  contact_failed: LeadEnum.contact_failed,
  'تبدیل‌شده': LeadEnum.converted,
  converted: LeadEnum.converted,
};

const CRM_CLUB_ALIASES: Record<string, CrmClubMemberStatus> = {
  فعال: ClubEnum.active,
  active: ClubEnum.active,
  غیرفعال: ClubEnum.inactive,
  inactive: ClubEnum.inactive,
  معلق: ClubEnum.suspended,
  suspended: ClubEnum.suspended,
};

export function parseCustomerOrderStatus(raw: string | undefined): CustomerOrderStatus {
  const key = (raw ?? '').trim();
  return CUSTOMER_ORDER_ALIASES[key] ?? CustomerOrderEnum.pending_approval;
}

export function parseProductionOrderStatus(raw: string | undefined): ProductionOrderStatus {
  const key = (raw ?? '').trim();
  return PRODUCTION_ORDER_ALIASES[key] ?? ProductionOrderEnum.in_production;
}

export function parseStoreOrderStatus(raw: string | undefined): StoreOrderStatus {
  const key = (raw ?? '').trim();
  return STORE_ORDER_ALIASES[key] ?? StoreOrderEnum.pending_processing;
}

export function parseWarehouseVoucherStatus(raw: string | undefined): WarehouseVoucherStatus {
  const key = (raw ?? '').trim();
  return WAREHOUSE_VOUCHER_ALIASES[key] ?? WarehouseVoucherEnum.posted;
}

export function parseCrmLeadStatus(raw: string | undefined): CrmLeadStatus {
  const key = (raw ?? '').trim();
  return CRM_LEAD_ALIASES[key] ?? LeadEnum.new;
}

export function parseCrmClubMemberStatus(raw: string | undefined): CrmClubMemberStatus {
  const key = (raw ?? '').trim();
  return CRM_CLUB_ALIASES[key] ?? ClubEnum.active;
}

export function labelCustomerOrderStatus(status: CustomerOrderStatus): string {
  return CUSTOMER_ORDER_STATUS_LABELS[status];
}

export function labelProductionOrderStatus(status: ProductionOrderStatus): string {
  return PRODUCTION_ORDER_STATUS_LABELS[status];
}

export function labelStoreOrderStatus(status: StoreOrderStatus): string {
  return STORE_ORDER_STATUS_LABELS[status];
}

export function labelWarehouseVoucherStatus(status: WarehouseVoucherStatus): string {
  return WAREHOUSE_VOUCHER_STATUS_LABELS[status];
}

export function labelCrmLeadStatus(status: CrmLeadStatus): string {
  return CRM_LEAD_STATUS_LABELS[status];
}

export function labelCrmClubMemberStatus(status: CrmClubMemberStatus): string {
  return CRM_CLUB_STATUS_LABELS[status];
}