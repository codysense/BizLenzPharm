import { Item } from "./inventory";

export interface SaleLineView {
  index: number;

  item: Item | null;

  itemId: string;

  qty: number;

  unitPrice: number;

  discountPercent: number;

  lineTotal: number;

  availableStock: number;

  displayPrice: number;

  stockStatus: "ok" | "low" | "out";
}
