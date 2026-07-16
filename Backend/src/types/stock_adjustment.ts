import { z } from 'zod';

export const createStockAdustmentSchema = z.object({
 
  adjustmentDate: z.string(),
  notes: z.string().optional(),
  warehouseId:z.string(),
  accountId: z.string(),
  adjustmentLines: z.array(z.object({
    itemId: z.string().cuid(),
    quantity: z.number(),
    adjustmentType:z.enum(['SURPLUS', 'DEFICIT'])
  })),
});