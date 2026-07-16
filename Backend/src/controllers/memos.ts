// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// import { AuthRequest } from '../middleware/auth';
// const prisma = new PrismaClient();

// // const prisma = new PrismaClient();


// // Trade Receivable = 1100, Trade Payable = 2000
// const TRADE_RECEIVABLE_CODE = "2100";
// const TRADE_PAYABLE_CODE = "2000";


// // -------------------- Purchase Memos --------------------
// export const getPurchaseMemos = async (req: AuthRequest, res: Response) => {
//   try {
//     const memos = await prisma.purchaseMemo.findMany({
//       include: { vendor: true, account: true },
//       orderBy: { date: "desc" },
//     });
//     res.json({ data: memos });
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };


// export const createPurchaseMemo = async (req: Request, res: Response) => {
//   try {
//     const { vendorId, chartOfAccountId, type, amount, description } = req.body;
//     const postedBy = (req as any).user?.id;

//     if (!vendorId || !chartOfAccountId || !type || !amount) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 1) create purchase memo
//     const memo = await prisma.purchaseMemo.create({
//       data: {
//         type,
//         amount,
//         note: description ?? "",
//         vendor: { connect: { id: vendorId } },
//         account: { connect: { id: chartOfAccountId } }, //  aligned with frontend
//       },
//     });

//     // 2) lookup AP account
//     const apAccount = await prisma.chartOfAccount.findFirst({ where: { code: "2100" } });
//     if (!apAccount) throw new Error("Accounts Payable (code 2100) not found");

//     // 3) create journal
//     const journal = await prisma.journal.create({
//       data: {
//         journalNo: `JNL-${Date.now()}`,
//         date: new Date(),
//         memo: description ?? `${type} Memo for Vendor`,
//         postedBy,
//         journalLines: {
//           create: [
//             {
//               account: { connect: { id: type === "CREDIT" ? apAccount.id : chartOfAccountId } },
//               credit: type === "CREDIT" ? amount : 0,
//               debit: type === "DEBIT" ? amount : 0,
//               refType: "PurchaseMemo",
//               refId: memo.id,
//             },
//             {
//               account: { connect: { id: type === "DEBIT" ? apAccount.id : chartOfAccountId } },
//               credit: type === "DEBIT" ? amount : 0,
//               debit: type === "CREDIT" ? amount : 0,
//               refType: "PurchaseMemo",
//               refId: memo.id,
//             },
//           ],
//         },
//       },
//     });

//     res.json({ memo, journal });
//   } catch (err: any) {
//     console.error(err);
//     res.status(500).json({ error: err.message || err });
//   }
// };



// // export const createPurchaseMemo = async (req: Request, res: Response) => {
// //   try {
// //     const { vendorId, accountId, type, amount, note } = req.body;

// //     const memo = await prisma.purchaseMemo.create({
// //       data: { vendorId, accountId, type, amount, note },
// //       include: { vendor: true, account: true },
// //     });

// //     // Journal entry example (simplified)
// //     await prisma.journalEntry.create({
// //       data: {
// //         description: `${type} Memo for Vendor`,
// //         debitAccountId: type === "DEBIT" ? "2000" : accountId, // TradePayable code=2000
// //         creditAccountId: type === "CREDIT" ? "2000" : accountId,
// //         amount,
// //       },
// //     });

// //     res.json(memo);
// //   } catch (err: any) {
// //     console.log(err.message)
// //     res.status(500).json({ error: err.message });
// //   }
// // };

// // -------------------- Sales Memos --------------------
// export const getSalesMemos = async (req: Request, res: Response) => {
//   try {
//     const memos = await prisma.salesMemo.findMany({
//       include: { customer: true, account: true },
//       orderBy: { date: "desc" },
//     });
//     res.json({ data: memos });
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };



// // export const createSalesMemo = async (req: Request, res: Response) => {
// //   try {
// //     const { customerId, accountId, type, amount, description } = req.body;

// //     if (!customerId || !accountId || !type || !amount) {
// //       return res.status(400).json({ error: "Missing required fields" });
// //     }

// //     // Step 1: create SalesMemo (explicitly connect relations)
// //     const memo = await prisma.salesMemo.create({
// //       data: {
// //         type,
// //         amount,
// //         note: description,
// //         customer: { connect: { id: customerId } },  // ✅ relation
// //         account: { connect: { id: accountId } },    // ✅ relation
// //       },
// //     });

// //     // Step 2: create Journal + JournalLines
// //     const journal = await prisma.journal.create({
// //       data: {
// //         memo: description || `${type} Memo for Customer`,
// //         date: new Date(),
// //         postedBy: "system", 
// //         lines: {
// //           create: [
// //             {
// //               accountId: type === "DEBIT" ? "1100" : accountId, // TradeReceivable (1100) or chosen account
// //               debit: type === "DEBIT" ? amount : 0,
// //               credit: type === "CREDIT" ? amount : 0,
// //               refType: "SalesMemo",
// //               refId: memo.id,
// //             },
// //             {
// //               accountId: type === "CREDIT" ? "1100" : accountId,
// //               debit: type === "CREDIT" ? amount : 0,
// //               credit: type === "DEBIT" ? amount : 0,
// //               refType: "SalesMemo",
// //               refId: memo.id,
// //             },
// //           ],
// //         },
// //       },
// //     });

// //     res.json({ memo, journal });
// //   } catch (err: any) {
// //     console.error(err);
// //     res.status(500).json({ error: err.message });
// //   }
// // };
// export const createSalesMemo = async (req: AuthRequest, res: Response) => {
//   try {

//   console.log("Controller req.user:", req.user);

    
//     if (!req.user) {
//       return res.status(401).json({ error: "User not authenticated" });
//     }

//     const postedBy = req.user;
//     // console.log("PostedBy user:", postedBy);


//     const { customerId, chartOfAccountId, type, amount, description } = req.body;
//     // const postedBy = req.user?.id;

//     if (!customerId || !chartOfAccountId || !type || !amount) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // 1) create sales memo
//     const memo = await prisma.salesMemo.create({
//       data: {
//         type,
//         amount,
//         note: description ?? "",
//         customer: { connect: { id: customerId } },
//         account: { connect: { id: chartOfAccountId } }, //  fixed
//       },
//     });

//     // 2) lookup AR account
//     const arAccount = await prisma.chartOfAccount.findFirst({ where: { code: "1200" } });
//     if (!arAccount) throw new Error("Accounts Receivable (code 1200) not found");
// console.log(postedBy)
//     // 3) create journal
//     const journal = await prisma.journal.create({
//   data: {
//     journalNo: `JNL-${Date.now()}`,
//     date: new Date(),
//     memo: description ?? `${type} Memo for Customer`,
//     postedByUser: {
//       connect: { id: req.user!.id},   
//     },
//     journalLines: {
//       create: [
//         {
//           account: { connect: { id: type === "DEBIT" ? arAccount.id : chartOfAccountId } },
//           debit: type === "DEBIT" ? amount : 0,
//           credit: type === "CREDIT" ? amount : 0,
//           refType: "SalesMemo",
//           refId: memo.id,
//         },
//         {
//           account: { connect: { id: type === "CREDIT" ? arAccount.id : chartOfAccountId } },
//           debit: type === "CREDIT" ? amount : 0,
//           credit: type === "DEBIT" ? amount : 0,
//           refType: "SalesMemo",
//           refId: memo.id,
//         },
//       ],
//     },
//   },
// });


//     res.json({ memo, journal });
//   } catch (err: any) {
//     console.error(err);
//     res.status(500).json({ error: err.message || err });
//   }
// };





