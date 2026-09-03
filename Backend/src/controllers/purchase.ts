import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  createPurchaseSchema,
  receivePurchaseSchema,
  createVendorSchema,
  confirmPurchaseReturnSchema,
  createPurchaseReturnSchema,
} from "../types/purchase";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

async function getReturnablePurchaseQuantities(purchaseId: string) {
  const purchaseLines = await prisma.purchaseLine.findMany({
    where: { purchaseId },
    include: { item: true },
  });

  const returned = await prisma.purchaseReturnLine.groupBy({
    by: ["purchaseLineId"],
    where: {
      purchaseReturn: { purchaseId, status: "CONFIRMED" },
    },
    _sum: { qty: true },
  });

  const returnedMap = new Map(
    returned.map((r) => [r.purchaseLineId, Number(r._sum.qty || 0)]),
  );

  return purchaseLines.map((line) => ({
    purchaseLineId: line.id,
    itemId: line.itemId,
    item: line.item,
    originalQty: Number(line.qty),
    unitPrice: Number(line.unitPrice),
    alreadyReturned: returnedMap.get(line.id) || 0,
    returnable: Number(line.qty) - (returnedMap.get(line.id) || 0),
  }));
}

export class PurchaseController {
  async getPurchases(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        vendorId,
        paymentStatus,
      } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (vendorId) where.vendorId = vendorId;
      if (paymentStatus === "OUTSTANDING") {
        where.status = {
          in: ["INVOICED", "PARTIALLY_PAID"],
        };
      }

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            vendor: {
              select: { code: true, name: true },
            },
            preparer: {
              select: { name: true },
            },
            purchaseLines: {
              include: {
                item: {
                  select: { sku: true, name: true, uom: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.purchase.count({ where }),
      ]);

      res.json({
        purchases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get purchases error:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  }

  async createPurchase(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPurchaseSchema.parse(req.body);

      // Calculate orderNo outside transaction

      const lastPurchase = await prisma.purchase.findFirst({
        orderBy: { createdAt: "desc" },
      });

      let nextNumber = 1;
      if (lastPurchase) {
        const match = lastPurchase.orderNo.match(/\d+$/);
        if (match) nextNumber = parseInt(match[0], 10) + 1;
      }

      const orderNo = `PO${String(nextNumber).padStart(6, "0")}`;

      // const count = await prisma.purchase.count();
      // const orderNo = `PO${String(count + 1).padStart(6, "0")}`;

      // Calculate total
      const totalAmount = validatedData.purchaseLines.reduce(
        (sum, line) => sum + line.qty * line.unitPrice,
        0,
      );

      const purchase = await prisma.$transaction(
        async (tx) => {
          // Create purchase
          const newPurchase = await tx.purchase.create({
            data: {
              orderNo,
              vendorId: validatedData.vendorId,
              orderDate: new Date(validatedData.orderDate),
              orderType: validatedData.orderType,
              totalAmount,
              amountPaid: 0,
              balanceAmount: totalAmount,
              notes: validatedData.notes,
              status: "ORDERED",
              preparedBy: req.user!.id,
            },
          });

          // validatedData.purchaseLines.forEach((line) => {
          //   if (validatedData.orderType === "INVENTORY" && !line.itemId) {
          //     throw new Error("Inventory order requires itemId");
          //   }

          //   if (validatedData.orderType === "ASSET" && !line.assetName) {
          //     throw new Error("Asset order requires assetName");
          //   }
          // });

          // Create purchase lines in bulk
          await tx.purchaseLine.createMany({
            data: validatedData.purchaseLines.map((line) => {
              const itemId =
                typeof line.itemId === "string" && line.itemId.trim() !== ""
                  ? line.itemId
                  : null;

              return {
                purchaseId: newPurchase.id,
                itemId,
                assetName:
                  typeof line.assetName === "string" &&
                  line.assetName.trim() !== ""
                    ? line.assetName
                    : null,
                qty: Number(line.qty),
                unitPrice: Number(line.unitPrice),
                lineTotal: Number(line.qty) * Number(line.unitPrice),
              };
            }),
          });

          return newPurchase;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(purchase);
    } catch (error) {
      console.error("Create purchase error:", error);
      res
        .status(400)
        .json({ error: "Failed to create purchase" + error.message });
    }
  }

  async receivePurchase(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = receivePurchaseSchema.parse(req.body);

      await prisma.$transaction(async (tx) => {
        // 1️ Fetch purchase lines INSIDE transaction
        const purchaseLines = await tx.purchaseLine.findMany({
          where: {
            id: { in: validatedData.receiptLines.map((r) => r.purchaseLineId) },
          },
          include: { item: true },
        });

        const purchaseLineMap = new Map(purchaseLines.map((pl) => [pl.id, pl]));

        // 2️ Update purchase header
        await tx.purchase.update({
          where: { id },
          data: {
            status: "RECEIVED",
            receivedBy: req.user!.id,
            receivedAt: new Date(),
          },
        });

        // 3️ Update each purchase line
        for (const receiptLine of validatedData.receiptLines) {
          const purchaseLine = purchaseLineMap.get(receiptLine.purchaseLineId);

          if (!purchaseLine) {
            throw new Error(
              `Purchase line ${receiptLine.purchaseLineId} not found`,
            );
          }

          await tx.purchaseLine.update({
            where: { id: receiptLine.purchaseLineId },
            data: {
              qty: receiptLine.qtyReceived,
            },
          });

          // 4️ Inventory costing INSIDE transaction
          await costingService.receiveInventory(
            tx,
            purchaseLine.itemId,
            receiptLine.warehouseId,
            receiptLine.qtyReceived,
            receiptLine.unitCost,
            "PURCHASE",
            id,
            req.user!.id,
          );
        }

        // 5️ Calculate total value
        const totalValue = validatedData.receiptLines.reduce((sum, line) => {
          return sum + line.qtyReceived * line.unitCost;
        }, 0);

        const purchase = await tx.purchase.findUnique({ where: { id } });

        const itemType = await getItemTypeById(purchaseLines[0].itemId);

        if (!purchase) {
          throw new Error("Purchase not found");
        }

        // 6️ Post GL INSIDE transaction
        await glService.postJournal(
          tx,
          [
            {
              accountCode: itemType === "FINISHED_GOODS" ? "1350" : "1300",
              debit: totalValue,
              credit: 0,
              refType: "PURCHASE",
              refId: id,
            },
            {
              accountCode: "2150",
              debit: 0,
              credit: totalValue,
              refType: "PURCHASE",
              refId: id,
            },
          ],
          `Purchase receipt: ${purchase.orderNo}`,
          req.user!.id,
        );
      });

      res.json({ message: "Purchase received successfully" });
    } catch (error) {
      console.error("Receive purchase error:", error);
      res.status(400).json({ error: "Failed to receive purchase" });
    }
  }

  async invoicePurchase(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(
        async (tx) => {
          // 1️ Update purchase status
          const purchase = await tx.purchase.update({
            where: { id },
            data: {
              status: "INVOICED",
              invoicedBy: req.user!.id,
              invoicedAt: new Date(),
            },
          });

          // 2️ Post GL INSIDE transaction
          await glService.postJournal(
            tx, // 👈 pass transaction client
            [
              {
                accountCode: "2000",
                debit: 0,
                credit: Number(purchase.totalAmount),
                refType: "PURCHASE",
                refId: id,
              },
              {
                accountCode: "2150",
                debit: Number(purchase.totalAmount),
                credit: 0,
                refType: "PURCHASE",
                refId: id,
              },
            ],
            `Purchase invoice: ${purchase.orderNo}`,
            req.user!.id,
          );
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.json({ message: "Purchase invoiced successfully" });
    } catch (error) {
      console.error("Invoice purchase error:", error);
      res.status(400).json({ error: "Failed to invoice purchase" });
    }
  }

  async getReturnableLines(req: AuthRequest, res: Response) {
    try {
      const { purchaseId } = req.params;

      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
      });
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      if (
        !["RECEIVED", "INVOICED", "PAID", "PARTIALLY_PAID"].includes(
          purchase.status,
        )
      ) {
        return res.status(400).json({
          error:
            "Only received, invoiced or paid purchases can be returned",
        });
      }

      const lines = await getReturnablePurchaseQuantities(purchaseId);
      res.json({ purchase, lines });
    } catch (error) {
      console.error("Get returnable purchase lines error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch returnable purchase lines" });
    }
  }

  async createPurchaseReturn(req: AuthRequest, res: Response) {
    try {
      const validatedData = createPurchaseReturnSchema.parse(req.body);

      const purchaseReturn = await prisma.$transaction(
        async (tx) => {
          const purchase = await tx.purchase.findUnique({
            where: { id: validatedData.purchaseId },
          });
          if (!purchase) throw new Error("Purchase not found");

          const returnable = await getReturnablePurchaseQuantities(
            validatedData.purchaseId,
          );
          const returnableMap = new Map(
            returnable.map((r) => [r.purchaseLineId, r]),
          );

          let subtotal = 0;
          const lineData: {
            purchaseLineId: string;
            itemId: string;
            qty: number;
            unitPrice: number;
            lineTotal: number;
          }[] = [];

          for (const line of validatedData.returnLines) {
            const info = returnableMap.get(line.purchaseLineId);
            if (!info) {
              throw new Error(
                `Purchase line ${line.purchaseLineId} not found on this purchase`,
              );
            }
            if (line.qty > info.returnable) {
              throw new Error(
                `Cannot return ${line.qty} units of ${info.item.name}. Only ${info.returnable} unit(s) remain available for return.`,
              );
            }

            const lineTotal = line.qty * info.unitPrice;
            subtotal += lineTotal;

            lineData.push({
              purchaseLineId: line.purchaseLineId,
              itemId: line.itemId,
              qty: line.qty,
              unitPrice: info.unitPrice,
              lineTotal,
            });
          }

          const lastReturn = await tx.purchaseReturn.findFirst({
            orderBy: { createdAt: "desc" },
          });
          let nextNumber = 1;
          if (lastReturn) {
            const match = lastReturn.returnNo.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0], 10) + 1;
          }
          const returnNo = `PR${String(nextNumber).padStart(6, "0")}`;

          const newReturn = await tx.purchaseReturn.create({
            data: {
              returnNo,
              purchaseId: purchase.id,
              vendorId: purchase.vendorId,
              reason: validatedData.reason,
              subtotal,
              tax: 0,
              totalAmount: subtotal,
              status: "DRAFT",
              preparedBy: req.user!.id,
            },
          });

          for (const line of lineData) {
            await tx.purchaseReturnLine.create({
              data: { purchaseReturnId: newReturn.id, ...line, unitCost: 0 },
            });
          }

          return newReturn;
        },
        { maxWait: 5000, timeout: 20000 },
      );

      res.status(201).json(purchaseReturn);
    } catch (error: any) {
      console.error("Create purchase return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to create purchase return" });
    }
  }

  async confirmPurchaseReturn(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = confirmPurchaseReturnSchema.parse(req.body);

      await prisma.$transaction(
        async (tx) => {
          const purchaseReturn = await tx.purchaseReturn.findUnique({
            where: { id },
            include: {
              purchaseReturnLines: { include: { item: true } },
              purchase: true,
            },
          });

          if (!purchaseReturn) throw new Error("Purchase return not found");
          if (purchaseReturn.status !== "DRAFT") {
            throw new Error(
              `Purchase return ${purchaseReturn.returnNo} is not in DRAFT status`,
            );
          }

          const returnable = await getReturnablePurchaseQuantities(
            purchaseReturn.purchaseId,
          );
          const returnableMap = new Map(
            returnable.map((r) => [r.purchaseLineId, r]),
          );

          let totalApAmount = 0;
          let totalInventoryValue = 0;

          for (const line of purchaseReturn.purchaseReturnLines) {
            const info = returnableMap.get(line.purchaseLineId);
            if (!info || Number(line.qty) > info.returnable) {
              throw new Error(
                `Return quantity for ${line.item.name} exceeds what remains returnable`,
              );
            }

            const { unitCost, value } = await costingService.issueInventory(
              tx,
              line.itemId,
              validatedData.warehouseId,
              Number(line.qty),
              "PURCHASE_RETURN",
              purchaseReturn.id,
              req.user!.id,
            );

            totalApAmount += Number(line.qty) * Number(line.unitPrice);
            totalInventoryValue += value;

            await tx.purchaseReturnLine.update({
              where: { id: line.id },
              data: { unitCost },
            });
          }

          const costVariance = totalApAmount - totalInventoryValue;

          const itemType = await getItemTypeById(
            purchaseReturn.purchaseReturnLines[0].itemId,
          );
          const inventoryAccountCode =
            itemType === "FINISHED_GOODS" ? "1350" : "1300";

          const journalLines = [
            {
              accountCode: "2000",
              debit: totalApAmount,
              credit: 0,
              refType: "PURCHASE_RETURN",
              refId: id,
            },
            {
              accountCode: inventoryAccountCode,
              debit: 0,
              credit: totalInventoryValue,
              refType: "PURCHASE_RETURN",
              refId: id,
            },
          ];

          if (Math.abs(costVariance) > 0.005) {
            journalLines.push(
              costVariance > 0
                ? {
                    accountCode: "5900",
                    debit: 0,
                    credit: costVariance,
                    refType: "PURCHASE_RETURN",
                    refId: id,
                  }
                : {
                    accountCode: "5900",
                    debit: Math.abs(costVariance),
                    credit: 0,
                    refType: "PURCHASE_RETURN",
                    refId: id,
                  },
            );
          }

          await glService.postJournal(
            tx,
            journalLines,
            `Purchase return: ${purchaseReturn.returnNo} (${purchaseReturn.purchase.orderNo})`,
            req.user!.id,
          );

          await tx.purchaseReturn.update({
            where: { id },
            data: {
              status: "CONFIRMED",
              settlementMethod: validatedData.settlementMethod,
              inventoryValue: totalInventoryValue,
              costVariance,
              confirmedBy: req.user!.id,
              confirmedAt: new Date(),
            },
          });

          const cashAccountId = validatedData.cashAccountId;
          if (
            validatedData.settlementMethod === "REFUND_CASH" &&
            cashAccountId
          ) {
            const cashAccount = await tx.cashAccount.findUnique({
              where: { id: cashAccountId },
            });

            if (!cashAccount) {
              throw new Error("Cash account not found");
            }
            const glAccount = await tx.chartOfAccount.findUnique({
              where: { id: cashAccount.glAccountId },
            });
            if (glAccount) {
              await glService.postJournal(
                tx,
                [
                  {
                    accountCode: "2000",
                    debit: 0,
                    credit: totalApAmount,
                    refType: "PURCHASE_RETURN_REFUND",
                    refId: id,
                  },
                  {
                    accountCode: glAccount.code,
                    debit: totalApAmount,
                    credit: 0,
                    refType: "PURCHASE_RETURN_REFUND",
                    refId: id,
                  },
                ],
                `Cash refund for return ${purchaseReturn.returnNo}`,
                req.user!.id,
              );

              await tx.cashAccount.update({
                where: { id: cashAccount.id },
                data: {
                  balance: {
                    increment: totalApAmount,
                  },
                },
              });
            } else {
              throw new Error("Refund Cash Account not found");
            }
          }
        },
        { maxWait: 5000, timeout: 20000 },
      );

      res.json({ message: "Purchase return confirmed successfully" });
    } catch (error: any) {
      console.error("Confirm purchase return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to confirm purchase return" });
    }
  }

  async getPurchaseReturns(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status, vendorId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (vendorId) where.vendorId = vendorId;

      const [returns, total] = await Promise.all([
        prisma.purchaseReturn.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            vendor: { select: { code: true, name: true } },
            purchase: { select: { orderNo: true } },
            preparer: { select: { name: true } },
            purchaseReturnLines: {
              include: { item: { select: { sku: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.purchaseReturn.count({ where }),
      ]);

      res.json({
        purchaseReturns: returns,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get purchase returns error:", error);
      res.status(500).json({ error: "Failed to fetch purchase returns" });
    }
  }

  async cancelPurchaseReturn(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.purchaseReturn.updateMany({
        where: { id, status: "DRAFT" },
        data: {
          status: "CANCELLED",
          cancelledBy: req.user!.id,
          cancelledAt: new Date(),
        },
      });
      if (updated.count === 0) {
        throw new Error("Only draft returns can be cancelled");
      }
      res.json({ message: "Purchase return cancelled successfully" });
    } catch (error: any) {
      console.error("Cancel purchase return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to cancel purchase return" });
    }
  }

  async getVendors(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { code: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.vendor.count({ where }),
      ]);

      res.json({
        vendors,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get vendors error:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  }

  async getVendorById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const vendor = await prisma.vendor.findUnique({
        where: { id },
      });

      if (!vendor) {
        return res.status(404).json({
          error: "Vendor not found",
        });
      }

      res.json(vendor);
    } catch (error) {
      console.error("Get vendor by id error:", error);
      res.status(500).json({
        error: "Failed to fetch vendor",
      });
    }
  }

  async createVendor(req: AuthRequest, res: Response) {
    try {
      const validatedData = createVendorSchema.parse(req.body);
      const { mode, ...vendorData } = validatedData;

      //create Mode
      if (mode === "create") {
        //check if vendorcode exist before
        const existingVendor = await prisma.vendor.findUnique({
          where: { code: validatedData.code },
        });
        if (existingVendor) {
          console.log("Vendor with the same code already exist");
          throw new Error("Vendor with the same code already exist");
        } else {
          const vendor = await prisma.vendor.create({
            data: { ...vendorData, createdBy: req.user!.id },
          });

          res.status(201).json(vendor);
          return;
        }
      }

      //update mode
      if (mode === "update") {
        const vendor = await prisma.vendor.update({
          where: { code: validatedData.code },
          data: { ...vendorData },
        });
        res.status(200).json(vendor);
        return;
      }
    } catch (error) {
      console.error("Create vendor error:", error);

      res
        .status(400)
        .json({ error: "Failed to create/update vendor" + error.message });
    }
  }

  async updatePurchase(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { vendorId, orderDate, notes, purchaseLines } = req.body;

      // Check if purchase can be edited
      const existingPurchase = await prisma.purchase.findUnique({
        where: { id },
        select: { status: true },
      });

      if (
        !existingPurchase ||
        !["DRAFT", "ORDERED"].includes(existingPurchase.status)
      ) {
        return res
          .status(400)
          .json({ error: "Cannot edit purchase in current status" });
      }

      // Calculate new total
      const totalAmount = purchaseLines.reduce((sum: number, line: any) => {
        return sum + line.qty * line.unitPrice;
      }, 0);

      // Update purchase main record
      const updatedPurchase = await prisma.purchase.update({
        where: { id },
        data: {
          vendorId,
          orderDate: new Date(orderDate),
          totalAmount,
          notes,
        },
      });

      // Replace purchase lines (delete then recreate)
      await prisma.purchaseLine.deleteMany({ where: { purchaseId: id } });

      const lineData = purchaseLines.map((line: any) => ({
        purchaseId: id,
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal: line.qty * line.unitPrice,
      }));

      await prisma.purchaseLine.createMany({ data: lineData });

      res.json(updatedPurchase);
    } catch (error) {
      console.error("Update purchase error:", error);
      res.status(400).json({ error: "Failed to update purchase" });
    }
  }

  async deletePurchase(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if purchase can be deleted
      const purchase = await prisma.purchase.findUnique({
        where: { id },
        select: { status: true, orderNo: true },
      });

      if (!purchase || !["DRAFT", "ORDERED"].includes(purchase.status)) {
        return res
          .status(400)
          .json({ error: "Cannot delete purchase in current status" });
      }

      await prisma.purchase.delete({
        where: { id },
      });

      res.json({ message: "Purchase deleted successfully" });
    } catch (error) {
      console.error("Delete purchase error:", error);
      res.status(400).json({ error: "Failed to delete purchase" });
    }
  }

  async printPurchaseOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const purchase = await prisma.purchase.findUnique({
        where: { id },
        include: {
          vendor: true,
          purchaseLines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      res.json({
        purchase,
        printData: {
          title: "PURCHASE ORDER",
          documentNo: purchase.orderNo,
          date: purchase.orderDate,
          vendor: purchase.vendor,
          lines: purchase.purchaseLines,
          total: purchase.totalAmount,
        },
      });
    } catch (error) {
      console.error("Print purchase order error:", error);
      res.status(500).json({ error: "Failed to generate purchase order" });
    }
  }
}

async function getItemTypeById(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { type: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  return String(item.type);
}
