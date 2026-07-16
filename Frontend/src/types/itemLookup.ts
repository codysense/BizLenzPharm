export interface ItemLookup {
  id: string;

  sku: string;

  name: string;

  stockQty: number;

  priceList: {
    id: string;
    customerGroup: string;
    price: number;
  }[];
}
