import { Request, Response } from "express";
import { PrismaClient, MemoType, MemoModule } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";
// import { Prisma } from '../../prisma/generated/client';
import { GeneralLedgerService } from "../services/gl";
import { CostingService } from "../services/costing";
import { ca } from "zod/v4/locales";

const prisma = new PrismaClient();
const glService = new GeneralLedgerService();
const costingService = new CostingService();
// console.log('Prisma export member',Object.keys(Prisma).includes('MemoType')? Object.keys(Prisma):'Not found');
export class MemoController {
  // GET /api/v1/memos
  async listMemos(req: AuthRequest, res: Response) {
    try {
      const { customerId, vendorId, type, from, to } = req.query;

      const memos = await prisma.memo.findMany({
        where: {
          customerId: customerId ? String(customerId) : undefined,
          vendorId: vendorId ? String(vendorId) : undefined,
          memoType: type ? (type as MemoType) : undefined,
          createdAt: {
            gte: from ? new Date(String(from)) : undefined,
            lte: to ? new Date(String(to)) : undefined,
          },
        },
        include: {
          account: true,
          customer: true,
          vendor: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(memos);
    } catch (error) {
      console.error("List memos error:", error);
      res.status(400).json({ error: "Failed to list memos" });
    }
  }

  async getMemos(req: AuthRequest, res: Response) {
    try {
      // const { id } = req.params;
      const { page = 1, pageSize = 20, type, date } = req.query;

      const selectedDate = new Date(String(date));

      const startDate = startOfDayUTC(selectedDate);
      const endDate = addDaysUTC(startDate, 1);

      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const [memos, total] = await Promise.all([
        prisma.memo.findMany({
          where: {
            memoType: type ? (type as MemoType) : undefined,
            date: date
              ? {
                  gte: startDate,
                  lt: endDate,
                }
              : undefined,
          },
          take,
          skip,
          include: {
            account: true,
            customer: true,
            vendor: true,
            user: true,
            sale: { include: { saleLines: { include: { item: true } } } },
            purchase: {
              include: { purchaseLines: { include: { item: true } } },
            },
          },
          orderBy: { date: "desc" },
        }),

        prisma.memo.count({
          where: {
            memoType: type ? (type as MemoType) : undefined,
            date: date
              ? {
                  gte: startDate,
                  lt: endDate,
                }
              : undefined,
          },
        }),
      ]);

      if (memos.length === 0) {
        return res.status(404).json({ error: "Memo not found" });
      }

      // console.log("Fetched memos:", memo);

      res.json({
        data: memos,
        pagination: {
          total,
          page: Number(page),
          limit: Number(pageSize),
          pages: Math.ceil(total / Number(pageSize)),
        },
      });
    } catch (error: any) {
      console.error("Get memo error:", error);
      res.status(400).json({ error: error.message });
    }
  }

  // PATCH /api/v1/memos/:id
  async updateMemo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { description, amount, accountId } = req.body;

      const memo = await prisma.memo.update({
        where: { id },
        data: {
          description,
          amount: amount ? new Decimal(amount) : undefined,
          accountId,
        },
      });

      res.json(memo);
    } catch (error) {
      console.error("Update memo error:", error);
      res.status(400).json({ error: "Failed to update memo" });
    }
  }

  // POST /api/v1/memos/:id/post
  async postMemo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const memo = await prisma.memo.findUnique({ where: { id } });
      if (!memo) {
        return res.status(404).json({ error: "Memo not found" });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          // Generate journal
          const journalCount = await tx.journal.count();
          const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

          const journal = await tx.journal.create({
            data: {
              journalNo,
              date: new Date(),
              memo: memo.description ?? `Memo ${memo.id}`,
              postedBy: req.user!.id,
            },
          });

          // Debit/Credit logic same as before
          let debitAccountId: string;
          let creditAccountId: string;

          if (memo.memoType === "CREDIT") {
            creditAccountId = memo.accountId!;
            debitAccountId =
              memo.module === "SALES"
                ? (await tx.chartOfAccount.findFirst({
                    where: { code: "1200" },
                  }))!.id
                : (await tx.chartOfAccount.findFirst({
                    where: { code: "2000" },
                  }))!.id;
          } else {
            debitAccountId = memo.accountId!;
            creditAccountId =
              memo.module === "SALES"
                ? (await tx.chartOfAccount.findFirst({
                    where: { code: "1200" },
                  }))!.id
                : (await tx.chartOfAccount.findFirst({
                    where: { code: "2000" },
                  }))!.id;
          }

          await tx.journalLine.createMany({
            data: [
              {
                journalId: journal.id,
                accountId: debitAccountId,
                debit: memo.amount,
                credit: new Decimal(0),
                refType: "MEMO",
                refId: memo.id,
              },
              {
                journalId: journal.id,
                accountId: creditAccountId,
                debit: new Decimal(0),
                credit: memo.amount,
                refType: "MEMO",
                refId: memo.id,
              },
            ],
          });

          return tx.memo.update({
            where: { id: memo.id },
            data: {
              /* could add status: 'POSTED' later */
            },
          });
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.json(result);
    } catch (error) {
      console.error("Post memo error:", error);
      res.status(400).json({ error: "Failed to post memo" });
    }
  }

  // DELETE /api/v1/memos/:id
  async deleteMemo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Add business rules check here before delete
      await prisma.memo.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      console.error("Delete memo error:", error);
      res.status(400).json({ error: "Failed to delete memo" });
    }
  }

  async createMemo(req: AuthRequest, res: Response) {
    try {
      const {
        date,
        module,
        memoType,
        saleId,
        purchaseId,
        customerId,
        vendorId,
        amount,
        accountId,
        warehouseId,
        description,
      } = req.body;

      // console.log("request user ", req.user);
      if (module === "SALES") {
        if (vendorId || purchaseId) {
          throw new Error("Invalid SALES memo payload");
        }
      }

      if (module === "PURCHASES") {
        if (customerId || saleId) {
          throw new Error("Invalid PURCHASE memo payload");
        }
      }

      if (saleId && purchaseId) {
        throw new Error("Cannot link both sale and purchase");
      }

      // VALIDATE FINANCIAL MEMO TYPES
      // if (!saleId && !purchaseId) {
      //   if (module === "SALES" && memoType !== "CREDIT") {
      //     throw new Error("Sales financial memo must be CREDIT");
      //   }

      //   if (module === "PURCHASES" && memoType !== "DEBIT") {
      //     throw new Error("Purchase financial memo must be DEBIT");
      //   }
      // }

      const result = await prisma.$transaction(async (tx) => {
        // const memoCount = await tx.memo.count();
        // const memoNo = `M${String(memoCount + 1).padStart(6, "0")}`;
        // Fetch the last memo ordered by creationDate
        const lastTx = await prisma.memo.findFirst({
          orderBy: { createdAt: "desc" },
        });

        let journalId: string | undefined;

        let nextNumber = 1;
        if (lastTx) {
          // Extract the numeric part of the transactionNo
          const lastNumber = parseInt(lastTx.memoNo.replace(/^M/, ""), 10);
          nextNumber = lastNumber + 1;
        }

        const memoNo = `M${String(nextNumber).padStart(6, "0")}`;

        let finalAmount = 0;
        let category: "SALES_RETURN" | "PURCHASE_RETURN" | "FINANCIAL" =
          "FINANCIAL";

        // CASE 1: LINKED TO SALE (Customer Return)

        if (saleId) {
          const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: { saleLines: true },
          });

          category = "SALES_RETURN";

          if (!sale) throw new Error("Sale not found");

          finalAmount = Number(sale.totalAmount);
          const itemType = await getItemTypeById(sale.saleLines[0]?.itemId);
          let totalCogs = 0;

          for (const line of sale.saleLines) {
            const inventoryValue = await costingService.getInventoryValue(
              line.itemId,
              warehouseId,
            );
            totalCogs += Number(inventoryValue.avgCost) * Number(line.qty);
          }

          // Reverse AR
          journalId = await glService.postJournal(
            tx,
            [
              {
                accountCode: "4000",
                debit: finalAmount,
                credit: 0,
                refType: "SALES RETURN",
                refId: sale.id,
              },
              {
                accountCode: "1200",
                debit: 0,
                credit: finalAmount,
                refType: "SALES RETURN",
                refId: sale.id,
              },
              {
                accountCode: "5000",
                debit: 0,
                credit: totalCogs,
                refType: "SALE",
                refId: sale.id,
              },
              {
                accountCode: itemType === "FINISHED_GOODS" ? "1350" : "1300",
                debit: totalCogs,
                credit: 0,
                refType: "SALE",
                refId: sale.id,
              },
            ],
            "SALES RETURN",
            req.user!.id,
            date,
          );

          // Process Inventory Return
          for (const line of sale.saleLines) {
            const inventoryValue = await costingService.getInventoryValue(
              line.itemId,
              warehouseId,
            );

            const unitCost = inventoryValue.avgCost;

            await costingService.receiveInventory(
              tx,
              line.itemId,
              warehouseId,
              Number(line.qty),
              unitCost,
              "SALES RETURN",
              sale.id,
              req.user!.id,
            );
          }

          await prisma.sale.update({
            where: { id: saleId },
            data: {
              status: "RETURNED",
            },
          });
        }

        // CASE 2: LINKED TO PURCHASE (Vendor Return)
        else if (purchaseId) {
          const purchase = await tx.purchase.findUnique({
            where: { id: purchaseId },
            include: { purchaseLines: true },
          });

          if (!purchase) {
            throw new Error("Purchase not found");
          }

          category = "PURCHASE_RETURN";

          const itemType = await getItemTypeById(
            purchase.purchaseLines[0]?.itemId,
          );

          if (!purchase) throw new Error("Purchase not found");

          finalAmount = Number(purchase.totalAmount);

          journalId = await glService.postJournal(
            tx,
            [
              {
                accountCode: "2000",
                debit: finalAmount,
                credit: 0,
                refType: "PURCHASE RETURN",
                refId: purchase.id,
              },
              {
                accountCode: itemType === "FINISHED_GOODS" ? "1350" : "1300",
                debit: 0,
                credit: finalAmount,
                refType: "PURCHASE RETURN",
                refId: purchase.id,
              },
            ],
            "PURCHASE RETURN",
            req.user!.id,
            date,
          );

          for (const line of purchase.purchaseLines) {
            if (!line.itemId) continue;

            await costingService.issueInventory(
              tx,
              line.itemId,
              warehouseId,
              Number(line.qty),
              "PURCHASE RETURN",
              purchase.id,
              req.user!.id,
            );
          }

          await prisma.purchase.update({
            where: { id: purchaseId },
            data: {
              status: "RETURNED",
            },
          });
        }

        // CASE 3: STANDALONE MEMO
        else {
          category = "FINANCIAL";

          if (!amount || !accountId) {
            throw new Error("Amount and account required");
          }

          finalAmount = Number(amount);

          const controlAccount = module === "SALES" ? "1200" : "2000";

          const coa = await tx.chartOfAccount.findFirst({
            where: { id: accountId },
          });

          if (!coa) throw new Error("Account not found");

          //  Enforced Logic
          if (module === "SALES" && memoType === "CREDIT") {
            //  FOR CREDIT  SALES MEMO
            journalId = await glService.postJournal(
              tx,
              [
                {
                  accountCode: coa.code,
                  debit: finalAmount,
                  credit: 0,
                  refType: "CREDIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
                {
                  accountCode: controlAccount, // AR
                  debit: 0,
                  credit: finalAmount,
                  refType: "CREDIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
              ],
              `Sales Credit Memo: ${description ?? memoNo}`,
              req.user!.id,
              date,
            );
          } else if (module === "SALES" && memoType === "DEBIT") {
            //FOR SALES DEBIT MEMO

            journalId = await glService.postJournal(
              tx,
              [
                {
                  accountCode: coa.code,
                  debit: 0,
                  credit: finalAmount,
                  refType: "DEBIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
                {
                  accountCode: controlAccount, // AR
                  debit: finalAmount,
                  credit: 0,
                  refType: "DEBIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
              ],
              `Sales Debit Memo: ${description ?? memoNo}`,
              req.user!.id,
              date,
            );
          } else if (module === "PURCHASES" && memoType === "DEBIT") {
            // FOR   PURCHASE DEBIT MEMO
            journalId = await glService.postJournal(
              tx,
              [
                {
                  accountCode: controlAccount, // AP
                  debit: finalAmount,
                  credit: 0,
                  refType: "DEBIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
                {
                  accountCode: coa.code,
                  debit: 0,
                  credit: finalAmount,
                  refType: "DEBIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
              ],
              `Purchase Debit Memo: ${description ?? memoNo}`,
              req.user!.id,
              date,
            );
          } else if (module === "PURCHASES" && memoType === "CREDIT") {
            // FOR PURCHASE CREDIT MEMO
            journalId = await glService.postJournal(
              tx,
              [
                {
                  accountCode: controlAccount, // AP
                  debit: 0,
                  credit: finalAmount,
                  refType: "CREDIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
                {
                  accountCode: coa.code,
                  debit: finalAmount,
                  credit: 0,
                  refType: "CREDIT MEMO",
                  refId: req.body.refId ?? undefined,
                },
              ],
              `Purchase Credit Memo: ${description ?? memoNo}`,
              req.user!.id,
              date,
            );
          }
        }

        // Create Memo Record
        const memo = await tx.memo.create({
          data: {
            memoNo,
            date: new Date(date),
            module,
            memoType,
            category,
            amount: finalAmount,
            remaining: finalAmount,
            description,
            saleId,
            purchaseId,
            customerId,
            vendorId,
            accountId,
            journalId,
            createdBy: req.user!.id,
          },
        });

        return memo;
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async reverseMemo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await prisma.$transaction(async (tx) => {
        //  1. Get original memo
        const original = await tx.memo.findUnique({
          where: { id },
          include: {
            journal: {
              include: {
                journalLines: {
                  include: { account: true },
                },
              },
            },
          },
        });

        if (!original) {
          throw new Error("Memo not found");
        }

        if (
          original.category !== "FINANCIAL" ||
          original.saleId ||
          original.purchaseId
        ) {
          throw new Error(
            "Only standalone financial memos can be reversed. Sales and purchase return memos must be corrected with new transactions.",
          );
        }

        if (!original) throw new Error("Memo not found");

        if (original.isReversal) {
          throw new Error("Cannot reverse a reversal memo");
        }

        if (original.status === "REVERSED") {
          throw new Error("Memo already reversed");
        }

        if (!original.journal) {
          throw new Error(
            "No journal found for this memo - perhaps it was posted before journal linking was implemented?",
          );
        }

        //  2. Generate new memo number
        const lastTx = await tx.memo.findFirst({
          orderBy: { createdAt: "desc" },
        });

        let nextNumber = 1;
        if (lastTx) {
          const lastNumber = parseInt(lastTx.memoNo.replace(/^M/, ""), 10);
          nextNumber = lastNumber + 1;
        }

        const memoNo = `M${String(nextNumber).padStart(6, "0")}`;

        // 3. Reverse GL Journal
        const reversedJournalId = await glService.postJournal(
          tx,
          original.journal.journalLines.map((line) => ({
            accountCode: line.account.code,
            debit: Number(line.credit),
            credit: Number(line.debit),
            //  KEEP ORIGINAL REFERENCES
            refType: `${line.refType} REVERSAL`,
            refId: line.refId ?? undefined,
          })),
          `Reversal of ${original.memoNo}`,
          req.user!.id,
        );

        //  4. Reverse Inventory (based on category)
        // if (original.category === "SALES_RETURN" && original.saleId) {
        //   const sale = await tx.sale.findUnique({
        //     where: { id: original.saleId },
        //     include: { saleLines: true },
        //   });

        //   if (sale) {
        //     for (const line of sale.saleLines) {
        //       await costingService.issueInventory(
        //         tx,
        //         line.itemId,
        //         sale.warehouseId,
        //         Number(line.qty),
        //         "SALES RETURN",
        //         sale.id,
        //         req.user!.id,
        //       );
        //     }
        //   }
        // }

        // if (original.category === "PURCHASE_RETURN" && original.purchaseId) {
        //   const purchase = await tx.purchase.findUnique({
        //     where: { id: original.purchaseId },
        //     include: { purchaseLines: true },
        //   });

        //   if (purchase) {
        //     for (const line of purchase.purchaseLines) {
        //       await costingService.receiveInventory(
        //         tx,
        //         line.itemId,
        //         purchase.warehouseId,
        //         Number(line.qty),
        //         Number(line.unitCost ?? 0),
        //         "PURCHASE RETURN",
        //         purchase.id,
        //         req.user!.id,
        //       );
        //     }
        //   }
        // }

        //  5. Create reversal memo
        const reversalMemo = await tx.memo.create({
          data: {
            memoNo,
            date: new Date(),

            module: original.module,
            memoType: original.memoType,
            category: original.category,

            amount: original.amount,
            remaining: 0,
            status: "REVERSED",

            description: `Reversal of ${original.memoNo}`,

            // saleId: original.saleId,
            // purchaseId: original.purchaseId,
            customerId: original.customerId,
            vendorId: original.vendorId,
            accountId: original.accountId,

            isReversal: true,
            reversedFromId: original.id,

            journalId: reversedJournalId,

            createdBy: req.user!.id,
          },
        });

        //  6. Update original memo
        await tx.memo.update({
          where: { id: original.id },
          data: {
            status: "REVERSED",
          },
        });

        return reversalMemo;
      });

      res.json(result);
    } catch (error: any) {
      console.error("Reverse memo error:", error);
      res.status(400).json({ error: error.message });
    }
  }
}

function startOfDayUTC(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function addDaysUTC(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function getItemTypeById(itemId: string | null): Promise<string> {
  if (!itemId) {
    throw new Error("Item ID is null");
  }
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { type: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  return String(item.type);
}
