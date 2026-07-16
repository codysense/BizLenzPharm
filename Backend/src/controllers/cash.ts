import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";
import {
  createCashTransactionSchema,
  reconcileCashTransactionSchema,
  updateCashTransactionSchema,
} from "../types/cash";

const prisma = new PrismaClient();

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

function endOfDayUTC(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

export class CashController {
  // Get all cash accounts
  async getCashAccounts(req: AuthRequest, res: Response) {
    try {
      // Apply warehouse filtering for non-admin users
      let where: any = { isActive: true };
      if (
        !req.user!.roles.includes("Senior Accountant") &&
        !req.user!.roles.includes("General Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });
        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      const accounts = await prisma.cashAccount.findMany({
        where: {
          ...where,
          NOT: { name: "Memo Clearing" },
        },
        orderBy: { code: "asc" },
      });

      res.json({ accounts });
    } catch (error) {
      console.error("Get cash accounts error:", error);
      res.status(500).json({ error: "Failed to fetch cash accounts" });
    }
  }

  // Create new cash account
  async createCashAccount(req: AuthRequest, res: Response) {
    try {
      const account = await prisma.cashAccount.create({
        data: req.body,
      });

      res.status(201).json(account);
    } catch (error) {
      console.error("Create cash account error:", error);
      res.status(400).json({ error: "Failed to create cash account" });
    }
  }

  // Update cash account
  async updateCashAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const account = await prisma.cashAccount.update({
        where: { id },
        data: req.body,
      });

      res.json(account);
    } catch (error) {
      console.error("Update cash account error:", error);
      res.status(400).json({ error: "Failed to update cash account" });
    }
  }

  // Delete cash account
  async deleteCashAccount(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if account has transactions
      const transactionCount = await prisma.cashTransaction.count({
        where: { cashAccountId: id },
      });

      if (transactionCount > 0) {
        return res.status(400).json({
          error: "Cannot delete cash account with existing transactions",
        });
      }

      await prisma.cashAccount.delete({
        where: { id },
      });

      res.json({ message: "Cash account deleted successfully" });
    } catch (error) {
      console.error("Delete cash account error:", error);
      res.status(400).json({ error: "Failed to delete cash account" });
    }
  }

  // // Get cash transactions
  // async getCashTransactions(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       cashAccountId,
  //       transactionType,
  //       dateFrom,
  //       dateTo
  //     } = req.query;

  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};
  //     if (cashAccountId) where.cashAccountId = cashAccountId;
  //     if (transactionType) where.transactionType = transactionType;
  //     if (dateFrom || dateTo) {
  //       where.transactionDate = {};
  //       if (dateFrom) where.transactionDate.gte = new Date(dateFrom as string);
  //       if (dateTo) where.transactionDate.lte = new Date(dateTo as string);
  //     }

  //     const [transactions, total] = await Promise.all([
  //       prisma.cashTransaction.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           cashAccount: true,
  //           glAccount: true,
  //           contraAccount: true,
  //           user: {
  //             select: { name: true, email: true }
  //           }
  //         },
  //         orderBy: { transactionDate: 'desc' }
  //       }),
  //       prisma.cashTransaction.count({ where })
  //     ]);

  //     res.json({
  //       transactions,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit))
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Get cash transactions error:', error);
  //     res.status(500).json({ error: 'Failed to fetch cash transactions' });
  //   }
  // }

  async createCashTransaction(req: AuthRequest, res: Response) {
    try {
      const validatedData = createCashTransactionSchema.parse(req.body);

      const cashTransaction = await prisma.$transaction(
        async (tx) => {
          // Fetch the last CashTransaction ordered by creationDate
          const lastTx = await prisma.cashTransaction.findFirst({
            orderBy: { createdAt: "desc" },
          });

          let nextNumber = 1;
          if (lastTx) {
            // Extract the numeric part of the transactionNo
            const lastNumber = parseInt(
              lastTx.transactionNo.replace(/^CT/, ""),
              10,
            );
            nextNumber = lastNumber + 1;
          }

          const transactionNo = `CT${String(nextNumber).padStart(6, "0")}`;

          // Calculate total amount from transaction lines
          const totalAmount = validatedData.transactionLines.reduce(
            (sum, line) => {
              return sum + Number(line.lineAmount);
            },
            0,
          );

          // Create cash transaction with PREPARED status
          const newTransaction = await tx.cashTransaction.create({
            data: {
              transactionNo,
              cashAccountId: validatedData.cashAccountId,
              transactionType: validatedData.transactionType,
              amount: new Decimal(totalAmount),
              // description: validatedData.description,
              transactionDate: new Date(validatedData.transactionDate),
              reference: validatedData.reference,
              refType: validatedData.refType || "OTHER",
              refId: validatedData.refId || null,
              status: "PREPARED",
              preparedBy: req.user!.id,
              userId: req.user!.id,
            },
          });

          // Create transaction lines
          for (const line of validatedData.transactionLines) {
            await tx.cashTransactionLine.create({
              data: {
                cashTransactionId: newTransaction.id,
                glAccountId: line.glAccountId,
                lineAmount: line.lineAmount,
                description: line.description,
              },
            });
          }

          return newTransaction;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.status(201).json(cashTransaction);
    } catch (error) {
      console.error("Create cash transaction error:", error);
      res.status(400).json({ error: "Failed to create cash transaction" });
    }
  }

  async approveCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(
        async (tx) => {
          const cashTransaction = await tx.cashTransaction.findUnique({
            where: { id },
          });

          if (!cashTransaction) {
            throw new Error("Cash transaction not found");
          }

          if (cashTransaction.status !== "PREPARED") {
            throw new Error("Only PREPARED transactions can be approved");
          }

          // Prevent self-approval (optional business rule)
          // if (cashTransaction.preparedBy === req.user!.id) {
          //   throw new Error('You cannot approve your own transaction');
          // }

          // Update transaction status to APPROVED
          await tx.cashTransaction.update({
            where: { id },
            data: {
              status: "APPROVED",
              approvedBy: req.user!.id,
              approvedAt: new Date(),
            },
          });
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Cash transaction approved successfully" });
    } catch (error) {
      console.error("Approve cash transaction error:", error);
      res.status(400).json({ error: "Failed to approve cash transaction" });
    }
  }

  async authorizeCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(
        async (tx) => {
          const cashTransaction = await tx.cashTransaction.findUnique({
            where: { id },
          });

          if (!cashTransaction) {
            throw new Error("Cash transaction not found");
          }

          if (cashTransaction.status !== "APPROVED") {
            throw new Error("Only APPROVED transactions can be authorized");
          }

          // Prevent self-authorization (optional business rule)
          // if (cashTransaction.approvedBy === req.user!.id) {
          //   throw new Error('You cannot authorize a transaction you approved');
          // }

          // Update transaction status to AUTHORIZED
          await tx.cashTransaction.update({
            where: { id },
            data: {
              status: "AUTHORIZED",
              authorizedBy: req.user!.id,
              authorizedAt: new Date(),
            },
          });
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Cash transaction authorized successfully" });
    } catch (error) {
      console.error("Authorize cash transaction error:", error);
      res.status(400).json({ error: "Failed to authorize cash transaction" });
    }
  }

  async payCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(
        async (tx) => {
          // Get transaction with lines and cash account
          const cashTransaction = await tx.cashTransaction.findUnique({
            where: { id },
            include: {
              transactionLines: true,
              cashAccount: true,
            },
          });

          if (!cashTransaction) {
            throw new Error("Cash transaction not found");
          }

          if (cashTransaction.status !== "AUTHORIZED") {
            throw new Error("Only AUTHORIZED transactions can be paid");
          }

          // Get cash account's GL account
          const cashGLAccountId = cashTransaction.cashAccount.glAccountId;

          if (!cashGLAccountId) {
            throw new Error("Cash account does not have a linked GL account");
          }

          // Update transaction status to PAID
          await tx.cashTransaction.update({
            where: { id },
            data: {
              status: "PAID",
              paidBy: req.user!.id,
              paidAt: new Date(),
            },
          });

          // Update cash account balance
          const balanceChange =
            cashTransaction.transactionType === "RECEIPT"
              ? cashTransaction.amount
              : new Decimal(cashTransaction.amount).negated();

          await tx.cashAccount.update({
            where: { id: cashTransaction.cashAccountId },
            data: {
              balance: {
                increment: balanceChange,
              },
            },
          });

          // Create journal entries for double-entry bookkeeping
          const journalCount = await tx.journal.count();
          const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

          const journal = await tx.journal.create({
            data: {
              journalNo,
              date: cashTransaction.transactionDate,
              memo: `${cashTransaction.transactionType}: ${cashTransaction.reference}`,
              postedBy: req.user!.id,
            },
          });

          // Create journal lines for each transaction line
          for (const line of cashTransaction.transactionLines) {
            if (cashTransaction.transactionType === "RECEIPT") {
              // RECEIPT: Debit Cash Account, Credit GL Account
              await tx.journalLine.createMany({
                data: [
                  {
                    journalId: journal.id,
                    accountId: cashGLAccountId,
                    debit: line.lineAmount,
                    credit: new Decimal(0),
                    refType: "CASH_TRANSACTION",
                    refId: cashTransaction.id,
                  },
                  {
                    journalId: journal.id,
                    accountId: line.glAccountId,
                    debit: new Decimal(0),
                    credit: line.lineAmount,
                    refType: "CASH_TRANSACTION",
                    refId: cashTransaction.id,
                  },
                ],
              });
              //if Gl Account is linked with a cashacount, then credit the cash account too
              const linkedCashAccount = await tx.cashAccount.findFirst({
                where: { glAccountId: line.glAccountId },
              });
              if (linkedCashAccount) {
                await tx.cashAccount.update({
                  where: { id: linkedCashAccount.id },
                  data: {
                    balance: {
                      decrement: new Decimal(line.lineAmount),
                    },
                  },
                });
              }
            } else {
              // PAYMENT: Debit GL Account, Credit Cash Account
              await tx.journalLine.createMany({
                data: [
                  {
                    journalId: journal.id,
                    accountId: line.glAccountId,
                    debit: line.lineAmount,
                    credit: new Decimal(0),
                    refType: "CASH_TRANSACTION",
                    refId: cashTransaction.id,
                  },
                  {
                    journalId: journal.id,
                    accountId: cashGLAccountId,
                    debit: new Decimal(0),
                    credit: line.lineAmount,
                    refType: "CASH_TRANSACTION",
                    refId: cashTransaction.id,
                  },
                ],
              });

              //if Gl Account is linked with a cashacount, then debit the cash account too
              const linkedCashAccount = await tx.cashAccount.findFirst({
                where: { glAccountId: line.glAccountId },
              });
              if (linkedCashAccount) {
                await tx.cashAccount.update({
                  where: { id: linkedCashAccount.id },
                  data: {
                    balance: {
                      increment: new Decimal(line.lineAmount),
                    },
                  },
                });
              }
            }
          }

          // Create posting record for audit trail
          await tx.cashTransactionPosting.create({
            data: {
              cashTransactionId: cashTransaction.id,
              journalId: journal.id,
              postedBy: req.user!.id,
            },
          });
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Cash transaction paid successfully" });
    } catch (error) {
      console.error("Pay cash transaction error:", error);
      res.status(400).json({ error: "Failed to pay cash transaction" });
    }
  }

  async reconcileCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = reconcileCashTransactionSchema.parse(req.body);

      await prisma.$transaction(
        async (tx) => {
          const cashTransaction = await tx.cashTransaction.findUnique({
            where: { id },
          });

          if (!cashTransaction) {
            throw new Error("Cash transaction not found");
          }

          if (cashTransaction.status !== "PAID") {
            throw new Error("Only PAID transactions can be reconciled");
          }

          if (cashTransaction.isReconciled) {
            throw new Error("Transaction is already reconciled");
          }

          await tx.cashTransaction.update({
            where: { id },
            data: {
              isReconciled: true,
              reconciledAt: validatedData.reconciledDate
                ? new Date(validatedData.reconciledDate)
                : new Date(),
            },
          });
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Cash transaction reconciled successfully" });
    } catch (error) {
      console.error("Reconcile cash transaction error:", error);
      res.status(400).json({ error: "Failed to reconcile cash transaction" });
    }
  }

  async updateCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateCashTransactionSchema.parse(req.body);

      const cashTransaction = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.cashTransaction.findUnique({
            where: { id },
          });

          if (!existing) {
            throw new Error("Cash transaction not found");
          }

          if (existing.status !== "PREPARED") {
            throw new Error("Only PREPARED transactions can be updated");
          }

          // Only the preparer can update
          if (existing.preparedBy !== req.user!.id) {
            throw new Error("Only the preparer can update this transaction");
          }

          // Delete existing transaction lines
          await tx.cashTransactionLine.deleteMany({
            where: { cashTransactionId: id },
          });

          // Calculate new total amount
          const totalAmount = validatedData.transactionLines.reduce(
            (sum, line) => {
              return sum + Number(line.lineAmount);
            },
            0,
          );

          // Update cash transaction
          const updated = await tx.cashTransaction.update({
            where: { id },
            data: {
              amount: new Decimal(totalAmount),
              //description: validatedData.description,
              transactionDate: new Date(validatedData.transactionDate),
              reference: validatedData.reference,
            },
          });

          // Create new transaction lines
          for (const line of validatedData.transactionLines) {
            await tx.cashTransactionLine.create({
              data: {
                cashTransactionId: id,
                glAccountId: line.glAccountId,
                contraAccountId: line.contraAccountId || null,
                lineAmount: new Decimal(line.lineAmount),
                description: line.description,
              },
            });
          }

          return updated;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json(cashTransaction);
    } catch (error) {
      console.error("Update cash transaction error:", error);
      res.status(400).json({ error: "Failed to update cash transaction" });
    }
  }

  async deleteCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.cashTransaction.findUnique({
            where: { id },
          });

          if (!existing) {
            throw new Error("Cash transaction not found");
          }

          if (existing.status !== "PREPARED") {
            throw new Error("Only PREPARED transactions can be deleted");
          }

          // Only the preparer can delete
          if (existing.preparedBy !== req.user!.id) {
            throw new Error("Only the preparer can delete this transaction");
          }

          // Transaction lines will be deleted automatically due to CASCADE
          await tx.cashTransaction.delete({
            where: { id },
          });
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Cash transaction deleted successfully" });
    } catch (error) {
      console.error("Delete cash transaction error:", error);
      res.status(400).json({ error: "Failed to delete cash transaction" });
    }
  }

  async getCashTransaction(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const cashTransaction = await prisma.cashTransaction.findUnique({
        where: { id },
        include: {
          transactionLines: {
            include: {
              glAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              contraAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          cashAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              balance: true,
            },
          },
          preparer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          authorizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!cashTransaction) {
        return res.status(404).json({ error: "Cash transaction not found" });
      }

      res.json(cashTransaction);
    } catch (error) {
      console.error("Get cash transaction error:", error);
      res.status(500).json({ error: "Failed to retrieve cash transaction" });
    }
  }

  async getCashTransactions(req: AuthRequest, res: Response) {
    try {
      const {
        status,
        cashAccountId,
        startDate,
        endDate,
        transactionType,
        excludeRefund,
        page = "1",
        limit = "50",
      } = req.query;

      const where: any = {};
      const newDateFrom = startOfDayUTC(new Date(startDate as string));
      const newDateTo = endOfDayUTC(new Date(endDate as string));

      if (status) where.status = status;
      if (cashAccountId) where.cashAccountId = cashAccountId;

      // Handle transactionType with excludeRefund logic
      if (transactionType) {
        where.transactionType = transactionType;
      } else if (excludeRefund === "true") {
        // Only apply exclusion if no specific transactionType is selected
        where.transactionType = {
          not: "REFUND",
        };
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = newDateFrom;
        if (endDate) where.transactionDate.lte = newDateTo;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [cashTransactions, total] = await Promise.all([
        prisma.cashTransaction.findMany({
          where,
          include: {
            cashAccount: {
              select: {
                id: true,
                name: true,
                accountNumber: true,
              },
            },
            transactionLines: {
              include: {
                glAccount: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
            preparer: {
              select: {
                id: true,
                name: true,
              },
            },
            approver: {
              select: {
                id: true,
                name: true,
              },
            },
            authorizer: {
              select: {
                id: true,
                name: true,
              },
            },
            payer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { transactionDate: "desc" },
          skip,
          take,
        }),
        prisma.cashTransaction.count({ where }),
      ]);

      res.json({
        data: cashTransactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get cash transactions error:", error);
      res.status(500).json({ error: "Failed to retrieve cash transactions" });
    }
  }

  async getCashTransactionsByStatus(req: AuthRequest, res: Response) {
    try {
      const statusCounts = await prisma.cashTransaction.groupBy({
        by: ["status"],
        _count: true,
        _sum: {
          amount: true,
        },
      });

      const summary = statusCounts.map((item) => ({
        status: item.status,
        count: item._count,
        totalAmount: item._sum.amount || 0,
      }));

      res.json(summary);
    } catch (error) {
      console.error("Get status summary error:", error);
      res.status(500).json({ error: "Failed to retrieve status summary" });
    }
  }

  async printCashReceipt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const cashTransaction = await prisma.cashTransaction.findUnique({
        where: { id },
        include: {
          transactionLines: {
            include: {
              glAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              contraAccount: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          cashAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              balance: true,
            },
          },
          preparer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          authorizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!cashTransaction) {
        return res.status(404).json({ error: "CashTransaction not found" });
      }

      if (!["INVOICED", "PAID"].includes(cashTransaction.status)) {
        return res
          .status(400)
          .json({ error: "CashTransaction must be invoiced to print" });
      }

      res.json({
        cashTransaction,
        printData: {
          title: "CashTransaction Receipt",
          documentNo: cashTransaction.transactionNo,
          date: cashTransaction.transactionDate,
          status: cashTransaction.status,
          lines: cashTransaction.transactionLines,
          total: cashTransaction.amount,
        },
      });
    } catch (error) {
      console.error("Print Cash Receipt error:", error);
      res.status(500).json({ error: "Failed to generate receipt" });
    }
  }

  //   async createCashTransaction(req: AuthRequest, res: Response) {
  //     try {
  //       const {
  //         cashAccountId,
  //         glAccountId,
  //         contraAccountId,
  //         transactionType,
  //         amount,
  //         description,
  //         transactionDate,
  //         reference
  //       } = req.body;

  //       const result = await prisma.$transaction(async (tx) => {
  //         // Generate transaction number
  //         const count = await tx.cashTransaction.count();
  //         const transactionNo = `CT${String(count + 1).padStart(6, '0')}`;

  //         // Create cash transaction
  //         const cashTransaction = await tx.cashTransaction.create({
  //           data: {
  //             transactionNo,
  //             cashAccountId,
  //             glAccountId,
  //             contraAccountId: contraAccountId?? null,
  //             transactionType,
  //             amount: new Decimal(amount),
  //             description,
  //             transactionDate: new Date(transactionDate),
  //             reference,
  //             refType: 'OTHER',
  //             refId: null,
  //             userId: req.user!.id
  //           }
  //         });

  //         const balanceChange = transactionType === 'RECEIPT' ? amount : -amount;
  //         await tx.cashAccount.update({
  //           where: { id: cashAccountId },
  //           data: {
  //             balance: {
  //               increment: balanceChange
  //             }
  //           }
  //         });

  //         // Create journal entries for double-entry bookkeeping
  //         const journalCount = await tx.journal.count();
  //         const journalNo = `J${String(journalCount + 1).padStart(6, '0')}`;

  //         const journal = await tx.journal.create({
  //           data: {
  //             journalNo,
  //             date: new Date(transactionDate),
  //             memo: description,
  //             postedBy: req.user!.id
  //           }
  //         });
  //         // console.log("Journal ", journal)
  //         // Get cash account's GL account
  //         const cashAccount = await tx.cashAccount.findUnique({
  //           where: { id: cashAccountId }
  //         });

  //         // console.log("CashAcount", cashAccount)

  //         if (transactionType === 'RECEIPT') {
  //           // Debit Cash Account, Credit GL Account
  //           await tx.journalLine.createMany({
  //             data: [
  //               {
  //                 journalId: journal.id,
  //                 accountId:  cashAccount!.glAccountId!,
  //                 debit: new Decimal(amount),
  //                 credit: new Decimal(0),
  //                 refType: 'CASH_TRANSACTION',
  //                 refId: cashTransaction.id
  //               },
  //               {
  //                 journalId: journal.id,
  //                 accountId: glAccountId,
  //                 debit: new Decimal(0),
  //                 credit: new Decimal(amount),
  //                 refType: 'CASH_TRANSACTION',
  //                 refId: cashTransaction.id
  //               }
  //             ]
  //           });
  //         } else {
  //           // Credit Cash Account, Debit GL Account
  //           await tx.journalLine.createMany({
  //             data: [
  //               {
  //                 journalId: journal.id,
  //                 accountId: glAccountId,
  //                 debit: new Decimal(amount),
  //                 credit: new Decimal(0),
  //                 refType: 'CASH_TRANSACTION',
  //                 refId: cashTransaction.id
  //               },
  //               {
  //                 journalId: journal.id,
  //                 accountId: cashAccount!.glAccountId!,
  //                 debit: new Decimal(0),
  //                 credit: new Decimal(amount),
  //                 refType: 'CASH_TRANSACTION',
  //                 refId: cashTransaction.id
  //               }
  //             ]
  //           });
  //         }

  //         return cashTransaction;
  //       }
  //         ,
  //     {
  //   maxWait: 5000,  // 5s wait for connection
  //   timeout: 20000  // 20s max runtime
  // }
  //     );

  //       res.status(201).json(result);
  //     } catch (error) {
  //       console.error('Create cash transaction error:', error);
  //       res.status(400).json({ error: 'Failed to create cash transaction' });
  //     }
  //   }

  // Create customer payment (Sales Receipt)
  //   async createCustomerPayment(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       customerId,
  //       cashAccountId,
  //       amount,
  //       paymentDate,
  //       reference,
  //       notes,
  //       saleId // optional
  //     } = req.body;

  //     const result = await prisma.$transaction(async (tx) => {
  //       // Generate receipt number
  //       const count = await tx.salesReceipt.count();
  //       const receiptNo = `SR${String(count + 1).padStart(6, '0')}`;

  //       // Fetch sale only if saleId is provided
  //       let sale: { id: string; totalAmount: any; orderNo: string | null; salesReceipts: { amountReceived: any }[] } | null = null;
  //       if (saleId) {
  //         sale = await tx.sale.findUnique({
  //           where: { id: saleId },
  //           include: { salesReceipts: true }
  //         });
  //       }

  //       // Create sales receipt
  //       const receipt = await tx.salesReceipt.create({
  //         data: {
  //           receiptNo,
  //           saleId: saleId? saleId: null,
  //           customerId,
  //           cashAccountId,
  //           amountReceived: new Decimal(amount),
  //           receiptDate: new Date(paymentDate),
  //           notes,
  //           reference,
  //           userId: req.user!.id
  //         }
  //       });

  //       // Update sale status if fully paid
  //       if (sale) {
  //         const totalReceived =
  //           sale.salesReceipts.reduce(
  //             (sum, r) => sum + Number(r.amountReceived),
  //             0
  //           ) + Number(amount);

  //         if (totalReceived >= Number(sale.totalAmount)) {
  //           await tx.sale.update({
  //             where: { id: sale.id },
  //             data: { status: 'PAID' }
  //           });
  //         }
  //       }

  //       // Create corresponding cash transaction
  //       const cashTransactionCount = await tx.cashTransaction.count();
  //       const transactionNo = `CT${String(cashTransactionCount + 1).padStart(6, '0')}`;

  //       // Get Trade Receivables account
  //       const tradeReceivablesAccount = await tx.chartOfAccount.findFirst({
  //         where: { accountType: 'TRADE_RECEIVABLES' }
  //       });
  //       if (!tradeReceivablesAccount) {
  //         throw new Error('Trade Receivables account not found. Please create one first.');
  //       }

  //       // Build transaction description
  //       const customer = await tx.customer.findUnique({
  //         where: { id: customerId },
  //         select: { name: true }
  //       });

  //       let description = `Customer payment from ${customer?.name ?? ''}`;
  //       if (sale?.orderNo) {
  //         description += ` - ${sale.orderNo}`;
  //       }

  //       await tx.cashTransaction.create({
  //         data: {
  //           transactionNo,
  //           cashAccountId,
  //           glAccountId: tradeReceivablesAccount.id,
  //           transactionType: 'RECEIPT',
  //           amount: (new Decimal(amount)),
  //           description,
  //           transactionDate: new Date(paymentDate),
  //           reference,
  //           refType: 'SALES_RECEIPT',
  //           refId: receipt.id,
  //           userId: req.user!.id
  //         }
  //       });

  //       // Update cash account balance
  //       await tx.cashAccount.update({
  //         where: { id: cashAccountId },
  //         data: { balance: { increment: amount } }
  //       });

  //       // Create journal entries
  //       const journalCount = await tx.journal.count();
  //       const journalNo = `J${String(journalCount + 1).padStart(6, '0')}`;

  //       const journal = await tx.journal.create({
  //         data: {
  //           journalNo,
  //           date: new Date(paymentDate),
  //           memo: `Customer payment: ${reference || receiptNo}`,
  //           postedBy: req.user!.id
  //         }
  //       });

  //       // Get cash account's GL account
  //       const cashAccount = await tx.cashAccount.findUnique({
  //         where: { id: cashAccountId },
  //         select: { glAccountId: true }
  //       });
  //       if (!cashAccount) throw new Error('Cash account not found');
  //       if (!cashAccount.glAccountId) throw new Error('Cash account does not have a linked GL account');

  //       // Debit Cash, Credit Trade Receivables
  //       await tx.journalLine.createMany({
  //         data: [
  //           {
  //             journalId: journal.id,
  //             accountId: cashAccount.glAccountId,
  //             debit: new Decimal(amount),
  //             credit: new Decimal(0),
  //             refType: 'CUSTOMER_PAYMENT',
  //             refId: receipt.id
  //           },
  //           {
  //             journalId: journal.id,
  //             accountId: tradeReceivablesAccount.id,
  //             debit: new Decimal(0),
  //             credit: new Decimal(amount),
  //             refType: 'CUSTOMER_PAYMENT',
  //             refId: receipt.id
  //           }
  //         ]
  //       });

  //       return receipt;
  //     }
  //     ,
  //     {
  //   maxWait: 5000,  // 5s wait for connection
  //   timeout: 20000  // 20s max runtime
  // }

  //   );

  //     res.status(201).json(result);
  //   } catch (error) {
  //     console.error('Create customer payment error:', error);
  //     res.status(400).json({ error: 'Failed to create customer payment' });
  //   }
  // }

  async createCustomerPayment(req, res) {
    try {
      const data = req.body;
      console.log("Create Customer Payment Data:", data);

      const payment = await prisma.$transaction(async (tx) => {
        // Generate number
        const count = await tx.customerPayment.count();
        const paymentNo = `CP${String(count + 1).padStart(6, "0")}`;

        const totalAmount = data.lines.reduce(
          (sum, l) => sum + Number(l.lineAmount),
          0,
        );

        // Staged - create PREPARED
        const newPayment = await tx.customerPayment.create({
          data: {
            paymentNo,
            customerId: data.customerId,
            cashAccountId: data.cashAccountId,
            paymentDate: new Date(data.paymentDate),
            reference: data.reference,
            notes: data.notes,
            totalAmount,
            status: "PREPARED",
            preparedBy: req.user.id,
            userId: req.user.id,
          },
        });

        // Lines
        for (const line of data.lines) {
          await tx.customerPaymentLine.create({
            data: {
              customerPaymentId: newPayment.id,
              saleId: line.saleId ? line.saleId : null,
              glAccountId: line.glAccountId,
              lineAmount: line.lineAmount,
              description: line.description,
            },
          });
        }

        return newPayment;
      });

      res.status(201).json(payment);
    } catch (err) {
      res.status(400).json({ error: "Failed to create customer payment" });
    }
  }

  async approveCustomerPayment(req, res) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.customerPayment.findUnique({ where: { id } });

        if (!payment) throw new Error("Payment not found");
        if (payment.status !== "PREPARED")
          throw new Error("Only PREPARED payments can be approved");

        await tx.customerPayment.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
        });
      });

      res.json({ message: "Customer payment approved" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async authorizeCustomerPayment(req, res) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.customerPayment.findUnique({ where: { id } });

        if (!payment) throw new Error("Payment not found");
        if (payment.status !== "APPROVED")
          throw new Error("Only APPROVED payments can be authorized");

        await tx.customerPayment.update({
          where: { id },
          data: {
            status: "AUTHORIZED",
            authorizedBy: req.user.id,
            authorizedAt: new Date(),
          },
        });
      });

      res.json({ message: "Customer payment authorized" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async payCustomerPayment(req, res) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.customerPayment.findUnique({
          where: { id },
          include: {
            lines: true,
            cashAccount: true,
          },
        });

        if (!payment) throw new Error("Payment not found");
        if (payment.status !== "AUTHORIZED")
          throw new Error("Only AUTHORIZED payments can be paid");

        const cashGLAccountId = payment.cashAccount.glAccountId;
        if (!cashGLAccountId)
          throw new Error("Cash account missing GL account");

        // Mark as paid
        await tx.customerPayment.update({
          where: { id },
          data: {
            status: "PAID",
            paidBy: req.user.id,
            paidAt: new Date(),
          },
        });

        // Update cash balance
        await tx.cashAccount.update({
          where: { id: payment.cashAccountId },
          data: {
            balance: {
              increment: payment.totalAmount,
            },
          },
        });

        // Create journal
        const journalCount = await tx.journal.count();
        const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

        const journal = await tx.journal.create({
          data: {
            journalNo,
            date: payment.paymentDate,
            memo: `Customer Payment: ${payment.reference ?? payment.paymentNo}`,
            postedBy: req.user.id,
          },
        });

        // Journal lines for each payment line
        for (const line of payment.lines) {
          await tx.journalLine.createMany({
            data: [
              // Debit Cash account
              {
                journalId: journal.id,
                accountId: cashGLAccountId,
                debit: line.lineAmount,
                credit: new Decimal(0),
                refType: "CUSTOMER_PAYMENT",
                refId: payment.id,
              },
              // Credit Receivable or mapped GL
              {
                journalId: journal.id,
                accountId: line.glAccountId,
                debit: new Decimal(0),
                credit: line.lineAmount,
                refType: "CUSTOMER_PAYMENT",
                refId: payment.id,
              },
            ],
          });

          // If sale exists → update amount received
          if (line.saleId) {
            const sale = await tx.sale.findUnique({
              where: { id: line.saleId },
              include: { salesReceipts: true },
            });

            const previouslyPaid = sale.salesReceipts.reduce(
              (s, r) => s + Number(r.amountReceived),
              0,
            );

            if (
              previouslyPaid + Number(line.lineAmount) >=
              Number(sale.totalAmount)
            ) {
              await tx.sale.update({
                where: { id: sale.id },
                data: { status: "PAID" },
              });
            }
          }
        }

        await tx.customerPaymentPosting.create({
          data: {
            customerPaymentId: payment.id,
            journalId: journal.id,
            postedBy: req.user.id,
          },
        });
      });

      res.json({ message: "Customer payment paid successfully" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getCustomerPayments(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        customerId,
        cashAccountId,
        status,
        startDate,
        endDate,
        search,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Build filters
      const filters: any = {};

      if (customerId) filters.customerId = customerId;
      if (cashAccountId) filters.cashAccountId = cashAccountId;
      if (status) filters.status = status;

      // Date range
      if (startDate || endDate) {
        filters.paymentDate = {};
        if (startDate) filters.paymentDate.gte = new Date(startDate);
        if (endDate) filters.paymentDate.lte = new Date(endDate);
      }

      // Search filter
      if (search) {
        filters.OR = [
          { paymentNo: { contains: search, mode: "insensitive" } },
          { reference: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ];
      }

      // Query with relations
      const [payments, total] = await Promise.all([
        prisma.customerPayment.findMany({
          where: filters,
          skip,
          take,
          orderBy: { paymentDate: "desc" },
          include: {
            customer: true,
            cashAccount: true,
            user: true, // created by
            preparer: true, // preparedBy
            approver: true, // approvedBy
            authorizer: true, // authorizedBy
            payer: true, // paidBy
            lines: {
              include: {
                sale: {
                  select: {
                    id: true,
                    saleLines: true,
                    totalAmount: true,
                  },
                },
                glAccount: true,
              },
            },
            postings: true,
          },
        }),

        prisma.customerPayment.count({ where: filters }),
      ]);

      res.json({
        data: payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch customer payments" });
    }
  }

  async getCustomerPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await prisma.customerPayment.findUnique({
        where: { id },
        include: {
          customer: true,
          cashAccount: true,
          user: true, // created by
          preparer: true, // preparedBy
          approver: true, // approvedBy
          authorizer: true, // authorizedBy
          payer: true, // paidBy
          postings: true,
          lines: {
            include: {
              glAccount: true,
              sale: {
                select: {
                  id: true,
                  saleLines: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Customer payment not found" });
      }

      res.json(payment);
    } catch (err) {
      console.error("getCustomerPayment error:", err);
      res.status(500).json({ error: "Failed to fetch customer payment" });
    }
  }

  async updateCustomerPayment(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedPayment = await prisma.$transaction(async (tx) => {
        const payment = await tx.customerPayment.findUnique({
          where: { id },
          include: { lines: true },
        });

        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }

        if (payment.status !== "PREPARED") {
          return res.status(400).json({
            error: "Only PREPARED payments can be updated",
          });
        }

        // Calculate new total
        const totalAmount = data.lines.reduce(
          (sum, l) => sum + Number(l.lineAmount),
          0,
        );

        // Update header
        const header = await tx.customerPayment.update({
          where: { id },
          data: {
            customerId: data.customerId,
            cashAccountId: data.cashAccountId,
            paymentDate: new Date(data.paymentDate),
            reference: data.reference,
            notes: data.notes,
            totalAmount,
            userId: req.user.id,
          },
        });

        // Remove old lines
        await tx.customerPaymentLine.deleteMany({
          where: { customerPaymentId: id },
        });

        // Insert new lines
        for (const line of data.lines) {
          await tx.customerPaymentLine.create({
            data: {
              customerPaymentId: id,
              saleId: line.saleId ?? null,
              glAccountId: line.glAccountId,
              lineAmount: line.lineAmount,
              description: line.description,
            },
          });
        }

        return header;
      });

      res.json(updatedPayment);
    } catch (err) {
      console.log(err);
      res.status(400).json({ error: "Failed to update payment" });
    }
  }

  async deleteCustomerPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await prisma.customerPayment.findUnique({
        where: { id },
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.status !== "PREPARED") {
        return res.status(400).json({
          error: "Only PREPARED payments can be deleted",
        });
      }

      await prisma.customerPayment.delete({
        where: { id },
      });

      res.json({ message: "Payment deleted successfully" });
    } catch (err) {
      res.status(400).json({ error: "Failed to delete payment" });
    }
  }

  async printCustomerPayment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const payment = await prisma.customerPayment.findUnique({
        where: { id },
        include: {
          customer: true,
          cashAccount: true,
          user: true, // created by
          preparer: true, // preparedBy
          approver: true, // approvedBy
          authorizer: true, // authorizedBy
          payer: true, // paidBy
          postings: true,
          lines: {
            include: {
              glAccount: true,
              sale: {
                select: {
                  id: true,
                  saleLines: true,
                  totalAmount: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Customer payment not found" });
      }

      if (!["INVOICED", "PAID"].includes(payment.status)) {
        return res
          .status(400)
          .json({ error: "Customer Payment must be invoiced to print" });
      }

      res.json({
        payment,
        printData: {
          title: "Customer Payment",
          documentNo: payment.paymentNo,
          date: payment.paymentDate,
          status: payment.status,
          lines: payment.lines,
          total: payment.totalAmount,
        },
      });
    } catch (error) {
      console.error("Print Customer Payment error:", error);
      res.status(500).json({ error: "Failed to generate Customer Payment" });
    }
  }

  async createCustomerRefund(req: AuthRequest, res: Response) {
    try {
      const {
        customerId,
        cashAccountId,
        amount,
        refundDate,
        reference,
        notes,
        saleId, // optional: refund linked to sale
        originalReceiptId, // optional: if refund relates to a specific receipt
      } = req.body;

      const result = await prisma.$transaction(
        async (tx) => {
          // Generate refund number
          const refundCount = await tx.salesRefund.count();
          const refundNo = `RF${String(refundCount + 1).padStart(6, "0")}`;

          // Fetch sale if provided
          let sale: {
            id: string;
            totalAmount: any;
            orderNo: string | null;
            salesReceipts: { amountReceived: any }[];
          } | null = null;

          if (saleId) {
            sale = await tx.sale.findUnique({
              where: { id: saleId },
              include: { salesReceipts: true },
            });
          }

          // Create refund record
          const refund = await tx.salesRefund.create({
            data: {
              refundNo,
              saleId: saleId ?? null,
              customerId,
              cashAccountId,
              amountRefunded: new Decimal(amount),
              refundDate: new Date(refundDate),
              notes,
              reference,
              originalReceiptId,
              userId: req.user!.id,
            },
          });

          // Update sale payment status if fully refunded
          if (sale) {
            const totalReceived = sale.salesReceipts.reduce(
              (sum, r) => sum + Number(r.amountReceived),
              0,
            );
            const totalRefunded = await tx.salesRefund.aggregate({
              _sum: { amountRefunded: true },
              where: { saleId: sale.id },
            });

            const netReceived =
              totalReceived -
              (Number(totalRefunded._sum.amountRefunded) || 0) -
              Number(amount);

            if (netReceived <= 0) {
              await tx.sale.update({
                where: { id: sale.id },
                data: { status: "INVOICED" },
              });
            }
          }

          // Generate cash transaction for refund
          const cashTransactionCount = await tx.cashTransaction.count();
          const transactionNo = `CT${String(cashTransactionCount + 1).padStart(
            6,
            "0",
          )}`;

          const tradeReceivablesAccount = await tx.chartOfAccount.findFirst({
            where: { accountType: "TRADE_RECEIVABLES" },
          });
          if (!tradeReceivablesAccount) {
            throw new Error(
              "Trade Receivables account not found. Please create one first.",
            );
          }

          // Get customer info for description
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
            select: { name: true },
          });

          let description = `Customer refund to ${customer?.name ?? ""}`;
          if (sale?.orderNo) description += ` - ${sale.orderNo}`;

          await tx.cashTransaction.create({
            data: {
              transactionNo,
              cashAccountId,
              transactionType: "PAYMENT",
              amount: new Decimal(amount),
              description,
              transactionDate: new Date(refundDate),
              reference,
              refType: "CUSTOMER_REFUND",
              refId: refund.id,
              glAccountId: tradeReceivablesAccount.id,

              // REQUIRED fields
              userId: req.user!.id,
              preparedBy: req.user!.id, // REQUIRED by your model

              // Status defaults handled by Prisma
            },
          });

          // await tx.cashTransaction.create({
          //   data: {
          //     transactionNo,
          //     cashAccountId,
          //     glAccountId: tradeReceivablesAccount.id,
          //     transactionType: "PAYMENT", // cash going out
          //     amount: new Decimal(amount),
          //     description,
          //     transactionDate: new Date(refundDate),
          //     reference,
          //     refType: "CUSTOMER_REFUND",
          //     refId: refund.id,
          //     userId: req.user!.id,
          //   },
          // });

          // Decrease cash account balance
          await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { balance: { decrement: amount } },
          });

          // Create journal entries
          const journalCount = await tx.journal.count();
          const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

          const journal = await tx.journal.create({
            data: {
              journalNo,
              date: new Date(refundDate),
              memo: `Customer refund: ${reference || refundNo}`,
              postedBy: req.user!.id,
            },
          });

          // Get cash account GL account
          const cashAccount = await tx.cashAccount.findUnique({
            where: { id: cashAccountId },
            select: { glAccountId: true },
          });
          if (!cashAccount || !cashAccount.glAccountId)
            throw new Error("Cash account GL not linked or not found");

          // Journal lines — reverse of receipt
          await tx.journalLine.createMany({
            data: [
              {
                journalId: journal.id,
                accountId: tradeReceivablesAccount.id, // DR Receivable
                debit: new Decimal(amount),
                credit: new Decimal(0),
                refType: "CUSTOMER_REFUND",
                refId: refund.id,
              },
              {
                journalId: journal.id,
                accountId: cashAccount.glAccountId, // CR Cash
                debit: new Decimal(0),
                credit: new Decimal(amount),
                refType: "CUSTOMER_REFUND",
                refId: refund.id,
              },
            ],
          });

          return refund;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Create customer refund error:", error);
      res.status(400).json({ error: "Failed to process customer refund" });
    }
  }

  // Create vendor payment (Purchase Payment)
  //   async createVendorPayment(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       vendorId,
  //       cashAccountId,
  //       amount,
  //       paymentDate,
  //       reference,
  //       notes,
  //       purchaseId // optional now
  //     } = req.body;

  //     const result = await prisma.$transaction(async (tx) => {
  //       // Generate payment number
  //       const count = await tx.purchasePayment.count();
  //       const paymentNo = `PP${String(count + 1).padStart(6, '0')}`;

  //       // Fetch purchase if purchaseId exists
  //       let purchase: { id: string; totalAmount: any; orderNo: string | null; purchasePayments: { amountPaid: any }[] } | null = null;
  //       if (purchaseId) {
  //         purchase = await tx.purchase.findUnique({
  //           where: { id: purchaseId },
  //           include: { purchasePayments: true }
  //         });
  //       }

  //       // Create purchase payment
  //       const payment = await tx.purchasePayment.create({
  //         data: {
  //           paymentNo,
  //           purchaseId:purchaseId?purchaseId: null, // only include if provided
  //           vendorId,
  //           cashAccountId,
  //           amountPaid: new Decimal(amount),
  //           paymentDate: new Date(paymentDate),
  //           notes,
  //           reference,
  //           userId: req.user!.id
  //         }
  //       });

  //       // Update purchase status if fully paid
  //       if (purchase) {
  //         const totalPaid =
  //           purchase.purchasePayments.reduce(
  //             (sum, p) => sum + Number(p.amountPaid),
  //             0
  //           ) + Number(amount);

  //         if (totalPaid >= Number(purchase.totalAmount)) {
  //           await tx.purchase.update({
  //             where: { id: purchase.id },
  //             data: { status: 'PAID' }
  //           });
  //         }
  //       }

  //       // Create corresponding cash transaction
  //       const cashTransactionCount = await tx.cashTransaction.count();
  //       const transactionNo = `CT${String(cashTransactionCount + 1).padStart(6, '0')}`;

  //       // Get Trade Payables account
  //       const tradePayablesAccount = await tx.chartOfAccount.findFirst({
  //         where: {
  //           OR: [
  //             { accountType: 'TRADE_PAYABLES' },
  //             { code: '2000' },
  //             // { name: { contains: 'Payable', mode: 'insensitive' } }
  //           ]
  //         }
  //       });
  //       if (!tradePayablesAccount) {
  //         throw new Error('No payables account found. Please create a Trade Payables or Accounts Payable account in Chart of Accounts first.');
  //       }

  //       // Build description
  //       const vendor = await tx.vendor.findUnique({
  //         where: { id: vendorId },
  //         select: { name: true }
  //       });

  //       let description = `Vendor payment to ${vendor?.name ?? ''}`;
  //       if (purchase?.orderNo) {
  //         description += ` - ${purchase.orderNo}`;
  //       }

  //       await tx.cashTransaction.create({
  //         data: {
  //           transactionNo,
  //           cashAccountId,
  //           glAccountId: tradePayablesAccount.id,
  //           transactionType: 'PAYMENT',
  //           amount: new Decimal(amount),
  //           description,
  //           transactionDate: new Date(paymentDate),
  //           reference,
  //           refType: 'PURCHASE_PAYMENT',
  //           refId: payment.id,
  //           userId: req.user!.id,
  //            preparedBy: req.user!.id,
  //         }
  //       });

  //       // Update cash account balance
  //       await tx.cashAccount.update({
  //         where: { id: cashAccountId },
  //         data: { balance: { decrement: amount } }
  //       });

  //       // Create journal entries
  //       const journalCount = await tx.journal.count();
  //       const journalNo = `J${String(journalCount + 1).padStart(6, '0')}`;

  //       const journal = await tx.journal.create({
  //         data: {
  //           journalNo,
  //           date: new Date(paymentDate),
  //           memo: `Vendor payment: ${reference || paymentNo}`,
  //           postedBy: req.user!.id
  //         }
  //       });

  //       // Get cash account's GL account
  //       const cashAccount = await tx.cashAccount.findUnique({
  //         where: { id: cashAccountId },
  //         select: { glAccountId: true }
  //       });
  //       if (!cashAccount) throw new Error('Cash account not found');
  //       if (!cashAccount.glAccountId) throw new Error('Cash account does not have a linked GL account');

  //       // Debit Trade Payables, Credit Cash
  //       await tx.journalLine.createMany({
  //         data: [
  //           {
  //             journalId: journal.id,
  //             accountId: tradePayablesAccount.id,
  //             debit: new Decimal(amount),
  //             credit: new Decimal(0),
  //             refType: 'VENDOR_PAYMENT',
  //             refId: payment.id
  //           },
  //           {
  //             journalId: journal.id,
  //             accountId: cashAccount.glAccountId,
  //             debit: new Decimal(0),
  //             credit: new Decimal(amount),
  //             refType: 'VENDOR_PAYMENT',
  //             refId: payment.id
  //           }
  //         ]
  //       });

  //       return payment;
  //     }, {
  //       maxWait: 5000, // 5s wait
  //       timeout: 20000 // 20s max runtime
  //     });

  //     res.status(201).json(result);
  //   } catch (error) {
  //     console.error('Create vendor payment error:', error);
  //     res.status(400).json({ error: 'Failed to create vendor payment' });
  //   }
  // }

  async createVendorPayment(req, res) {
    try {
      const data = req.body;
      // console.log("data line", data.lines);

      const payment = await prisma.$transaction(async (tx) => {
        const count = await tx.vendorPayment.count();
        const paymentNo = `VP${String(count + 1).padStart(6, "0")}`;

        const totalAmount = data.lines.reduce(
          (s, l) => s + Number(l.lineAmount),
          0,
        );

        // Create PREPARED payment
        const newPayment = await tx.vendorPayment.create({
          data: {
            paymentNo,
            vendorId: data.vendorId,
            cashAccountId: data.cashAccountId,
            paymentDate: new Date(data.paymentDate),
            reference: data.reference,
            notes: data.notes,
            totalAmount,
            status: "PREPARED",
            preparedBy: req.user.id,
            userId: req.user.id,
          },
        });

        // Create lines
        for (const line of data.lines) {
          await tx.vendorPaymentLine.create({
            data: {
              vendorPaymentId: newPayment.id,
              purchaseId: line.purchaseId ?? null,
              glAccountId: line.glAccountId,
              lineAmount: line.lineAmount,
              description: line.description,
            },
          });
        }

        return newPayment;
      });

      res.status(201).json(payment);
    } catch (err) {
      res.status(400).json({ error: "Failed to create vendor payment" });
    }
  }

  async approveVendorPayment(req, res) {
    try {
      const { id } = req.params;

      await prisma.vendorPayment.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: req.user.id,
          approvedAt: new Date(),
        },
      });

      res.json({ message: "Vendor payment approved" });
    } catch (err) {
      res.status(400).json({ error: "Failed to approve vendor payment" });
    }
  }

  async authorizeVendorPayment(req, res) {
    try {
      const { id } = req.params;

      await prisma.vendorPayment.update({
        where: { id },
        data: {
          status: "AUTHORIZED",
          authorizedBy: req.user.id,
          authorizedAt: new Date(),
        },
      });

      res.json({ message: "Vendor payment authorized" });
    } catch (err) {
      res.status(400).json({ error: "Failed to authorize vendor payment" });
    }
  }

  async payVendorPayment(req, res) {
    try {
      const { id } = req.params;
      await prisma.$transaction(async (tx) => {
        const payment = await tx.vendorPayment.findUnique({
          where: { id },
          include: { lines: true, cashAccount: true },
        });
        // console.log("Processing payment for vendor payment :", payment);

        if (!payment) throw new Error("Payment not found");
        if (payment.status !== "AUTHORIZED")
          throw new Error("Only AUTHORIZED payments can be paid");

        const cashGL = payment.cashAccount.glAccountId;
        if (!cashGL) throw new Error("Cash account missing GL");

        // Mark as paid
        await tx.vendorPayment.update({
          where: { id },
          data: {
            status: "PAID",
            paidBy: req.user.id,
            paidAt: new Date(),
          },
        });

        // Cash balance decreases
        await tx.cashAccount.update({
          where: { id: payment.cashAccountId },
          data: { balance: { decrement: payment.totalAmount } },
        });

        // Journal
        const count = await tx.journal.count();
        const journalNo = `J${String(count + 1).padStart(6, "0")}`;

        const journal = await tx.journal.create({
          data: {
            journalNo,
            date: payment.paymentDate,
            memo: `Vendor payment: ${payment.reference ?? payment.paymentNo}`,
            postedBy: req.user.id,
          },
        });
        // console.log('payment lines', payment.lines)
        // Each line
        for (const line of payment.lines) {
          await tx.journalLine.createMany({
            data: [
              // Debit GL expense/payable
              {
                journalId: journal.id,
                accountId: line.glAccountId,
                debit: line.lineAmount,
                credit: 0,
                refType: "VENDOR_PAYMENT",
                refId: payment.id,
              },
              // Credit Cash
              {
                journalId: journal.id,
                accountId: cashGL,
                debit: 0,
                credit: line.lineAmount,
                refType: "VENDOR_PAYMENT",
                refId: payment.id,
              },
            ],
          });

          // If purchase exists, update purchase status
          if (line.purchaseId) {
            const purchase = await tx.purchase.findUnique({
              where: { id: line.purchaseId },
            });

            if (!purchase) continue;

            const newAmountPaid =
              Number(purchase.amountPaid) + Number(line.lineAmount);

            const balanceAmount = Number(purchase.totalAmount) - newAmountPaid;

            let status:
              | "DRAFT"
              | "ORDERED"
              | "RECEIVED"
              | "INVOICED"
              | "RETURNED"
              | "PARTIALLY_PAID"
              | "PAID" = purchase.status;

            if (newAmountPaid >= Number(purchase.totalAmount)) {
              status = "PAID";
            } else if (newAmountPaid > 0) {
              status = "PARTIALLY_PAID";
            }

            await tx.purchase.update({
              where: { id: purchase.id },
              data: {
                amountPaid: newAmountPaid,
                balanceAmount: Math.max(balanceAmount, 0),
                status,
              },
            });
          }
        }

        await tx.vendorPaymentPosting.create({
          data: {
            vendorPaymentId: payment.id,
            journalId: journal.id,
            postedBy: req.user.id,
          },
        });
      });

      res.json({ message: "Vendor payment posted" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async updateVendorPayment(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // Ensure payment exists
        const existing = await tx.vendorPayment.findUnique({
          where: { id },
        });

        if (!existing) {
          return res.status(404).json({ error: "Vendor payment not found" });
        }

        // Calculate total amount again
        const totalAmount = data.lines.reduce(
          (sum, l) => sum + Number(l.lineAmount),
          0,
        );

        // Update main record
        const payment = await tx.vendorPayment.update({
          where: { id },
          data: {
            vendorId: data.vendorId,
            cashAccountId: data.cashAccountId,
            paymentDate: new Date(data.paymentDate),
            reference: data.reference,
            notes: data.notes,
            totalAmount,
            // Do NOT reset preparedBy or userId
          },
        });

        // Delete old lines
        await tx.vendorPaymentLine.deleteMany({
          where: { vendorPaymentId: id },
        });

        // Insert new lines
        for (const line of data.lines) {
          await tx.vendorPaymentLine.create({
            data: {
              vendorPaymentId: id,
              purchaseId: line.purchaseId ?? null,
              glAccountId: line.glAccountId,
              lineAmount: line.lineAmount,
              description: line.description,
            },
          });
        }

        return payment;
      });

      res.json(result);
    } catch (err) {
      console.log(err);
      res.status(400).json({ error: "Failed to update vendor payment" });
    }
  }

  async getVendorPayments(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        vendorId,
        status,
        dateFrom,
        dateTo,
      } = req.query;

      const where: any = {};

      if (vendorId) where.vendorId = vendorId;
      if (status) where.status = status;
      if (dateFrom || dateTo) {
        where.paymentDate = {};
        if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
        if (dateTo) where.paymentDate.lte = new Date(dateTo);
      }

      const payments = await prisma.vendorPayment.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { paymentDate: "desc" },

        include: {
          vendor: true,
          cashAccount: true,
          preparer: true,
          authorizer: true,
          approver: true,
          payer: true,
          lines: {
            include: {
              purchase: {
                select: {
                  id: true,
                  purchaseLines: true,
                  totalAmount: true,
                },
              },
              glAccount: true,
            },
          },
        },
      });

      const count = await prisma.vendorPayment.count({ where });

      res.json({
        data: payments,
        pagination: {
          limit: Number(limit),
          page: Number(page),
          pages: Math.ceil(count / Number(limit)),
          total: count,
        },
      });
    } catch (err) {
      res.status(400).json({ error: "Failed to fetch vendor payments" });
    }
  }

  async getVendorPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await prisma.vendorPayment.findUnique({
        where: { id },
        include: {
          vendor: true,
          cashAccount: true,
          preparer: true,
          approver: true,
          authorizer: true,
          payer: true,
          lines: {
            include: {
              purchase: true,
              glAccount: true,
            },
          },
          postings: {
            include: {
              journal: true,
              postedByUser: true,
              user: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Vendor payment not found" });
      }

      res.json(payment);
    } catch (err) {
      res.status(400).json({ error: "Failed to fetch vendor payment" });
    }
  }

  async printVendorPayment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const payment = await prisma.vendorPayment.findUnique({
        where: { id },
        include: {
          vendor: true,
          cashAccount: true,
          preparer: true,
          approver: true,
          authorizer: true,
          payer: true,
          lines: {
            include: {
              purchase: true,
              glAccount: true,
            },
          },
          postings: {
            include: {
              journal: true,
              postedByUser: true,
              user: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ error: "Vendor payment not found" });
      }

      if (!["INVOICED", "PAID"].includes(payment.status)) {
        return res
          .status(400)
          .json({ error: "Vendor Payment must be invoiced to print" });
      }

      res.json({
        payment,
        printData: {
          title: "Vendor Payment",
          documentNo: payment.paymentNo,
          date: payment.paymentDate,
          status: payment.status,
          lines: payment.lines,
          total: payment.totalAmount,
        },
      });
    } catch (error) {
      console.error("Print Vendor Payment error:", error);
      res.status(500).json({ error: "Failed to generate Vendor Payment" });
    }
  }

  async deleteVendorPayment(req, res) {
    try {
      const { id } = req.params;

      // Check if posted
      const posted = await prisma.vendorPaymentPosting.findFirst({
        where: { vendorPaymentId: id },
      });

      if (posted) {
        return res.status(400).json({
          error: "Cannot delete a payment that has already been posted",
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.vendorPaymentLine.deleteMany({
          where: { vendorPaymentId: id },
        });

        await tx.vendorPayment.delete({
          where: { id },
        });
      });

      res.json({ message: "Vendor payment deleted successfully" });
    } catch (err) {
      res.status(400).json({ error: "Failed to delete vendor payment" });
    }
  }

  //Create Vendor refund
  async createVendorRefund(req: AuthRequest, res: Response) {
    try {
      const {
        vendorId,
        cashAccountId,
        amount,
        refundDate,
        reference,
        notes,
        purchaseId, // optional
      } = req.body;

      const result = await prisma.$transaction(
        async (tx) => {
          // Generate refund number
          const count = await tx.purchaseRefund.count();
          const refundNo = `PR${String(count + 1).padStart(6, "0")}`;

          // Fetch related purchase if exists
          let purchase: {
            id: string;
            totalAmount: any;
            orderNo: string | null;
          } | null = null;

          if (purchaseId) {
            purchase = await tx.purchase.findUnique({
              where: { id: purchaseId },
              select: {
                id: true,
                totalAmount: true,
                orderNo: true,
                purchasePayments: true,
              },
            });
          }
          // Update purchase status if fully refunded

          // Create the refund record
          const refund = await tx.purchaseRefund.create({
            data: {
              refundNo,
              purchaseId: purchaseId ? purchaseId : null,
              vendorId,
              cashAccountId,
              amount: new Decimal(amount),
              refundDate: new Date(refundDate),
              reference,
              notes,
              userId: req.user!.id,
            },
          });

          if (purchase) {
            // const totalRefunded =
            //   purchase.purchaseRefund.reduce(
            //     (sum, p) => sum + Number(p.amountPaid),
            //     0
            //   ) + Number(amount);

            if (amount >= Number(purchase.totalAmount)) {
              await tx.purchase.update({
                where: { id: purchase.id },
                data: { status: "INVOICED" },
              });
            }
          }

          // Create a corresponding cash transaction
          const cashTransactionCount = await tx.cashTransaction.count();
          const transactionNo = `CT${String(cashTransactionCount + 1).padStart(
            6,
            "0",
          )}`;

          // Get Trade Payables GL account
          const tradePayablesAccount = await tx.chartOfAccount.findFirst({
            where: {
              OR: [{ accountType: "TRADE_PAYABLES" }, { code: "2000" }],
            },
          });

          if (!tradePayablesAccount) {
            throw new Error(
              "No Trade Payables account found. Please create one in Chart of Accounts first.",
            );
          }

          // Build transaction description
          const vendor = await tx.vendor.findUnique({
            where: { id: vendorId },
            select: { name: true },
          });

          let description = `Vendor refund from ${vendor?.name ?? ""}`;
          if (purchase?.orderNo) description += ` - ${purchase.orderNo}`;

          await tx.cashTransaction.create({
            data: {
              transactionNo,
              cashAccountId,
              glAccountId: tradePayablesAccount.id,
              transactionType: "REFUND",
              amount: new Decimal(amount),
              description,
              transactionDate: new Date(refundDate),
              reference,
              refType: "PURCHASE_REFUND",
              refId: refund.id,
              userId: req.user!.id,
              preparedBy: req.user!.id,
            },
          });

          // Update cash account balance (refund increases cash)
          await tx.cashAccount.update({
            where: { id: cashAccountId },
            data: { balance: { increment: amount } },
          });

          // Create Journal Entries
          const journalCount = await tx.journal.count();
          const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

          const journal = await tx.journal.create({
            data: {
              journalNo,
              date: new Date(refundDate),
              memo: `Vendor refund: ${reference || refundNo}`,
              postedBy: req.user!.id,
            },
          });

          // Get cash account's linked GL account
          const cashAccount = await tx.cashAccount.findUnique({
            where: { id: cashAccountId },
            select: { glAccountId: true },
          });

          if (!cashAccount) throw new Error("Cash account not found");
          if (!cashAccount.glAccountId)
            throw new Error("Cash account does not have a linked GL account");

          //  Debit Cash, Credit Trade Payables
          await tx.journalLine.createMany({
            data: [
              {
                journalId: journal.id,
                accountId: cashAccount.glAccountId,
                debit: new Decimal(amount),
                credit: new Decimal(0),
                refType: "VENDOR_REFUND",
                refId: refund.id,
              },
              {
                journalId: journal.id,
                accountId: tradePayablesAccount.id,
                debit: new Decimal(0),
                credit: new Decimal(amount),
                refType: "VENDOR_REFUND",
                refId: refund.id,
              },
            ],
          });

          return refund;
        },
        {
          maxWait: 5000, // 5s wait
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Create vendor refund error:", error);
      res.status(400).json({ error: "Failed to create vendor refund" });
    }
  }

  async getVendorRefunds(req: AuthRequest, res: Response) {
    try {
      const refunds = await prisma.purchaseRefund.findMany({
        include: {
          vendor: {
            select: { name: true },
          },
          cashAccount: {
            select: { name: true, accountType: true },
          },
          user: {
            select: { name: true },
          },
          purchase: {
            select: { orderNo: true, totalAmount: true },
          },
        },
        orderBy: {
          refundDate: "desc",
        },
      });

      // Optional formatting (for frontend tables)
      const formatted = refunds.map((r) => ({
        id: r.id,
        refundNo: r.refundNo,
        refundDate: r.refundDate,
        vendorName: r.vendor?.name || "",
        cashAccount: r.cashAccount || "",
        purchaseOrderNo: r.purchase?.orderNo || "",
        amount: Number(r.amount),
        reference: r.reference,
        notes: r.notes,
        userName: r.user?.name || "",
        createdAt: r.createdAt,
      }));

      res.json({ data: formatted });
    } catch (error) {
      console.error("Get vendor refunds error:", error);
      res.status(500).json({ error: "Failed to fetch vendor refunds" });
    }
  }

  // Get sales receipts
  async getSalesReceipts(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, customerId, cashAccountId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (customerId) where.customerId = customerId;
      if (cashAccountId) where.cashAccountId = cashAccountId;

      const [receipts, total] = await Promise.all([
        prisma.salesReceipt.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            sale: {
              select: { orderNo: true, totalAmount: true, status: true },
            },
            customer: {
              select: { code: true, name: true },
            },
            cashAccount: {
              select: { code: true, name: true, accountType: true },
            },
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salesReceipt.count({ where }),
      ]);

      res.json({
        receipts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get sales receipts error:", error);
      res.status(500).json({ error: "Failed to fetch sales receipts" });
    }
  }
  //Get sales refunds
  async getCustomerRefunds(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, customerId, cashAccountId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (customerId) where.customerId = customerId;
      if (cashAccountId) where.cashAccountId = cashAccountId;

      const [refunds, total] = await Promise.all([
        prisma.salesRefund.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            sale: {
              select: { orderNo: true, totalAmount: true, status: true },
            },
            customer: {
              select: { code: true, name: true },
            },
            cashAccount: {
              select: { code: true, name: true, accountType: true },
            },
            user: {
              select: { name: true },
            },
            originalReceipt: {
              select: {
                receiptNo: true,
                receiptDate: true,
                amountReceived: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salesRefund.count({ where }),
      ]);

      res.json({
        refunds,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get sales refunds error:", error);
      res.status(500).json({ error: "Failed to fetch sales refunds" });
    }
  }

  // Get purchase payments
  async getPurchasePayments(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        vendorId,
        cashAccountId,
        paymentStatus,
      } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (vendorId) where.vendorId = vendorId;
      if (cashAccountId) where.cashAccountId = cashAccountId;
      // if (paymentStatus === "OUTSTANDING") {
      //   where.status = {
      //     in: ["INVOICED", "PARTIALLY_PAID"],
      //   };
      // }
      const [payments, total] = await Promise.all([
        prisma.purchasePayment.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            purchase: {
              select: { orderNo: true, totalAmount: true, status: true },
            },
            vendor: {
              select: { code: true, name: true },
            },
            cashAccount: {
              select: { code: true, name: true, accountType: true },
            },
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.purchasePayment.count({ where }),
      ]);

      res.json({
        payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get purchase payments error:", error);
      res.status(500).json({ error: "Failed to fetch purchase payments" });
    }
  }

  // Get cashbook with running balance
  async getCashbook(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        cashAccountId,
        dateFrom,
        dateTo,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (cashAccountId) where.cashAccountId = cashAccountId;
      if (dateFrom || dateTo) {
        where.transactionDate = {};
        if (dateFrom) where.transactionDate.gte = new Date(dateFrom as string);
        if (dateTo) where.transactionDate.lte = new Date(dateTo as string);
      }

      // Get transactions for running balance calculation
      const allTransactions = await prisma.cashTransaction.findMany({
        where,
        include: {
          cashAccount: true,
          // glAccount: true,
          //contraAccount: true,
          user: {
            select: { name: true },
          },
        },
        orderBy: { transactionDate: "asc" },
      });

      // Calculate running balances
      let runningBalance = 0;
      const transactionsWithBalance = allTransactions.map((transaction) => {
        const amount = Number(transaction.amount);
        runningBalance +=
          transaction.transactionType === "RECEIPT" ? amount : -amount;

        return {
          ...transaction,
          runningBalance,
        };
      });

      // Apply pagination to the result
      const total = transactionsWithBalance.length;
      const paginatedTransactions = transactionsWithBalance
        .reverse() // Show newest first
        .slice(skip, skip + Number(limit));

      res.json({
        transactions: paginatedTransactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get cashbook error:", error);
      res.status(500).json({ error: "Failed to fetch cashbook" });
    }
  }

  // Bank reconciliation
  // async getBankReconciliation(req: AuthRequest, res: Response) {
  //   try {
  //     const { cashAccountId, statementDate } = req.query;

  //     if (!cashAccountId || !statementDate) {
  //       return res.status(400).json({ error: 'Cash account and statement date are required' });
  //     }

  //     // Get all transactions up to statement date
  //     const transactions = await prisma.cashTransaction.findMany({
  //       where: {
  //         cashAccountId: cashAccountId as string,
  //         transactionDate: { lte: new Date(statementDate as string) }
  //       },
  //       include: {
  //         glAccount: true
  //       },
  //       orderBy: { transactionDate: 'asc' }
  //     });

  // Get unreconciled transactions
  // const unreconciledTransactions = await prisma.cashTransaction.findMany({
  //   where: {
  //     cashAccountId: cashAccountId as string,
  //     isReconciled: false,
  //     transactionDate: { lte: new Date(statementDate as string) }
  //   },
  //   include: {
  //     glAccount: true
  //   },
  //   orderBy: { transactionDate: 'asc' }
  // });

  // Calculate book balance
  //     const bookBalance = transactions.reduce((balance, transaction) => {
  //       return transaction.transactionType === 'RECEIPT'
  //         ? balance + Number(transaction.amount)
  //         : balance - Number(transaction.amount);
  //     }, 0);

  //     res.json({
  //       transactions,
  //       unreconciledTransactions,
  //       bookBalance,
  //       statementDate
  //     });
  //   } catch (error) {
  //     console.error('Get bank reconciliation error:', error);
  //     res.status(500).json({ error: 'Failed to fetch bank reconciliation' });
  //   }
  // }

  // Mark transactions as reconciled
  // async reconcileTransactions(req: AuthRequest, res: Response) {
  //   try {
  //     const { transactionIds, statementBalance, reconciliationDate, cashAccountId } = req.body;

  //     await prisma.$transaction(async (tx) => {
  //       // Mark transactions as reconciled
  //       await tx.cashTransaction.updateMany({
  //         where: { id: { in: transactionIds } },
  //         data: {
  //           isReconciled: true,
  //           reconciledAt: new Date(reconciliationDate)
  //         }
  //       });

  //       // Create reconciliation record
  //       await tx.bankReconciliation.create({
  //         data: {
  //           cashAccountId,
  //           statementDate: new Date(reconciliationDate),
  //           statementBalance: new Decimal(statementBalance),
  //           bookBalance: new Decimal(req.body.bookBalance),
  //           reconciledBy: req.user!.id
  //         }
  //       });
  //     });

  //     res.json({ message: 'Transactions reconciled successfully' });
  //   } catch (error) {
  //     console.error('Reconcile transactions error:', error);
  //     res.status(400).json({ error: 'Failed to reconcile transactions' });
  //   }
  // }

  // // Import bank statement from CSV
  // async importBankStatement(req: AuthRequest, res: Response) {
  //   try {
  //     const { cashAccountId, csvData } = req.body;

  //     if (!csvData || !Array.isArray(csvData)) {
  //       return res.status(400).json({ error: 'Invalid CSV data' });
  //     }

  //     const importedTransactions = [];

  //     await prisma.$transaction(async (tx) => {
  //       for (const row of csvData) {
  //         const {
  //           date,
  //           description,
  //           amount,
  //           type,
  //           reference
  //         } = row;

  //         // Skip if transaction already exists
  //         const existing = await tx.bankStatementLine.findFirst({
  //           where: {
  //             cashAccountId,
  //             statementDate: new Date(date),
  //             amount: new Decimal(Math.abs(amount)),
  //             description
  //           }
  //         });

  //         if (existing) continue;

  //         // Create bank statement line
  //         const statementLine = await tx.bankStatementLine.create({
  //           data: {
  //             cashAccountId,
  //             statementDate: new Date(date),
  //             description,
  //             amount: new Decimal(Math.abs(amount)),
  //             transactionType: amount > 0 ? 'RECEIPT' : 'PAYMENT',
  //             reference,
  //             isMatched: false
  //           }
  //         });

  //         importedTransactions.push(statementLine);
  //       }
  //     });

  //     res.json({
  //       message: `Imported ${importedTransactions.length} transactions`,
  //       importedCount: importedTransactions.length
  //     });
  //   } catch (error) {
  //     console.error('Import bank statement error:', error);
  //     res.status(400).json({ error: 'Failed to import bank statement' });
  //   }
  // }

  // Export cashbook to CSV
  // async exportCashbook(req: AuthRequest, res: Response) {
  //   try {
  //     const { cashAccountId, dateFrom, dateTo } = req.query;

  //     const where: any = {};
  //     if (cashAccountId) where.cashAccountId = cashAccountId;
  //     if (dateFrom || dateTo) {
  //       where.transactionDate = {};
  //       if (dateFrom) where.transactionDate.gte = new Date(dateFrom as string);
  //       if (dateTo) where.transactionDate.lte = new Date(dateTo as string);
  //     }

  //     const transactions = await prisma.cashTransaction.findMany({
  //       where,
  //       include: {
  //         cashAccount: true,
  //         glAccount: true,
  //         contraAccount: true,
  //         user: {
  //           select: { name: true }
  //         }
  //       },
  //       orderBy: { transactionDate: 'asc' }
  //     });

  //     // Generate CSV
  //     const headers = [
  //       'Date',
  //       'Transaction No',
  //       'Description',
  //       'Reference',
  //       'GL Account',
  //       'Contra Account',
  //       'Receipt',
  //       'Payment',
  //       'Running Balance',
  //       'User'
  //     ];

  //     let runningBalance = 0;
  //     const csvRows = transactions.map(transaction => {
  //       const amount = Number(transaction.amount);
  //       runningBalance += transaction.transactionType === 'RECEIPT' ? amount : -amount;

  //       return [
  //         new Date(transaction.transactionDate).toLocaleDateString(),
  //         transaction.transactionNo,
  //         transaction.description,
  //         transaction.reference || '',
  //         transaction.glAccount ? `${transaction.glAccount.code} - ${transaction.glAccount.name}` : '',
  //         transaction.contraAccount ? `${transaction.contraAccount.code} - ${transaction.contraAccount.name}` : '',
  //         transaction.transactionType === 'RECEIPT' ? amount.toString() : '',
  //         transaction.transactionType === 'PAYMENT' ? amount.toString() : '',
  //         runningBalance.toString(),
  //         transaction.user.name
  //       ];
  //     });

  //     const csvContent = [headers, ...csvRows]
  //       .map(row => row.map(field => `"${field}"`).join(','))
  //       .join('\n');

  //     res.setHeader('Content-Type', 'text/csv');
  //     res.setHeader('Content-Disposition', `attachment; filename="cashbook-${new Date().toISOString().split('T')[0]}.csv"`);
  //     res.send(csvContent);
  //   } catch (error) {
  //     console.error('Export cashbook error:', error);
  //     res.status(500).json({ error: 'Failed to export cashbook' });
  //   }
  // }

  // Create sales receipt (wrapper for createCustomerPayment)
  async createSalesReceipt(req: AuthRequest, res: Response) {
    try {
      const {
        saleId,
        customerId,
        cashAccountId,
        amountReceived,
        receiptDate,
        reference,
        notes,
      } = req.body;

      req.body = {
        customerId,
        cashAccountId,
        amount: amountReceived,
        paymentDate: receiptDate,
        reference,
        notes,
        saleId,
      };
      const result = await this.createCustomerPayment(req, res);

      return result;
    } catch (error) {
      console.error("Create sales receipt error:", error);
      res.status(400).json({ error: "Failed to create sales receipt" });
    }
  }

  // Create purchase payment (wrapper for createVendorPayment)
  // Create sales receipt (wrapper for createCustomerPayment)
  // async createSalesReceipt(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       saleId,
  //       customerId,
  //       cashAccountId,
  //       amountReceived,
  //       receiptDate,
  //       reference,
  //       notes
  //     } = req.body;

  //     req.body = {
  //       customerId,
  //       cashAccountId,
  //       amount: amountReceived,
  //       paymentDate: receiptDate,
  //       reference,
  //       notes,
  //       saleId
  //     };

  //     return await this.createCustomerPayment(req, res);
  //   } catch (error) {
  //     console.error('Create sales receipt error:', error);
  //     res.status(400).json({ error: 'Failed to create sales receipt' });
  //   }
  // }

  // Create purchase payment (wrapper for createVendorPayment)
  async createPurchasePayment(req: AuthRequest, res: Response) {
    try {
      const {
        purchaseId,
        vendorId,
        cashAccountId,
        amountPaid,
        paymentDate,
        reference,
        notes,
      } = req.body;

      req.body = {
        vendorId,
        cashAccountId,
        amount: amountPaid,
        paymentDate,
        reference,
        notes,
        purchaseId,
      };

      return await this.createVendorPayment(req, res);
    } catch (error) {
      console.error("Create purchase payment error:", error);
      res.status(400).json({ error: "Failed to create purchase payment" });
    }
  }
}
