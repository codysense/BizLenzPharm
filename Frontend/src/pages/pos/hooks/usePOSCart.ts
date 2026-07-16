import { UseFieldArrayAppend, UseFieldArrayRemove } from "react-hook-form";

interface SaleLine {
  itemId: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
}

interface UsePOSCartProps {
  watchedLines: SaleLine[];

  append: UseFieldArrayAppend<any>;

  remove: UseFieldArrayRemove;

  setValue: any;

  getValues: any;
}

export function usePOSCart({
  watchedLines,
  append,
  remove,
  setValue,
  getValues,
}: UsePOSCartProps) {
  return {};
}
