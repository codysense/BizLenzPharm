import { z } from 'zod';
import { ProductionOrderStatus, WipLedgerType } from '@prisma/client';

export const createProductionOrderSchema = z.object({
  itemId: z.string().cuid(),
  qtyTarget: z.number().positive(),
  warehouseId: z.string().cuid(),
  bomId: z.string().cuid().optional().or(z.literal('')),
});

export const issueMaterialsSchema = z.object({
  materials: z.array(z.object({
    itemId: z.string().cuid(),
    qty: z.number().positive(),
    unitCost: z.number().positive().optional(),
  })),
});

export const addLaborSchema = z.object({
  hours: z.number().positive(),
  rate: z.number().positive(),
  employeeName: z.string().optional(),
});

export const addOverheadSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const receiveFinishedGoodsSchema = z.object({
  qtyGood: z.number().positive(),
  qtyScrap: z.number().min(0).default(0),
});

export type CreateProductionOrderRequest = z.infer<typeof createProductionOrderSchema>;
export type IssueMaterialsRequest = z.infer<typeof issueMaterialsSchema>;
export type AddLaborRequest = z.infer<typeof addLaborSchema>;
export type AddOverheadRequest = z.infer<typeof addOverheadSchema>;
export type ReceiveFinishedGoodsRequest = z.infer<typeof receiveFinishedGoodsSchema>;