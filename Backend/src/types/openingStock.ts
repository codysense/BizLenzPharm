import { z } from "zod";

/**
 * Individual Opening Stock Line
 */
export const openingStockLineSchema = z.object({
  itemId: z.string().cuid("Invalid item"),

  qty: z
    .number({
      error: "Quantity is required",
    })
    .positive("Quantity must be greater than zero"),

  unitCost: z
    .number({
      error: "Unit cost is required",
    })
    .min(0, "Unit cost cannot be negative"),
});

/**
 * Create Opening Stock
 */
export const createOpeningStockSchema = z.object({
  warehouseId: z.string().cuid("Warehouse is required"),

  openingDate: z.string().min(1, "Opening date is required"),

  remarks: z.string().optional(),

  openingLines: z
    .array(openingStockLineSchema)
    .min(1, "At least one item is required"),
});

/**
 * Types
 */

export type CreateOpeningStockRequest = z.infer<
  typeof createOpeningStockSchema
>;