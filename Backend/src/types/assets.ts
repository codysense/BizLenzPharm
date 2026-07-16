import { z } from "zod";

export const createAssetCategorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]),
  usefulLife: z.number().int().positive("Useful life must be positive"),
  residualValue: z
    .number()
    .min(0)
    .max(100, "Residual value must be between 0-100%"),
  glAssetAccountId: z.string().cuid("Asset account is required"),
  glDepreciationAccountId: z.string().cuid("Depreciation account is required"),
  glAccumulatedDepreciationAccountId: z
    .string()
    .cuid("Accumulated depreciation account is required"),
});

export const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  glAssetAccountId: z.string().cuid("Asset account is required"),
  categoryId: z.string().cuid("Category is required"),
  acquisitionDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid acquisition date",
  }),
  acquisitionCost: z.number().positive("Acquisition cost must be positive"),
  residualValue: z.number().min(0).optional(),
  usefulLife: z.number().int().positive().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).optional(),
  locationId: z.string().cuid().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
  purchaseOrderId: z.string().cuid().optional(),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  categoryId: z.string().cuid("Category is required"),
  locationId: z.string().cuid().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
});

export const capitalizeFromPurchaseSchema = z.object({
  purchaseOrderId: z.string().cuid("Purchase order is required"),
  assets: z
    .array(
      z.object({
        name: z.string().min(1, "Asset name is required"),
        categoryId: z.string().cuid("Category is required"),
        acquisitionCost: z.number().positive("Cost must be positive"),
        serialNumber: z.string().optional(),
        locationId: z.string().cuid().optional(),
      }),
    )
    .min(1, "At least one asset is required"),
});

export const disposeAssetSchema = z.object({
  disposalDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid disposal date",
  }),
  disposalAmount: z.number().min(0, "Disposal amount cannot be negative"),
  disposalMethod: z.enum(["SALE", "SCRAP", "DONATION", "WRITE_OFF"]),
  buyerDetails: z.string().optional(),
  notes: z.string().optional(),
});

export const runDepreciationSchema = z.object({
  periodYear: z.number().int().min(2020).max(2050),
  periodMonth: z.number().int().min(1).max(12),
  assetIds: z.array(z.string().cuid()).optional(),
});

export type CreateAssetCategoryRequest = z.infer<
  typeof createAssetCategorySchema
>;
export type CreateAssetRequest = z.infer<typeof createAssetSchema>;
export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;
export type CapitalizeFromPurchaseRequest = z.infer<
  typeof capitalizeFromPurchaseSchema
>;
export type DisposeAssetRequest = z.infer<typeof disposeAssetSchema>;
export type RunDepreciationRequest = z.infer<typeof runDepreciationSchema>;
