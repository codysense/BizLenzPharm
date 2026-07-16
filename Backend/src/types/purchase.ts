// import { z } from "zod";

// export const createPurchaseSchema = z.object({
//   vendorId: z.string().cuid(),
//   orderDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
//     message: "Invalid date format",
//   }),
//   orderType: z.enum(["INVENTORY", "ASSET"]),
//   notes: z.string().optional(),
//   purchaseLines: z.array(
//     z.object({
//       itemId: z.string().nullable().optional,
//       assetName: z.string().nullable().optional(),
//       qty: z.number().positive(),
//       unitPrice: z.number().positive(),
//     }),
//   ),
// });

import { create } from "domain";
import { z } from "zod";

export const createPurchaseSchema = z
  .object({
    vendorId: z.string().min(1, "Vendor is required"),
    orderType: z.enum(["INVENTORY", "ASSET"]),
    orderDate: z.string().min(1, "Order date is required"),
    notes: z.string().optional(),

    purchaseLines: z
      .array(
        z.object({
          itemId: z.string().nullable().optional(),
          assetName: z.string().nullable().optional(),
          qty: z.number().positive(),
          unitPrice: z.number().positive(),
        }),
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    data.purchaseLines.forEach((line, index) => {
      if (data.orderType === "INVENTORY" && !line.itemId) {
        ctx.addIssue({
          path: ["purchaseLines", index, "itemId"],
          message: "Item is required for inventory order",
          code: z.ZodIssueCode.custom,
        });
      }

      if (data.orderType === "ASSET" && !line.assetName) {
        ctx.addIssue({
          path: ["purchaseLines", index, "assetName"],
          message: "Asset name is required for asset order",
          code: z.ZodIssueCode.custom,
        });
      }
    });
  });

export const receivePurchaseSchema = z.object({
  receiptLines: z.array(
    z.object({
      purchaseLineId: z.string().cuid(),
      qtyReceived: z.number().positive(),
      unitCost: z.number().positive(),
      warehouseId: z.string().cuid(),
    }),
  ),
});

export const createVendorSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  mode: z.enum(["create", "update"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  paymentTerms: z.string().optional(),
});

export type CreatePurchaseRequest = z.infer<typeof createPurchaseSchema>;
export type CreateVendorRequest = z.infer<typeof createVendorSchema>;
export type ReceivePurchaseRequest = z.infer<typeof receivePurchaseSchema>;
