import { z } from "zod";
import { ItemType, CostingMethod, LedgerDirection } from "@prisma/client";

export const createItemSchema = z.object({
  sku: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(ItemType),
  uom: z.string().default("Pcs"),
  minimumStockLevel: z.number().positive().optional(),
  costingMethod: z.nativeEnum(CostingMethod).default("GLOBAL"),
  standardCost: z.number().optional(),
  sellingPriceOrdinary: z.number().optional(),
  sellingPriceBulk: z.number().optional(),
  cartonQuantity: z.number().optional(),
  priceList: z.array(
    z.object({
      // itemId: z.string().cuid(),
      customerGroup: z.string(),
      price: z.number().positive(),
    }),
  ),

  taxCode: z.string().optional(),
});

export const createBomSchema = z.object({
  itemId: z.string().cuid(),
  version: z.string().default("1.0"),
  bomLines: z.array(
    z.object({
      componentItemId: z.string().cuid(),
      qtyPer: z.number().positive(),
      scrapPercent: z.number().min(0).max(100).default(0),
    }),
  ),
});

export const inventoryAdjustmentSchema = z.object({
  itemId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  adjustmentType: z.enum(["IN", "OUT"]),
  qty: z.number().positive(),
  unitCost: z.number().positive().optional(),
  reason: z.string().min(1, "Reason is required"),
});

// export const inventoryTransferSchema = z.object({
//   itemId: z.string().cuid(),
//   fromWarehouseId: z.string().cuid(),
//   toWarehouseId: z.string().cuid(),
//   qty: z.number().positive(),
// });

export const bulkInventoryTransferSchema = z
  .object({
    fromWarehouseId: z.string().min(1),
    toWarehouseId: z.string().min(1),
    transferItems: z
      .array(
        z.object({
          itemId: z.string().min(1),
          qty: z.number().positive(),
        }),
      )
      .min(1),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

export type CreateItemRequest = z.infer<typeof createItemSchema>;
export type CreateBomRequest = z.infer<typeof createBomSchema>;

export const createLocationSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("Nigeria"),
});

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  locationId: z.string().min(1, "Location is required"),
  address: z.string().optional(),
});

export const createUOMSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  createdBy: z.string().optional(),
});

export const updateUOMSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  name: z.string().min(1, "Name is required").optional(),
});

export type UpdateUOMRequest = z.infer<typeof updateUOMSchema>;
export type CreateUOMRequest = z.infer<typeof createUOMSchema>;
export type CreateLocationRequest = z.infer<typeof createLocationSchema>;
export type CreateWarehouseRequest = z.infer<typeof createWarehouseSchema>;
export type InventoryAdjustmentRequest = z.infer<
  typeof inventoryAdjustmentSchema
>;
export type InventoryTransferRequest = z.infer<
  typeof bulkInventoryTransferSchema
>;
