import { Response } from "express";
import { createJournalSchema } from "../types/journal";
import { AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class JournalController {
  async getJournal(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, pageSize = 20, date } = req.query;

      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      // Build where filter
      const where: any = {
        refType: { contains: "JOURNAL" },
        refId: { contains: "Journal Posting" },
        ...(id ? { journalId: id } : {}),
        ...(date
          ? {
              journal: {
                date: {
                  gte: new Date(date as string),
                  lt: new Date(
                    new Date(date as string).setDate(
                      new Date(date as string).getDate() + 1,
                    ),
                  ),
                },
              },
            }
          : {}),
      };

      // Fetch paginated results
      const [journalLines, total] = await Promise.all([
        prisma.journalLine.findMany({
          where,
          skip,
          take,
          include: {
            journal: {
              select: {
                id: true,
                date: true,
                memo: true,
                postedByUser: { select: { id: true, name: true, email: true } },
              },
            },
            account: { select: { id: true, name: true } },
          },
          //orderBy: { journal date: "desc" },
          orderBy: {
            journal: {
              journalNo: "desc",
            },
          },
        }),
        prisma.journalLine.count({ where }),
      ]);

      if (!journalLines.length) {
        return res.status(404).json({ error: "No journal lines found" });
      }

      // Transform result
      const result = journalLines.map((jl) => {
        const debit =
          jl.debit && typeof (jl.debit as any).toNumber === "function"
            ? (jl.debit as any).toNumber()
            : Number(jl.debit ?? 0);

        const credit =
          jl.credit && typeof (jl.credit as any).toNumber === "function"
            ? (jl.credit as any).toNumber()
            : Number(jl.credit ?? 0);

        return {
          id: jl.id,
          journalId: jl.journalId,
          accountId: jl.accountId,
          accountName: jl.account?.name ?? null,
          debit,
          credit,
          refType: jl.refType,
          refId: jl.refId,
          date: jl.journal?.date ?? null,
          note: jl.journal?.memo ?? null,
          postedBy:
            jl.journal?.postedByUser?.name ??
            jl.journal?.postedByUser?.email ??
            jl.journal?.postedByUser?.id,
        };
      });

      return res.json({
        data: result,
        pagination: {
          total,
          page: Number(page),
          limit: Number(pageSize),
          pages: Math.ceil(total / Number(pageSize)),
        },
      });
    } catch (error: any) {
      console.error("Get journal error:", error);
      return res.status(500).json({
        error: error.message || "Failed to fetch journal lines",
      });
    }
  }

  //     async getJournal(req: AuthRequest, res: Response) {
  //   try {
  //     const { id } = req.params; // optional filter by journalId

  //     const where: any = {
  //       refType: "JOURNAL",
  //       refId: { contains: "Journal Posting" },
  //       ...(id ? { journalId: id } : {}),
  //     };

  //     const journalLines = await prisma.journalLine.findMany({
  //       where,
  //       include: {
  //         journal: {
  //           select: {
  //             id: true,
  //             date: true,
  //             memo: true,
  //             postedByUser: { select: { id: true, name: true, email: true } }, // relation to User
  //           },
  //         },
  //         account: { select: { id: true, name: true } },
  //       },
  //       orderBy: { journalId: "desc" },
  //     });

  //     if (!journalLines.length) {
  //       return res.status(404).json({ error: "No journal lines found" });
  //     }

  //     const result = journalLines.map((jl) => {
  //       const debit =
  //         jl.debit && typeof (jl.debit as any).toNumber === "function"
  //           ? (jl.debit as any).toNumber()
  //           : Number(jl.debit ?? 0);

  //       const credit =
  //         jl.credit && typeof (jl.credit as any).toNumber === "function"
  //           ? (jl.credit as any).toNumber()
  //           : Number(jl.credit ?? 0);

  //       return {
  //         id: jl.id,
  //         journalId: jl.journalId,
  //         accountId: jl.accountId,
  //         accountName: jl.account?.name ?? null,
  //         debit,
  //         credit,
  //         refType: jl.refType,
  //         refId: jl.refId,
  //         // flatten parent journal fields
  //         date: jl.journal?.date ?? null,
  //         note: jl.journal?.memo ?? null,
  //         postedBy:
  //           jl.journal?.postedByUser?.name ??
  //           jl.journal?.postedByUser?.email ??
  //           jl.journal?.postedByUser?.id,
  //       };
  //     });

  //     return res.json(result);
  //   } catch (error: any) {
  //     console.error("Get journal error:", error);
  //     return res.status(500).json({
  //       error: error.message || "Failed to fetch journal lines",
  //     });
  //   }
  // }

  async createJournal(req: AuthRequest, res: Response) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const validatedData = createJournalSchema.parse(req.body);

          // --- Rule 1: At least 2 lines ---
          if (
            !validatedData.journalLines ||
            validatedData.journalLines.length < 2
          ) {
            throw new Error(
              "Journal must have at least 2 lines (one debit, one credit).",
            );
          }

          // --- Rule 2: Debit must equal Credit ---
          const totalDebit = validatedData.journalLines.reduce(
            (sum, jl) => sum + (jl.debit ?? 0),
            0,
          );
          const totalCredit = validatedData.journalLines.reduce(
            (sum, jl) => sum + (jl.credit ?? 0),
            0,
          );

          if (totalDebit !== totalCredit) {
            throw new Error(
              `Journal not balanced: Debit=${totalDebit}, Credit=${totalCredit}`,
            );
          }

          // --- Create journal header ---
          const journalCount = await tx.journal.count();
          const journalNo = `J${String(journalCount + 1).padStart(6, "0")}`;

          const journal = await tx.journal.create({
            data: {
              journalNo,
              date: new Date(validatedData.journalDate),
              memo: validatedData.note ?? "Chart Of Account Initial Balances",
              postedBy: req.user!.id,
            },
          });

          //Get cashAccount from journal lines  accountid if exists and debit or credit the cashAccount
          let count = 1;
          const lastTx = await tx.cashTransaction.findFirst({
            orderBy: { createdAt: "desc" },
          });

          let baseNumber = lastTx
            ? parseInt(lastTx.transactionNo.replace(/^CT/, ""), 10)
            : 0;
          for (const jl of validatedData.journalLines) {
            const nextNumber = baseNumber + count;
            const transactionNo = `CT${String(nextNumber).padStart(6, "0")}`;
            count++;
            const cashAccount = await tx.cashAccount.findFirst({
              where: {
                glAccountId: jl.accountId,
              },
            });

            if (cashAccount) {
              if (jl.debit && jl.debit > 0) {
                await tx.cashAccount.update({
                  where: { id: cashAccount.id },
                  data: {
                    balance: {
                      increment: jl.debit,
                    },
                  },
                });
                //create cash account transaction
                await tx.cashTransaction.create({
                  data: {
                    transactionNo,
                    cashAccountId: cashAccount.id,
                    transactionType: "RECEIPT",
                    amount: jl.debit,
                    description: `Journal Entry - ${validatedData.note ?? "No description"}`,
                    transactionDate: new Date(),
                    reference: `Journal Posting`,
                    refType: `JOURNAL - ${journalNo}`,
                    refId: `Journal Posting - ${journalNo}`,
                    userId: req.user!.id,
                    preparedBy: req.user!.id,
                    authorizedBy: req.user!.id,
                    approvedBy: req.user!.id,
                    paidBy: req.user!.id,
                    status: "PAID",
                  },
                });
              }
              if (jl.credit && jl.credit > 0) {
                await tx.cashAccount.update({
                  where: { id: cashAccount.id },
                  data: {
                    balance: {
                      decrement: jl.credit,
                    },
                  },
                });

                //create cash account transaction
                await tx.cashTransaction.create({
                  data: {
                    transactionNo,
                    cashAccountId: cashAccount.id,
                    transactionType: "PAYMENT",
                    amount: jl.credit,
                    description: `Journal Entry - ${validatedData.note ?? "No description"}`,
                    transactionDate: new Date(),
                    reference: `Journal Posting`,
                    refType: `JOURNAL - ${journalNo}`,
                    refId: `Journal Posting - ${journalNo}`,
                    userId: req.user!.id,
                    preparedBy: req.user!.id,
                    authorizedBy: req.user!.id,
                    approvedBy: req.user!.id,
                    paidBy: req.user!.id,
                    status: "PAID",
                  },
                });
              }
            }
          }

          // --- Build journal lines ---
          const journalLines = validatedData.journalLines.map((jl) => ({
            journalId: journal.id,
            accountId: jl.accountId,
            debit: jl.debit ?? 0,
            credit: jl.credit ?? 0,
            refType: `JOURNAL - ${journalNo}`,
            refId: `Journal Posting ${journal.id}`,
          }));

          // --- Insert all lines ---
          await tx.journalLine.createMany({
            data: journalLines,
          });

          return { journal, journalLines };
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Create journal error:", error);

      res.status(400).json({
        error: error.message || "Failed to create journal",
      });
    }
  }
}
