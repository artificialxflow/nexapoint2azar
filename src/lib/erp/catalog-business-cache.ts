import type {
  MoneyDocument,
  Person,
  PersonCategory,
  PersonGroup,
  PriceList,
  ShareholderRecord,
  VendorRecord,
} from '@/src/types/person';
import type { Product, ProductCategory } from '@/src/types/product';

export type CatalogLoadFlags = {
  people: boolean;
  catalog: boolean;
  peopleModule: boolean;
};

export type CatalogBusinessSnapshot = {
  people: Person[];
  products: Product[];
  receipts: MoneyDocument[];
  payments: MoneyDocument[];
  shareholders: ShareholderRecord[];
  vendors: VendorRecord[];
  priceLists: PriceList[];
  personCategories: PersonCategory[];
  productCategories: ProductCategory[];
  personGroups: PersonGroup[];
  peopleModuleHydrated: boolean;
  flags: CatalogLoadFlags;
};

const cache = new Map<string, CatalogBusinessSnapshot>();

export function readCatalogBusinessCache(businessId: string): CatalogBusinessSnapshot | null {
  return cache.get(businessId) ?? null;
}

export function writeCatalogBusinessCache(businessId: string, snapshot: CatalogBusinessSnapshot): void {
  cache.set(businessId, snapshot);
}

export function clearCatalogBusinessCache(businessId: string): void {
  cache.delete(businessId);
}