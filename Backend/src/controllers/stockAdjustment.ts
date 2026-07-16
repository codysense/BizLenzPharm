import { createStockAdustmentSchema } from "../types/stock_adjustment";
import { Response } from "express";
import { PrismaClient, AdjustmentType } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

export class AdjustmentController {
  async getStockAdjustment(req: AuthRequest, res: Response) {
    try {
      const adjustments = await prisma.stockAdjustment.findMany({
        include: {
          user: {
            select: { name: true },
          },
          warehouse: {
            select: { name: true },
          },
          adjustmentLines: {
            include: {
              item: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          adjustmentDate: "desc",
        },
      });

      const formatted = adjustments.flatMap((adj) =>
        adj.adjustmentLines.map((line) => ({
          date: adj.adjustmentDate,
          itemName: line.item.name,
          adjustmentType: line.adjustmentType,
          quantity: line.qty,
          warehouse: adj.warehouse.name,
          createdBy: adj.user.name,
        })),
      );

      return res.status(200).json({ success: true, data: formatted });
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      return res
        .status(500)
        .json({ success: false, error: "Failed to fetch stock adjustments" });
    }
  }

  async adjustStock(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createStockAdustmentSchema.parse(req.body);

      await prisma.$transaction(
        async (tx) => {
          //Calculate total Quantity
          const totalQuantity = validatedData.adjustmentLines.reduce(
            (sum, line) => {
              return sum + line.quantity;
            },
            0,
          );
          //Record new adjustment
          const newAdjustment = await tx.stockAdjustment.create({
            data: {
              adjustmentDate: validatedData.adjustmentDate,
              totalQuantity,
              notes: validatedData.notes,
              createdBy: req.user!.id,
              warehouseId: validatedData.warehouseId,
              accountId: validatedData.accountId,
            },
          });

          // Create adjustment lines
          for (const line of validatedData.adjustmentLines) {
            await tx.adjustmentLines.create({
              data: {
                adjustmentId: newAdjustment.id,
                itemId: line.itemId,
                qty: line.quantity,
                adjustmentType: line.adjustmentType as AdjustmentType,
                value: 0.0,
              },
            });
          }
          // Process each adjustment line
          for (const adjustmentLine of validatedData.adjustmentLines) {
            // Issue inventory using costing service

            //  const adjustmentLineAvg = adjustmentLine.find(al => al.id === adjustmentLine.saleLineId);
            if (adjustmentLine) {
              // Get current inventory value for COGS calculation
              const inventoryValue = await costingService.getInventoryValue(
                adjustmentLine.itemId,
                newAdjustment.warehouseId,
              );
              const unitCost = inventoryValue.avgCost;
              const totalValue = unitCost * adjustmentLine.quantity;
              const accountCode = await getAccountCodeById(
                validatedData.accountId,
              );
              const itemType = await getItemTypeId(adjustmentLine.itemId);
              // console.log(accountCode, itemType)
              if (adjustmentLine.adjustmentType === "SURPLUS") {
                await costingService.receiveInventory(
                  tx,
                  adjustmentLine.itemId,
                  newAdjustment.warehouseId,
                  adjustmentLine.quantity,
                  unitCost,
                  `Stock adjustment: ${newAdjustment.notes}`,
                  newAdjustment.id,
                  req.user!.id,
                );
                await glService.postJournal(
                  tx,
                  [
                    {
                      accountCode:
                        itemType === "FINISHED_GOODS" ? "1350" : "1300",
                      debit: Number(totalValue),
                      credit: 0,
                      refType: "STOCK ADJUSTMENT",
                      refId: newAdjustment.id,
                    },
                    {
                      accountCode: String(accountCode),
                      debit: 0,
                      credit: Number(totalValue),
                      refType: "STOCK ADJUSTMENT",
                      refId: newAdjustment.id,
                    },
                  ],
                  `Stock adjustment: ${newAdjustment.notes}`,
                  req.user!.id,
                );
              } else {
                await costingService.issueInventory(
                  tx,
                  adjustmentLine.itemId,
                  newAdjustment.warehouseId,
                  adjustmentLine.quantity,
                  `Stock adjustment: ${newAdjustment.notes}`,
                  newAdjustment.id,
                  req.user!.id,
                );
                await glService.postJournal(
                  tx,
                  [
                    {
                      accountCode:
                        itemType === "FINISHED_GOODS" ? "1350" : "1300",
                      debit: 0,
                      credit: Number(totalValue),
                      refType: "STOCK ADJUSTMENT",
                      refId: newAdjustment.id,
                    },
                    {
                      accountCode: String(accountCode),
                      debit: Number(totalValue),
                      credit: 0,
                      refType: "STOCK ADJUSTMENT",
                      refId: newAdjustment.id,
                    },
                  ],
                  `Stock adjustment: ${newAdjustment.notes}`,
                  req.user!.id,
                );
              }
            }
          }
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.json({ message: "Stock Adjustment successfully" });
    } catch (error) {
      console.error("Stock adjustment error:", error);
      res.status(400).json({ error: "Failed to adjust stock" });
    }
  }
}

async function getAccountCodeById(accountId: string) {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id: accountId },
    select: { code: true },
  });

  if (!account) {
    throw new Error("Chart of Account not found");
  }

  return String(account.code);
}
async function getItemTypeId(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { type: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  return String(item.type);
}
