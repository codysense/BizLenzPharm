import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  createPosSessionSchema,
  closePosSessionSchema,
  createPosSaleSchema,
  createPosReturnSchema,
} from "../types/pos";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

export class PosController {
  // POS Sessions
  async createSession(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPosSessionSchema.parse(req.body);

      // Check if user has an open session
      const openSession = await prisma.posSession.findFirst({
        where: {
          userId: req.user!.id,
          status: "OPEN",
        },
      });

      if (openSession) {
        return res
          .status(400)
          .json({ error: "You already have an open POS session" });
      }

      const session = await prisma.$transaction(
        async (tx) => {
          const count = await tx.posSession.count();
          const sessionNo = `POS${String(count + 1).padStart(6, "0")}`;
          return await tx.posSession.create({
            data: {
              sessionNo,
              user: {
                connect: { id: req.user!.id },
              },
              warehouse: {
                connect: { id: validatedData.warehouseId },
              },
              // userId: req.user!.id,
              // warehouseId: validatedData.warehouseId,
              // cashAccountId: validatedData.cashAccountId,
              // openingBalance: new Decimal(validatedData.openingBalance)
            },
          });
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(session);
    } catch (error) {
      console.error("Create POS session error:", error);
      res.status(400).json({ error: "Failed to create POS session" });
    }
  }

  async closeSession(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = closePosSessionSchema.parse(req.body);

      const session = await prisma.posSession.update({
        where: { id },
        data: {
          closingBalance: new Decimal(validatedData.closingBalance),
          closedAt: new Date(),
          status: "CLOSED",
        },
      });

      res.json(session);
    } catch (error) {
      console.error("Close POS session error:", error);
      res.status(400).json({ error: "Failed to close POS session" });
    }
  }

  async getCurrentSession(req: AuthRequest, res: Response) {
    try {
      const session = await prisma.posSession.findFirst({
        where: {
          userId: req.user!.id,
          status: "OPEN",
        },
        include: {
          warehouse: { select: { code: true, name: true } },
          cashAccount: { select: { code: true, name: true } },
        },
      });

      res.json({ session });
    } catch (error) {
      console.error("Get current session error:", error);
      res.status(500).json({ error: "Failed to fetch current session" });
    }
  }

  // POS Sales
  // async createSale(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createPosSaleSchema.parse(req.body);

  //     const sale = await prisma.$transaction(
  //       async (tx) => {
  //         // Generate sale number
  //         const count = await tx.posSale.count();
  //         const saleNo = `POS${String(count + 1).padStart(8, "0")}`;

  //         // Get session details
  //         const session = await tx.posSession.findUnique({
  //           where: { id: validatedData.sessionId },
  //         });

  //         if (!session || session.status !== "OPEN") {
  //           throw new Error("Invalid or closed POS session");
  //         }

  //         // Create POS sale
  //         const newSale = await tx.posSale.create({
  //           data: {
  //             saleNo,
  //             sessionId: validatedData.sessionId,
  //             customerId: validatedData.customerId,
  //             warehouseId: session.warehouseId,
  //             cashAccountId: validatedData.cashAccountId,
  //             subtotal: new Decimal(validatedData.subtotal),
  //             taxAmount: new Decimal(validatedData.taxAmount),
  //             discountAmount: new Decimal(validatedData.discountAmount),
  //             totalAmount: new Decimal(validatedData.totalAmount),
  //             amountPaid: new Decimal(validatedData.amountPaid),
  //             changeAmount: new Decimal(validatedData.changeAmount),
  //             paymentMethod: validatedData.paymentMethod,
  //             notes: validatedData.notes,
  //             userId: req.user!.id,
  //           },
  //         });

  //         // Create sale lines and issue inventory
  //         for (const line of validatedData.saleLines) {
  //           await tx.posSaleLine.create({
  //             data: {
  //               posSaleId: newSale.id,
  //               itemId: line.itemId,
  //               qty: new Decimal(line.qty),
  //               unitPrice: new Decimal(line.unitPrice),
  //               discountPercent: new Decimal(line.discountPercent),
  //               lineTotal: new Decimal(
  //                 line.qty * line.unitPrice * (1 - line.discountPercent / 100)
  //               ),
  //             },
  //           });

  //           // Issue inventory
  //           await costingService.issueInventory(
  //             line.itemId,
  //             session.warehouseId,
  //             line.qty,
  //             "POS_SALE",
  //             newSale.id,
  //             req.user!.id
  //           );
  //         }

  //         // Update session totals
  //         await tx.posSession.update({
  //           where: { id: validatedData.sessionId },
  //           data: {
  //             totalSales: {
  //               increment: validatedData.totalAmount,
  //             },
  //           },
  //         });

  //         // Update cash account balance
  //         await tx.cashAccount.update({
  //           where: { id: validatedData.cashAccountId },
  //           data: {
  //             balance: {
  //               increment: validatedData.totalAmount,
  //             },
  //           },
  //         });

  //         // Create cash transaction
  //         const cashTransactionCount = await tx.cashTransaction.count();
  //         const transactionNo = `CT${String(cashTransactionCount + 1).padStart(
  //           6,
  //           "0"
  //         )}`;

  //         await tx.cashTransaction.create({
  //           data: {
  //             transactionNo,
  //             cashAccountId: validatedData.cashAccountId,
  //             transactionType: "RECEIPT",
  //             amount: new Decimal(validatedData.totalAmount),
  //             description: `POS Sale: ${saleNo}`,
  //             transactionDate: new Date(),
  //             reference: saleNo,
  //             refType: "POS_SALE",
  //             refId: newSale.id,
  //             userId: req.user!.id,
  //             preparedBy: req.user!.id,
  //           },
  //         });

  //         // Post to general ledger
  //         const totalCogs = await calculateCogs(
  //           validatedData.saleLines,
  //           session.warehouseId
  //         );

  //         await glService.postJournal(
  //           [
  //             {
  //               accountCode: "1100",
  //               debit: validatedData.totalAmount,
  //               credit: 0,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "4000",
  //               debit: 0,
  //               credit: validatedData.totalAmount,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "5000",
  //               debit: totalCogs,
  //               credit: 0,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //             {
  //               accountCode: "1350",
  //               debit: 0,
  //               credit: totalCogs,
  //               refType: "POS_SALE",
  //               refId: newSale.id,
  //             },
  //           ],
  //           `POS Sale: ${saleNo}`,
  //           req.user!.id
  //         );

  //         return newSale;
  //       },
  //       {
  //         maxWait: 5000, // 5s wait for connection
  //         timeout: 20000, // 20s max runtime
  //       }
  //     );

  //     res.status(201).json(sale);
  //   } catch (error) {
  //     console.error("Create POS sale error:", error);
  //     res.status(400).json({ error: "Failed to create POS sale" });
  //   }
  // }

  // async createSale(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createPosSaleSchema.parse(req.body);

  //     const sale = await prisma.$transaction(async (tx) => {
  //       /* ---------------- SALE NUMBER ---------------- */
  //       const count = await tx.posSale.count();
  //       const saleNo = `POS${String(count + 1).padStart(8, "0")}`;

  //       /* ---------------- SESSION ---------------- */
  //       const session = await tx.posSession.findUnique({
  //         where: { id: validatedData.sessionId },
  //       });

  //       if (!session || session.status !== "OPEN") {
  //         throw new Error("Invalid or closed POS session");
  //       }

  //       /* ---------------- RE-CALCULATE TOTALS ---------------- */
  //       const subtotal = validatedData.saleLines.reduce((sum, l) => {
  //         const lineTotal = l.qty * l.unitPrice;
  //         const discount = (lineTotal * (l.discountPercent || 0)) / 100;
  //         return sum + (lineTotal - discount);
  //       }, 0);

  //       const totalPaid = validatedData.payments.reduce(
  //         (sum, p) => sum + p.amount,
  //         0,
  //       );

  //       if (totalPaid < subtotal) {
  //         throw new Error("Total payment is less than sale amount");
  //       }

  //       const changeAmount = totalPaid - subtotal;

  //       /* ---------------- CREATE SALE ---------------- */
  //       const newSale = await tx.posSale.create({
  //         data: {
  //           saleNo,
  //           sessionId: validatedData.sessionId,
  //           customerId: validatedData.customerId,
  //           warehouseId: session.warehouseId,
  //           // cashAccountId: validatedData.cashAccountId,
  //           subtotal: new Decimal(subtotal),
  //           taxAmount: new Decimal(validatedData.taxAmount),
  //           discountAmount: new Decimal(validatedData.discountAmount),
  //           totalAmount: new Decimal(subtotal),
  //           amountPaid: new Decimal(totalPaid),
  //           changeAmount: new Decimal(changeAmount),
  //           notes: validatedData.notes,
  //           userId: req.user!.id,
  //         },
  //       });

  //       /* ---------------- SALE LINES + INVENTORY ---------------- */
  //       for (const line of validatedData.saleLines) {
  //         const costPrice = await costingService.getInventoryValue(
  //           line.itemId,
  //           session.warehouseId,
  //         );

  //         await tx.posSaleLine.create({
  //           data: {
  //             posSaleId: newSale.id,
  //             itemId: line.itemId,
  //             qty: new Decimal(line.qty),
  //             unitPrice: new Decimal(line.unitPrice),
  //             costPrice: new Decimal(Number(costPrice)),
  //             discountPercent: new Decimal(line.discountPercent),
  //             lineTotal: new Decimal(
  //               line.qty * line.unitPrice * (1 - line.discountPercent / 100),
  //             ),
  //           },
  //         });

  //         await costingService.issueInventory(
  //           line.itemId,
  //           session.warehouseId,
  //           line.qty,
  //           "POS_SALE",
  //           newSale.id,
  //           req.user!.id,
  //         );
  //       }

  //       /* ---------------- SESSION TOTAL ---------------- */
  //       await tx.posSession.update({
  //         where: { id: validatedData.sessionId },
  //         data: {
  //           totalSales: { increment: subtotal },
  //         },
  //       });

  //       /* ---------------- PAYMENTS ---------------- */
  //       const glEntries: any[] = [];

  //       for (const payment of validatedData.payments) {
  //         // Update account balance
  //         await tx.cashAccount.update({
  //           where: { id: payment.cashAccountId },
  //           data: {
  //             balance: { increment: payment.amount },
  //           },
  //         });

  //         // Cash transaction
  //         const ctCount = await tx.cashTransaction.count();
  //         const transactionNo = `CT${String(ctCount + 1).padStart(6, "0")}`;

  //         await tx.cashTransaction.create({
  //           data: {
  //             transactionNo,
  //             cashAccountId: payment.cashAccountId,
  //             transactionType: "RECEIPT",
  //             amount: new Decimal(payment.amount),
  //             description: `POS Sale: ${saleNo}`,
  //             transactionDate: new Date(),
  //             reference: saleNo,
  //             refType: "POS_SALE",
  //             refId: newSale.id,
  //             userId: req.user!.id,
  //             preparedBy: req.user!.id,
  //           },
  //         });

  //         // GL Debit per payment
  //         glEntries.push({
  //           accountCode: 1100,
  //           debit: payment.amount,
  //           credit: 0,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         });
  //       }

  //       /* ---------------- GL CREDIT SALES ---------------- */
  //       glEntries.push({
  //         accountCode: "4000",
  //         debit: 0,
  //         credit: subtotal,
  //         refType: "POS_SALE",
  //         refId: newSale.id,
  //       });

  //       /* ---------------- COGS ---------------- */
  //       const totalCogs = await calculateCogs(
  //         validatedData.saleLines,
  //         session.warehouseId,
  //       );

  //       glEntries.push(
  //         {
  //           accountCode: "5000",
  //           debit: totalCogs,
  //           credit: 0,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         },
  //         {
  //           accountCode: "1350",
  //           debit: 0,
  //           credit: totalCogs,
  //           refType: "POS_SALE",
  //           refId: newSale.id,
  //         },
  //       );

  //       await glService.postJournal(
  //         glEntries,
  //         `POS Sale: ${saleNo}`,
  //         req.user!.id,
  //       );

  //       return newSale;
  //     });

  //     res.status(201).json(sale);
  //   } catch (error) {
  //     console.error("Create POS sale error:", error);
  //     res.status(400).json({ error: "Failed to create POS sale" });
  //   }
  // }

  async createSale(req: AuthRequest, res: Response) {
    try {
      // 1. VALIDATE INPUT (NO TOTALS FROM FRONTEND)

      const input = createPosSaleSchema.parse(req.body);

      //console.log("Validated POS sale input:", input);

      const sale = await prisma.$transaction(
        async (tx) => {
          // 2. VALIDATE SESSION

          const session = await tx.posSession.findUnique({
            where: { id: input.sessionId },
          });

          if (!session || session.status !== "OPEN") {
            throw new Error("Invalid or closed POS session");
          }

          // 3. GENERATE SALE NUMBER (SAFE ENOUGH FOR NOW)

          const saleCount = await tx.posSale.count();
          const saleNo = `POS${String(saleCount + 1).padStart(8, "0")}`;

          // 4. RE-CALCULATE TOTALS (BACKEND AUTHORITY)

          let subtotal = 0;

          for (const line of input.saleLines) {
            const qty = Number(line.qty);
            const unitPrice = Number(line.unitPrice);
            const discountPercent = Number(line.discountPercent ?? 0);

            if (
              Number.isNaN(qty) ||
              Number.isNaN(unitPrice) ||
              Number.isNaN(discountPercent)
            ) {
              throw new Error("Invalid sale line values");
            }

            const lineAmount = qty * unitPrice;
            const discount = (lineAmount * discountPercent) / 100;

            subtotal += lineAmount - discount;
          }

          const taxAmount = Number(input.taxAmount ?? 0);
          const discountAmount = Number(input.discountAmount ?? 0);

          const totalAmount = subtotal + taxAmount - discountAmount;

          const totalPaid = input.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          );

          if (totalPaid < totalAmount) {
            throw new Error("Total payment is less than sale amount");
          }

          const changeAmount = totalPaid - totalAmount;

          //5. CREATE POS SALE (NO CASH ACCOUNT HERE)

          const posSale = await tx.posSale.create({
            data: {
              saleNo,
              sessionId: input.sessionId,
              customerId: input.customerId,
              warehouseId: session.warehouseId,

              subtotal: new Decimal(subtotal),
              taxAmount: new Decimal(taxAmount),
              discountAmount: new Decimal(discountAmount),
              totalAmount: new Decimal(totalAmount),

              amountPaid: new Decimal(totalPaid),
              changeAmount: new Decimal(changeAmount),

              notes: input.notes,
              userId: req.user!.id,
            },
          });

          const totalCogs = await calculateCogs(
            tx,
            input.saleLines,
            session.warehouseId,
            // tx,
          );

          // 6. SALE LINES + INVENTORY ISSUE

          for (const line of input.saleLines) {
            const qty = Number(line.qty);
            const unitPrice = Number(line.unitPrice);
            const discountPercent = Number(line.discountPercent ?? 0);

            const lineTotal = qty * unitPrice * (1 - discountPercent / 100);

            // 10. COGS

            const costInfo = await costingService.getInventoryValue(
              // tx, // IMPORTANT: same transaction
              line.itemId,
              session.warehouseId,
            );

            await tx.posSaleLine.create({
              data: {
                posSaleId: posSale.id,
                itemId: line.itemId,

                qty: new Decimal(qty),
                unitPrice: new Decimal(unitPrice),
                discountPercent: new Decimal(discountPercent),

                costPrice: new Decimal(costInfo.avgCost ?? 0),
                lineTotal: new Decimal(lineTotal),
              },
            });

            await costingService.issueInventory(
              tx, // IMPORTANT
              line.itemId,
              session.warehouseId,
              qty,
              "POS_SALE",
              posSale.id,
              req.user!.id,
            );
          }

          // 7. UPDATE SESSION TOTALS

          await tx.posSession.update({
            where: { id: input.sessionId },
            data: {
              totalSales: { increment: totalAmount },
            },
          });

          // 8. PAYMENTS + CASH TRANSACTIONS

          const glEntries: any[] = [];

          let count = 1;

          const lastTx = await tx.cashTransaction.findFirst({
            orderBy: { createdAt: "desc" },
          });

          let baseNumber = lastTx
            ? parseInt(lastTx.transactionNo.replace(/^CT/, ""), 10)
            : 0;

          for (const payment of input.payments) {
            const nextNumber = baseNumber + count;
            const transactionNo = `CT${String(nextNumber).padStart(6, "0")}`;
            count++;
            const amount = Number(payment.amount);

            if (Number.isNaN(amount) || amount <= 0) {
              throw new Error("Invalid payment amount");
            }

            await tx.posSalePayment.create({
              data: {
                posSaleId: posSale.id,
                cashAccountId: payment.cashAccountId,
                method: payment.method,
                amount: new Decimal(amount),
              },
            });

            const updatedCashAccount = await tx.cashAccount.update({
              where: { id: payment.cashAccountId },
              data: {
                balance: { increment: amount },
              },
            });

            //Get GL account code for cash account
            const cashAccountGL = await tx.chartOfAccount.findUnique({
              where: { id: updatedCashAccount.glAccountId },
            });

            // Fetch the last CashTransaction ordered by creationDate
            const lastTx = await prisma.cashTransaction.findFirst({
              orderBy: { createdAt: "desc" },
            });

            // let nextNumber = count;
            // if (lastTx) {
            //   // Extract the numeric part of the transactionNo
            //   const lastNumber = parseInt(
            //     lastTx.transactionNo.replace(/^CT/, ""),
            //     10,
            //   );
            //   nextNumber = lastNumber + count;
            // }

            // const transactionNo = `CT${String(nextNumber).padStart(6, "0")}`;

            // console.log("TransactionNo ", transactionNo);
            // console.log("Payment count ", count);

            await tx.cashTransaction.create({
              data: {
                transactionNo,
                cashAccountId: payment.cashAccountId,
                transactionType: "RECEIPT",
                amount: new Decimal(amount),
                description: `POS Sale: ${saleNo}`,
                transactionDate: new Date(),
                reference: saleNo,
                refType: "POS_SALE",
                refId: posSale.id,
                userId: req.user!.id,
                preparedBy: req.user!.id,
                authorizedBy: req.user!.id,
                approvedBy: req.user!.id,
                paidBy: req.user!.id,
                status: "PAID",
              },
            });

            /* ---- GL Debit: Cash / Bank account ---- */
            glEntries.push({
              accountCode: cashAccountGL?.code || "1100", // Default to 1100 if not found
              debit: amount,
              credit: 0,
              refType: "POS_SALE",
              refId: posSale.id,
            });
          }

          // 9. GL CREDIT SALES

          glEntries.push({
            accountCode: "4000",
            debit: 0,
            credit: totalAmount,
            refType: "POS_SALE",
            refId: posSale.id,
          });

          glEntries.push(
            {
              accountCode: "5000",
              debit: totalCogs,
              credit: 0,
              refType: "POS_SALE",
              refId: posSale.id,
            },
            {
              accountCode: "1350",
              debit: 0,
              credit: totalCogs,
              refType: "POS_SALE",
              refId: posSale.id,
            },
          );

          await glService.postJournal(
            tx, // if supported
            glEntries,
            `POS Sale: ${saleNo}`,
            req.user!.id,
          );

          return posSale;
        },
        { timeout: 20000 },
      );

      res.status(201).json(sale);
    } catch (error) {
      console.error("Create POS sale error:", error);
      res.status(500).json({ error: "Failed to create POS sale" });
    }
  }

  // async getSales(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       sessionId,
  //       customerId,
  //       dateFrom,
  //       dateTo,
  //       status,
  //       paymentMethod,
  //       userId,
  //     } = req.query;
  //     const where: any = {};

  //     const skip = (Number(page) - 1) * Number(limit);

  //     // Warehouse-based restriction for non-management users
  //     if (
  //       !req.user!.roles.includes("CFO") &&
  //       !req.user!.roles.includes("General Manager")
  //     ) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });

  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //     // Basic filters
  //     if (sessionId) where.sessionId = sessionId;
  //     if (customerId) where.customerId = customerId;
  //     if (status) where.status = status;
  //     if (userId) where.userId = userId;

  //     // Date range
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  //     }

  //     // Payment method filter (relation-based)
  //     if (paymentMethod) {
  //       where.payments = {
  //         some: {
  //           method: paymentMethod,
  //         },
  //       };
  //     }

  //     const [sales, total] = await Promise.all([
  //       prisma.posSale.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           customer: { select: { code: true, name: true } },
  //           warehouse: { select: { code: true, name: true } },
  //           cashAccount: { select: { code: true, name: true } },
  //           session: { select: { sessionNo: true } },
  //           saleLines: {
  //             include: {
  //               item: { select: { sku: true, name: true, uom: true } },
  //             },
  //           },
  //           payments: {
  //             select: {
  //               method: true,
  //               amount: true,
  //               cashAccountId: true,
  //             },
  //           },
  //           user: { select: { id: true, name: true } },
  //         },
  //         orderBy: { createdAt: "desc" },
  //       }),
  //       prisma.posSale.count({ where }),
  //     ]);

  //     res.json({
  //       sales,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get POS sales error:", error);
  //     res.status(500).json({ error: "Failed to fetch POS sales" });
  //   }
  // }

  async getSales(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        status,
        paymentMethod,
        userId,
        search,
      } = req.query;

      const where: any = {};
      const skip = (Number(page) - 1) * Number(limit);

      /* =========================
       Warehouse Restriction
    ========================== */
      if (
        !req.user!.roles.includes("Senior Accountant") ||
        !req.user!.roles.includes("Manager") ||
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

      /* =========================
       Basic Filters
    ========================== */
      if (sessionId) where.sessionId = sessionId;
      if (customerId) where.customerId = customerId;
      if (status) where.status = status;
      if (userId) where.userId = userId;

      /* =========================
       Date Range
    ========================== */
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      /* =========================
       Payment Method Filter
    ========================== */
      if (paymentMethod) {
        where.payments = {
          some: {
            method: paymentMethod,
          },
        };
      }

      /* =========================
        SEARCH (Optional)
    ========================== */
      if (search && String(search).trim() !== "") {
        where.OR = [
          {
            saleNo: {
              contains: String(search),
              mode: "insensitive",
            },
          },
          {
            customer: {
              name: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          },
          {
            customer: {
              code: {
                contains: String(search),
                mode: "insensitive",
              },
            },
          },
        ];
      }

      //Query Execution

      const [sales, total] = await Promise.all([
        prisma.posSale.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            customer: { select: { code: true, name: true } },
            warehouse: { select: { code: true, name: true } },
            cashAccount: { select: { code: true, name: true } },
            session: { select: { sessionNo: true } },
            saleLines: {
              include: {
                item: { select: { sku: true, name: true, uom: true } },
              },
            },
            payments: {
              select: {
                method: true,
                amount: true,
                cashAccountId: true,
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.posSale.count({ where }),
      ]);

      res.json({
        sales,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS sales error:", error);
      res.status(500).json({ error: "Failed to fetch POS sales" });
    }
  }

  async getSalesForDashboard(req: AuthRequest, res: Response) {
    try {
      const {
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        status,
        paymentMethod,
        userId,
      } = req.query;
      const where: any = {};

      //const skip = (Number(page) - 1) * Number(limit);

      // Warehouse-based restriction for non-management users
      if (
        !req.user!.roles.includes("Manager") ||
        !req.user!.roles.includes("General Manager") ||
        !req.user!.roles.includes("Senior Accountant")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // Basic filters
      if (sessionId) where.sessionId = sessionId;
      if (customerId) where.customerId = customerId;
      if (status) where.status = status;
      if (userId) where.userId = userId;

      // Date range
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
        if (dateTo) where.createdAt.lte = new Date(dateTo as string);
      }

      // Payment method filter (relation-based)
      if (paymentMethod) {
        where.payments = {
          some: {
            method: paymentMethod,
          },
        };
      }

      const [sales, total] = await Promise.all([
        prisma.posSale.findMany({
          where,
          include: {
            customer: { select: { code: true, name: true } },
            warehouse: { select: { code: true, name: true } },
            cashAccount: { select: { code: true, name: true } },
            session: { select: { sessionNo: true } },
            saleLines: {
              include: {
                item: { select: { sku: true, name: true, uom: true } },
              },
            },
            payments: {
              select: {
                method: true,
                amount: true,
                cashAccountId: true,
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.posSale.count({ where }),
      ]);

      res.json({
        sales,
        pagination: {
          total,
          //pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS sales error:", error);
      res.status(500).json({ error: "Failed to fetch POS sales" });
    }
  }

  async getSalesBySalesNo(req: AuthRequest, res: Response) {
    try {
      const { saleNo } = req.params;
      //console.log("Fetching POS sale with saleNo:", saleNo);
      const sale = await prisma.posSale.findUnique({
        where: { saleNo },
        include: {
          customer: { select: { code: true, name: true } },
          warehouse: { select: { code: true, name: true } },
          session: { select: { sessionNo: true } },
          saleLines: {
            include: {
              item: { select: { sku: true, name: true, uom: true } },
            },
          },
          payments: {
            select: {
              method: true,
              amount: true,
              cashAccountId: true,
            },
          },
          user: { select: { id: true, name: true } },
        },
      });

      if (!sale) {
        return res.json(null);
      }

      res.json(sale);
    } catch (error) {
      console.error("Get POS sales by sales no error:", error);
      res.status(500).json({ error: "Failed to fetch POS sale by sales no" });
    }
  }

  async getPOSsalePayments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      //fetch payments with cash account details for a specific POS sale

      const payments = await prisma.posSalePayment.findMany({
        where: { posSaleId: id },
        include: {
          cashAccount: { select: { code: true, name: true } },
        },
      });

      res.json(payments);
    } catch (error) {
      console.error("Get POS sale payments error:", error);
      res.status(500).json({ error: "Failed to fetch POS sale payments" });
    }
  }

  // async getSales(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       sessionId,
  //       customerId,
  //       dateFrom,
  //       dateTo,
  //       status,
  //       paymentMethod,
  //       userId,
  //     } = req.query;
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};

  //     // Warehouse-based filtering for POS users
  //     if (
  //       !req.user!.roles.includes("CFO") &&
  //       !req.user!.roles.includes("General Manager")
  //     ) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });
  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //     if (sessionId) where.sessionId = sessionId;
  //     if (customerId) where.customerId = customerId;
  //     if (status) where.status = status;
  //     if (paymentMethod) where.paymentMethod = paymentMethod;
  //     if (userId) where.userId = userId;
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.createdAt.lte = new Date(dateTo as string);
  //     }

  //     const [sales, total] = await Promise.all([
  //       prisma.posSale.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           customer: { select: { code: true, name: true } },
  //           warehouse: { select: { code: true, name: true } },
  //           session: { select: { sessionNo: true } },
  //           saleLines: {
  //             include: {
  //               item: { select: { sku: true, name: true, uom: true } },
  //             },
  //           },
  //           user: { select: { id: true, name: true } },
  //         },
  //         orderBy: { createdAt: "desc" },
  //       }),
  //       prisma.posSale.count({ where }),
  //     ]);

  //     res.json({
  //       sales,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get POS sales error:", error);
  //     res.status(500).json({ error: "Failed to fetch POS sales" });
  //   }
  // }

  //get POS returns
  async getReturns(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        sessionId,
        customerId,
        dateFrom,
        dateTo,
        userId,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);
      const where: any = {};

      // Warehouse-based restriction
      if (
        !req.user!.roles.includes("Senior accountant") ||
        !req.user!.roles.includes("General Manager") ||
        !req.user!.roles.includes("Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // Filters
      if (sessionId) where.sessionId = String(sessionId);
      if (customerId) where.customerId = String(customerId);
      if (userId) where.userId = String(userId);

      // Date range (flexible)
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
        if (dateTo) where.createdAt.lte = new Date(String(dateTo));
      }

      const [returns, total] = await Promise.all([
        prisma.posReturn.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            customer: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
            session: { select: { sessionNo: true } },
            warehouse: { select: { id: true, name: true } },
            originalSale: { select: { id: true, saleNo: true } },
            returnLines: {
              include: {
                item: { select: { id: true, name: true } },
              },
            },
          },
        }),
        prisma.posReturn.count({ where }),
      ]);

      // Transform for UI
      const data = returns.map((ret) => ({
        id: ret.id,
        returnNo: ret.returnNo,
        saleNo: ret.originalSale?.saleNo,
        sessionNo: ret.session?.sessionNo,
        customer: ret.customer,
        warehouse: ret.warehouse,
        refundAmount: ret.refundAmount,
        reason: ret.reason,
        createdAt: ret.createdAt,
        createdBy: ret.user,
        itemsSummary: ret.returnLines
          .map(
            (line) => `${line.item?.name ?? "Unknown"} (x${line.qtyReturned})`,
          )
          .join(", "),
      }));

      res.json({
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get POS returns error:", error);
      res.status(500).json({ error: "Failed to fetch POS returns" });
    }
  }

  // async getReturns(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 20,
  //       sessionId,
  //       customerId,
  //       dateFrom,
  //       dateTo,
  //     } = req.query;

  //     const skip = (Number(page) - 1) * Number(limit);
  //     const take = Number(limit);

  //     const where: any = {};
  //     if (sessionId) where.sessionId = String(sessionId);
  //     if (customerId) where.customerId = String(customerId);
  //     if (dateFrom && dateTo) {
  //       where.createdAt = {
  //         gte: new Date(String(dateFrom)),
  //         lte: new Date(String(dateTo)),
  //       };
  //     }

  //     const [returns, total] = await Promise.all([
  //       prisma.posReturn.findMany({
  //         where,
  //         skip,
  //         take,
  //         orderBy: { createdAt: "desc" },
  //         include: {
  //           customer: { select: { id: true, name: true } },
  //           user: { select: { id: true, name: true } },
  //           returnLines: {
  //             include: { item: { select: { id: true, name: true } } },
  //           },
  //         },
  //       }),
  //       prisma.posReturn.count({ where }),
  //     ]);

  //     // 🔑 Transform data: add itemsSummary field
  //     const transformed = returns.map((ret) => {
  //       const itemsSummary = ret.returnLines
  //         .map(
  //           (line) => `${line.item?.name ?? "Unknown"} (x${line.qtyReturned})`,
  //         )
  //         .join(", ");

  //       return {
  //         ...ret,
  //         itemsSummary,
  //       };
  //     });

  //     res.json({
  //       data: transformed,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         totalPages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get POS returns error:", error);
  //     res.status(500).json({ error: "Failed to fetch POS returns" });
  //   }
  // }

  // Create POS Returns
  async createReturn(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPosReturnSchema.parse(req.body);
      //console.log("validated Data", validatedData);

      const returnRecord = await prisma.$transaction(async (tx) => {
        // Generate return number
        const count = await tx.posReturn.count();
        const returnNo = `RTN${String(count + 1).padStart(6, "0")}`;

        // Fetch original sale with lines
        const originalSale = await tx.posSale.findUnique({
          where: { id: validatedData.originalSaleId },
          include: {
            saleLines: true,
            session: true,
            payments: true,
          },
        });

        if (!originalSale) {
          throw new Error("Original sale not found");
        }

        // console.log("Original Sale", originalSale);

        // Validate session
        const session = await tx.posSession.findUnique({
          where: { id: validatedData.sessionId },
        });

        if (!session || session.status !== "OPEN") {
          throw new Error("Invalid or closed POS session");
        }

        if (session.warehouseId !== originalSale.warehouseId) {
          throw new Error("Session warehouse mismatch");
        }

        let returnTotal = 0;
        let totalReturnCogs = 0;

        // Validate each return line
        for (const line of validatedData.returnLines) {
          const originalLine = originalSale.saleLines.find(
            (l) => l.id === line.originalLineId,
          );

          if (!originalLine) {
            throw new Error("Invalid sale line reference");
          }

          // Prevent over-return
          const alreadyReturnedQty = await tx.posReturnLine.aggregate({
            where: { originalLineId: originalLine.id },
            _sum: { qtyReturned: true },
          });

          const returnedQty =
            alreadyReturnedQty._sum.qtyReturned?.toNumber() || 0;

          if (returnedQty + line.qtyReturned > originalLine.qty.toNumber()) {
            throw new Error("Return quantity exceeds sold quantity");
          }

          returnTotal += line.qtyReturned * line.unitPrice;

          // Cost price from inventory / sale line
          const costPrice = await costingService.getInventoryValue(
            originalLine.itemId,
            originalSale.warehouseId,
          );

          totalReturnCogs += line.qtyReturned * costPrice.avgCost!;
        }

        // Create return header
        const newReturn = await tx.posReturn.create({
          data: {
            returnNo,
            originalSaleId: originalSale.id,
            sessionId: session.id,
            customerId: originalSale.customerId,
            warehouseId: originalSale.warehouseId,
            totalAmount: new Decimal(returnTotal),
            refundAmount: new Decimal(returnTotal),
            reason: validatedData.reason,
            userId: req.user!.id,
          },
        });

        // Create return lines + inventory reversal
        for (const line of validatedData.returnLines) {
          const costPrice = await costingService.getInventoryValue(
            line.itemId,
            originalSale.warehouseId,
          );

          await tx.posReturnLine.create({
            data: {
              posReturnId: newReturn.id,
              originalLineId: line.originalLineId,
              itemId: line.itemId,
              qtyReturned: new Decimal(line.qtyReturned),
              unitPrice: new Decimal(line.unitPrice),
              lineTotal: new Decimal(line.qtyReturned * line.unitPrice),
            },
          });

          await costingService.receiveInventory(
            tx,
            line.itemId,
            originalSale.warehouseId,
            line.qtyReturned,
            costPrice.avgCost || 0,
            "POS_RETURN",
            newReturn.id,
            req.user!.id,
          );
        }

        // Update session totals
        await tx.posSession.update({
          where: { id: session.id },
          data: {
            totalReturns: { increment: returnTotal },
          },
        });

        const glEntries: any[] = [];

        // Refund cash
        for (const payment of originalSale.payments) {
          const updatedCashAccount = await tx.cashAccount.update({
            where: { id: payment.cashAccountId },
            data: {
              balance: { decrement: payment.amount.toNumber() },
            },
          });

          const cashaccountGL = await tx.chartOfAccount.findUnique({
            where: { id: updatedCashAccount.glAccountId },
          });

          glEntries.push({
            accountCode: cashaccountGL?.code || "1100", // Cash/Bank account (should ideally fetch from cash account)
            debit: 0,
            credit: payment.amount.toNumber(),
            refType: "POS_RETURN",
            refId: newReturn.id,
          });
        }

        // Cash transaction

        let paymentCount = 1;

        const lastTx = await tx.cashTransaction.findFirst({
          orderBy: { createdAt: "desc" },
        });

        let baseNumber = lastTx
          ? parseInt(lastTx.transactionNo.replace(/^CT/, ""), 10)
          : 0;

        for (const payment of originalSale.payments) {
          const nextNumber = baseNumber + paymentCount;

          const transactionNo = `CT${String(nextNumber).padStart(6, "0")}`;
          paymentCount++;

          await tx.cashTransaction.create({
            data: {
              transactionNo,
              cashAccountId: payment.cashAccountId,
              transactionType: "PAYMENT",
              amount: new Decimal(payment.amount.toNumber()),
              description: `POS Return: ${returnNo}`,
              transactionDate: new Date(),
              reference: returnNo,
              refType: "POS_RETURN",
              refId: newReturn.id,
              userId: req.user!.id,
              preparedBy: req.user!.id,
              authorizedBy: req.user!.id,
              approvedBy: req.user!.id,
              paidBy: req.user!.id,
              status: "PAID",
            },
          });
        }

        glEntries.push({
          accountCode: "4000",
          debit: returnTotal,
          credit: 0,
          refType: "POS_RETURN",
          refId: newReturn.id,
        });

        glEntries.push(
          {
            accountCode: "5000",
            debit: 0,
            credit: totalReturnCogs,
            refType: "POS_RETURN",
            refId: newReturn.id,
          },
          {
            accountCode: "1350",
            debit: totalReturnCogs,
            credit: 0,
            refType: "POS_RETURN",
            refId: newReturn.id,
          },
        );

        // GL reversal
        await glService.postJournal(
          tx,
          glEntries,
          `POS Return: ${returnNo}`,
          req.user!.id,
        );

        // Update sale status
        const totalReturnedQty = await tx.posReturnLine.aggregate({
          where: { posReturn: { originalSaleId: originalSale.id } },
          _sum: { qtyReturned: true },
        });

        const fullyReturned = await tx.posSaleLine.count({
          where: {
            posSaleId: originalSale.id,
            qty: {
              equals: totalReturnedQty._sum.qtyReturned || new Decimal(0),
            },
          },
        });

        await tx.posSale.update({
          where: { id: originalSale.id },
          data: {
            status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED",
          },
        });

        return newReturn;
      });

      res.status(201).json(returnRecord);
    } catch (error) {
      console.error("Create POS return error:", error);
      res.status(400).json({ error: "Failed to create POS return" });
    }
  }

  // Get customers with outstanding balances
  async getCustomersWithBalances(req: AuthRequest, res: Response) {
    try {
      const customers = await prisma.$queryRaw`
  SELECT 
    c.id,
    c.code,
    c.name,
    c.address,
    c.phone,
    c.email,
    c."customerGroupId",
    g.name AS "customerGroupName",
    COALESCE(
      (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = c.id AND s.status IN ('INVOICED', 'PAID')) -
      (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = c.id), 
      0
    ) as "outstandingBalance"
  FROM customers c
  LEFT JOIN "CustomerGroup" g ON g.id = c."customerGroupId"
  WHERE c."isActive" = true
  ORDER BY c.name
`;

      res.json({ customers });
    } catch (error) {
      console.error("Get customers with balances error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch customers with balances" });
    }
  }

  // Print POS receipt
  async printReceipt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      // console.log("PRINT RECEIPT PARAMS:", req.params);

      if (!id) {
        return res.status(400).json({ error: "Sale ID is required" });
      }

      /* =====================================================
       * 1. FETCH SALE WITH ALL REQUIRED RELATIONS
       * ===================================================== */
      const sale = await prisma.posSale.findUnique({
        where: { id: id },
        include: {
          customer: {
            select: { code: true, name: true },
          },
          warehouse: {
            select: { code: true, name: true },
          },
          session: {
            select: { sessionNo: true },
          },
          user: {
            select: { id: true, name: true },
          },
          saleLines: {
            include: {
              item: {
                select: { sku: true, name: true, uom: true },
              },
            },
          },
          payments: true, // PosSalePayment[]
        },
      });

      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      /* =====================================================
       * 2. FORMAT SALE LINES
       * ===================================================== */
      const saleLines = sale.saleLines.map((line) => ({
        sku: line.item?.sku ?? "N/A",
        name: line.item?.name ?? "Unknown Item",
        uom: line.item?.uom ?? "",
        qty: line.qty.toNumber(),
        unitPrice: line.unitPrice.toNumber(),
        discountPercent: line.discountPercent.toNumber(),
        costPrice: line.costPrice.toNumber(),
        lineTotal: line.lineTotal.toNumber(),
      }));

      /* =====================================================
       * 3. FORMAT PAYMENTS
       * ===================================================== */
      const payments = sale.payments.map((p) => ({
        method: p.method, // CASH | CARD | TRANSFER
        amount: p.amount.toNumber(),
      }));

      /* =====================================================
       * 4. OPTIONAL: PAYMENT SUMMARY (FRONTEND FRIENDLY)
       * ===================================================== */
      const paymentSummary = payments.reduce<Record<string, number>>(
        (acc, p) => {
          acc[p.method] = (acc[p.method] || 0) + p.amount;
          return acc;
        },
        {},
      );

      /* =====================================================
       * 5. BUILD RECEIPT OBJECT
       * ===================================================== */
      const receipt = {
        saleId: sale.id,
        documentNo: sale.saleNo,

        sessionNo: sale.session?.sessionNo ?? null,
        date: sale.createdAt,

        cashier: {
          id: sale.user.id,
          name: sale.user.name,
        },

        customer: sale.customer
          ? {
              code: sale.customer.code,
              name: sale.customer.name,
            }
          : null,

        warehouse: sale.warehouse
          ? {
              code: sale.warehouse.code,
              name: sale.warehouse.name,
            }
          : null,

        notes: sale.notes ?? null,

        totals: {
          subtotal: sale.subtotal.toNumber(),
          discountAmount: sale.discountAmount.toNumber(),
          taxAmount: sale.taxAmount.toNumber(),
          totalAmount: sale.totalAmount.toNumber(),
          amountPaid: sale.amountPaid.toNumber(),
          changeAmount: sale.changeAmount.toNumber(),
          outstandingBalance:
            sale.totalAmount.toNumber() - sale.amountPaid.toNumber(),
        },

        items: saleLines,

        payments,
        paymentSummary,
      };

      res.json(receipt);
    } catch (error) {
      console.error("Print POS receipt error:", error);
      res.status(500).json({ error: "Failed to print receipt" });
    }
  }

  // async printReceipt(req: AuthRequest, res: Response) {
  //   try {
  //     const { id } = req.params;

  //     const sale = await prisma.posSale.findUnique({
  //       where: { id },
  //       include: {
  //         customer: true,
  //         warehouse: true,
  //         session: true,
  //         saleLines: {
  //           include: {
  //             item: true,
  //           },
  //         },
  //         user: { select: { name: true } },
  //       },
  //     });

  //     if (!sale) {
  //       return res.status(404).json({ error: "POS sale not found" });
  //     }

  //     // Get customer outstanding balance
  //     let outstandingBalance = 0;
  //     if (sale.customerId) {
  //       const balanceResult = (await prisma.$queryRaw`
  //         SELECT COALESCE(
  //           (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = ${sale.customerId} AND s.status IN ('INVOICED', 'PAID')) -
  //           (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = ${sale.customerId}),
  //           0
  //         ) as balance
  //       `) as any[];
  //       outstandingBalance = Number(balanceResult[0]?.balance || 0);
  //     }

  //     res.json({
  //       sale,
  //       outstandingBalance,
  //       printData: {
  //         title: "SALES RECEIPT",
  //         documentNo: sale.saleNo,
  //         date: sale.createdAt,
  //         customer: sale.customer,
  //         warehouse: sale.warehouse,
  //         lines: sale.saleLines,
  //         subtotal: sale.subtotal,
  //         taxAmount: sale.taxAmount,
  //         discountAmount: sale.discountAmount,
  //         total: sale.totalAmount,
  //         amountPaid: sale.amountPaid,
  //         changeAmount: sale.changeAmount,
  //         paymentMethod: sale.paymentMethod,
  //         cashier: sale.user.name,
  //         outstandingBalance,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Print POS receipt error:", error);
  //     res.status(500).json({ error: "Failed to generate receipt" });
  //   }
  // }

  // Helper method to calculate COGS
}
async function calculateCogs(
  tx,
  saleLines: any[],
  warehouseId: string,
): Promise<number> {
  let totalCogs = 0;

  for (const line of saleLines) {
    const inventoryValue = await costingService.getInventoryValue(
      line.itemId,
      warehouseId,
    );
    totalCogs += line.qty * inventoryValue.avgCost;
  }

  return totalCogs;
}
