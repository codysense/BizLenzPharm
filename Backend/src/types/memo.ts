// import { z } from "zod";

// export const memoSchema = z.object({
//   module: z.enum(["SALES", "PURCHASES"]),
//   memoType: z.enum(["CREDIT", "DEBIT"]),
//   accountId: z.string().min(1, "Account is required"), // GL account affected
//   customerId: z.string().optional(), // required if module = SALES
//   vendorId: z.string().optional(),   // required if module = PURCHASES
//   amount: z.number().positive(),
//   description: z.string().min(3).optional(),
// });


import { z } from "zod";

export const memoSchema = z.object({
  date: z.date().optional,
  module: z.enum(["SALES", "PURCHASES"]),
  memoType: z.enum(["CREDIT", "DEBIT"]),
  accountId: z.string().min(1, "Account is required"), // GL account affected
  customerId: z.string().optional(), // required if module = SALES
  vendorId: z.string().optional(),   // required if module = PURCHASES
  amount: z.number().positive(),
  description: z.string().min(3).optional(),
})
.superRefine((data, ctx) => {
  if (data.module === "SALES" && !data.customerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer is required when module is SALES",
      path: ["customerId"],
    });
  }
  if (data.module === "PURCHASES" && !data.vendorId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Vendor is required when module is PURCHASES",
      path: ["vendorId"],
    });
  }
});



