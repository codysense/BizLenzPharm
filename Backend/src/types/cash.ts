import { z } from 'zod';

export const createCashAccountSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  accountType: z.enum(['CASH', 'BANK']),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  glAccountId: z.string().cuid('GL Account is required'),
  balance: z.number().default(0),
});


export const createCashTransactionSchema = z.object({
  cashAccountId: z.string(),
  transactionType: z.enum(['RECEIPT', 'PAYMENT']),
  transactionDate: z.string(),
  reference: z.string().optional(),
  refType: z.string().optional(),
  refId: z.string().optional(),
  transactionLines: z.array(z.object({
    glAccountId: z.string(),
    contraAccountId: z.string().optional(),
    lineAmount: z.number().positive(),
    description: z.string().optional()
  })).min(1, 'At least one transaction line is required')
});


export const updateCashAccountSchema = z.object({
  name: z.string(),
  accountType: z.enum(["CASH", "BANK"]),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  glAccountId: z.string().optional(),
  balance: z.number(),
  isActive: z.boolean().optional()  // ✅ Add this
});


// export const createCashTransactionSchema = z.object({
//   cashAccountId: z.string().cuid('Cash account is required'),
//   glAccountId: z.string().cuid('GL account is required'),
//   transactionType: z.enum(['RECEIPT', 'PAYMENT']),
//   amount: z.number().positive('Amount must be positive'),
//   description: z.string().min(1, 'Description is required'),
//   transactionDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
//     message: "Invalid date format"
//   }),
//   reference: z.string().optional(),
//   contraAccountId: z.string().optional(),
// });


export const updateCashTransactionSchema = z.object({
  description: z.string().optional(),
  transactionDate: z.string(),
  reference: z.string().optional(),
  transactionLines: z.array(z.object({
    glAccountId: z.string(),
    contraAccountId: z.string().optional(),
    lineAmount: z.number().positive(),
    description: z.string().optional()
  })).min(1)
});

export const reconcileCashTransactionSchema = z.object({
  reconciledDate: z.string().optional()
});

export const customerPaymentLineSchema = z.object({
  saleId: z.string().uuid().optional().nullable(),
  glAccountId: z.string().uuid({ message: "GL account is required" }),
  lineAmount: z.number().positive("Amount must be greater than zero"),
  description: z.string().optional(),
});

export const customerPaymentSchema = z.object({
  customerId: z.string().uuid(),
  cashAccountId: z.string().uuid(),
  paymentDate: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z
    .array(customerPaymentLineSchema)
    .min(1, "At least one payment line is required"),
});


export const createCustomerPaymentSchema = z.object({
  customerId: z.string().cuid('Customer is required'),
  cashAccountId: z.string().cuid('Cash account is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
  saleId: z.string().cuid().optional(),
});

export const createVendorPaymentSchema = z.object({
  vendorId: z.string().cuid('Vendor is required'),
  cashAccountId: z.string().cuid('Cash account is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
  purchaseId: z.string().cuid().optional(),
});

export const bankReconciliationSchema = z.object({
  cashAccountId: z.string().cuid('Cash account is required'),
  transactionIds: z.array(z.string().cuid()),
  statementBalance: z.number(),
  bookBalance: z.number(),
  reconciliationDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
});

export const importBankStatementSchema = z.object({
  cashAccountId: z.string().cuid('Cash account is required'),
  csvData: z.array(z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    type: z.string().optional(),
    reference: z.string().optional(),
  })),
});

export type CreateCashAccountRequest = z.infer<typeof createCashAccountSchema>;
export type UpdateCashAccountRequest = z.infer<typeof updateCashAccountSchema>;
export type CreateCashTransactionRequest = z.infer<typeof createCashTransactionSchema>;
export type UpdateCashTransactionRequest = z.infer<typeof updateCashTransactionSchema>;
export type CreateCustomerPaymentRequest = z.infer<typeof createCustomerPaymentSchema>;
export type CreateVendorPaymentRequest = z.infer<typeof createVendorPaymentSchema>;
export type BankReconciliationRequest = z.infer<typeof bankReconciliationSchema>;
export type ImportBankStatementRequest = z.infer<typeof importBankStatementSchema>;