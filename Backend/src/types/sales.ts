import { z } from "zod";

export const createSaleSchema = z.object({
  customerId: z.string().cuid(),
  orderDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  notes: z.string().optional(),
  saleLines: z.array(
    z.object({
      itemId: z.string().cuid(),
      qty: z.number().positive(),
      unitPrice: z.number().positive(),
    }),
  ),
});

export const deliverSaleSchema = z.object({
  deliveryLines: z.array(
    z.object({
      saleLineId: z.string().cuid(),
      qtyDelivered: z.number().positive(),
      warehouseId: z.string().cuid(),
    }),
  ),
});

export const createCustomerSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  mode: z.enum(["create", "update"]),
  creditLimit: z.number().optional(),
  // customerGroup: z.string().optional(),
  customerGroupId: z.string().optional(),
});

export type CreateSaleRequest = z.infer<typeof createSaleSchema>;
export type DeliverSaleRequest = z.infer<typeof deliverSaleSchema>;
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;
