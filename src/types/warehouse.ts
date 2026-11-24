/** JSON payload stored in `WarehouseItem.data` (MVP: warehouse locations). */
export type WarehouseLocation = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  description: string;
};
