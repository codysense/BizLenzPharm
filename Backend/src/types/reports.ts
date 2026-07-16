import { z } from 'zod';

export const reportParametersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  asOfDate: z.string().optional(),
  warehouseId: z.string().optional(),
  itemId: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  itemType: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf', 'excel']).default('json'),
});

export const balanceSheetSchema = z.object({
  dateFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  dateTo: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
});

export const profitLossSchema = z.object({
  dateFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  dateTo: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
});

export const inventoryAgingSchema = z.object({
  asOfDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  warehouseId: z.string().optional(),
});

export const arApAgingSchema = z.object({
  asOfDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  type: z.enum(['AR', 'AP']),
});

export type ReportParameters = z.infer<typeof reportParametersSchema>;
export type BalanceSheetParams = z.infer<typeof balanceSheetSchema>;
export type ProfitLossParams = z.infer<typeof profitLossSchema>;
export type InventoryAgingParams = z.infer<typeof inventoryAgingSchema>;
export type ArApAgingParams = z.infer<typeof arApAgingSchema>;