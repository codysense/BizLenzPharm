// import { Request, Response } from "express";
// // import prisma from "../lib/prisma";

// import { PrismaClient } from '@prisma/client';

// // Trade Receivable = 1100, Trade Payable = 2000
// const TRADE_RECEIVABLE_CODE = "2100";
// const TRADE_PAYABLE_CODE = "2000";
// const prisma = new PrismaClient()


// export const createSalesMemo = async (req: Request, res: Response) => {
//   try {
//     const { customerId, chartOfAccountId, type, amount, description } = req.body;

//     const memo = await prisma.SalesMemo.create({
//       data: { customerId, chartOfAccountId, type, amount, description },
//       include: { customer: true, chartOfAccount: true },
//     });

//     // Journal Entries
//     const tradeReceivable = await prisma.chartOfAccount.findFirst({
//       where: { code: TRADE_RECEIVABLE_CODE },
//     });

//     if (!tradeReceivable) {
//       return res.status(400).json({ error: "Trade Receivable account not found" });
//     }

//     if (type === "CREDIT") {
//       // Credit memo: decrease receivable
//       await prisma.journalEntry.create({
//         data: {
//           description: `Sales Credit Memo - ${memo.id}`,
//           lines: {
//             create: [
//               { accountId: tradeReceivable.id, credit: amount, debit: 0 },
//               { accountId: chartOfAccountId, debit: amount, credit: 0 },
//             ],
//           },
//         },
//       });
//     } else {
//       // Debit memo: increase receivable
//       await prisma.journalEntry.create({
//         data: {
//           description: `Sales Debit Memo - ${memo.id}`,
//           lines: {
//             create: [
//               { accountId: tradeReceivable.id, debit: amount, credit: 0 },
//               { accountId: chartOfAccountId, credit: amount, debit: 0 },
//             ],
//           },
//         },
//       });
//     }

//     res.json(memo);
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const getSalesMemos = async (req: Request, res: Response) => {
//   try {
//     const memos = await prisma.salesMemo.findMany({
//       include: { customer: true, chartOfAccount: true },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json(memos);
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const createPurchaseMemo = async (req: Request, res: Response) => {
//   try {
//     const { vendorId, chartOfAccountId, type, amount, description } = req.body;

//     const memo = await prisma.purchaseMemo.create({
//       data: { vendorId, chartOfAccountId, type, amount, description },
//       include: { vendor: true, chartOfAccount: true },
//     });

//     // Journal Entries
//     const tradePayable = await prisma.chartOfAccount.findFirst({
//       where: { code: TRADE_PAYABLE_CODE },
//     });

//     if (!tradePayable) {
//       return res.status(400).json({ error: "Trade Payable account not found" });
//     }

//     if (type === "CREDIT") {
//       // Credit memo: decrease payable
//       await prisma.journalEntry.create({
//         data: {
//           description: `Purchase Credit Memo - ${memo.id}`,
//           lines: {
//             create: [
//               { accountId: tradePayable.id, debit: amount, credit: 0 },
//               { accountId: chartOfAccountId, credit: amount, debit: 0 },
//             ],
//           },
//         },
//       });
//     } else {
//       // Debit memo: increase payable
//       await prisma.journalEntry.create({
//         data: {
//           description: `Purchase Debit Memo - ${memo.id}`,
//           lines: {
//             create: [
//               { accountId: tradePayable.id, credit: amount, debit: 0 },
//               { accountId: chartOfAccountId, debit: amount, credit: 0 },
//             ],
//           },
//         },
//       });
//     }

//     res.json(memo);
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const getPurchaseMemos = async (req: Request, res: Response) => {
//   try {
//     const memos = await prisma.purchaseMemo.findMany({
//       include: { vendor: true, chartOfAccount: true },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json(memos);
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };
