import { z } from 'zod';

export const createJournalSchema = z.object({
 
  journalDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  note: z.string().optional(),
  journalLines: z.array(z.object({
    accountId: z.string().cuid(),
    debit: z.number(),
    credit:z.number()
  })),
});