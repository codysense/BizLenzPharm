import { Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

import { AuthRequest } from "../middleware/auth";

import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";
import { ItemType, CostingMethod } from "@prisma/client"; // Adjust path as necessary
import { z } from "zod";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();
// Zod schema for validation of each row in the imported QuickBooks inventory list
const importItemRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(ItemType).default(ItemType.FINISHED_GOODS),
  uom: z.string().default("Pcs"),
  minimumStockLevel: z.number().positive().optional(),
  costingMethod: z.nativeEnum(CostingMethod).default(CostingMethod.GLOBAL),
  standardCost: z.number().optional(),
  cartonQuantity: z.number().optional(),
  taxCode: z.string().optional(),

  // Pricing & Stock details from Excel mapping
  salesPrice: z.number().nonnegative().optional().default(0), // Maps to walk-in customer group price
  wholesalesPrice: z.number().nonnegative().optional().default(0), // Maps to wholesales customer group price
  patientPrice: z.number().nonnegative().optional().default(0), // Maps to patient customer group price
  costPrice: z.number().nonnegative().optional().default(0), // Maps to unitCost in opening stock
  stockBalance: z.number().nonnegative().optional().default(0), // Maps to qty in opening stock
});
const importPayloadSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  remarks: z.string().optional(),
  items: z.array(importItemRowSchema),
});
export class ItemImportController {
  /**
   * Imports items and creates their opening stock in a single transaction,
   * aligning with createItemSchema and createOpeningStockSchema validation logic.
   */
  async importFromJSON(req: AuthRequest, res: Response) {
    try {
      const validatedData = importPayloadSchema.parse(req.body);
      const { warehouseId, openingDate, remarks, items } = validatedData;
      if (items.length === 0) {
        return res.status(400).json({ error: "No items provided for import" });
      }
      // We wrap the entire import logic in a transaction to guarantee data integrity
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Resolve starting SKU number for FINISHED_GOODS
          const lastItem = await tx.item.findFirst({
            where: { type: "FINISHED_GOODS" },
            orderBy: { createdAt: "desc" },
          });
          let nextItemNumber = 1;
          if (lastItem) {
            const lastNumber = parseInt(lastItem.sku.replace(/^ITM-/, ""), 10);
            if (!isNaN(lastNumber)) {
              nextItemNumber = lastNumber + 1;
            }
          }
          // 2. Resolve starting Opening Stock Reference Number
          const lastOpeningStock = await tx.openingStock.findFirst({
            orderBy: { createdAt: "desc" },
          });
          let nextOSNumber = 1;
          if (lastOpeningStock) {
            const match = lastOpeningStock.referenceNo.match(/\d+$/);
            if (match) {
              nextOSNumber = parseInt(match[0], 10) + 1;
            }
          }
          const referenceNo = `OS${String(nextOSNumber).padStart(6, "0")}`;
          const createdItems: any[] = [];
          const openingLinesData: Array<{
            itemId: string;
            qty: number;
            unitCost: number;
          }> = [];
          // 3. Create items one by one to properly assign sequential SKUs
          for (const itemRow of items) {
            const sku = `ITM-${String(nextItemNumber).padStart(8, "0")}`;
            nextItemNumber++;
            // Extract Excel-specific fields
            const {
              salesPrice,
              wholesalesPrice,
              patientPrice,
              costPrice,
              stockBalance,
              ...itemDetails
            } = itemRow;
            // Create the main item record
            const item = await tx.item.create({
              data: {
                sku,
                ...itemDetails,
              },
            });
            // If a salesPrice was provided, create a default "General" price list entry
            if (salesPrice !== undefined && salesPrice > 0) {
              await tx.itemPriceList.createMany({
                data: [
                  {
                    itemId: item.id,
                    customerGroup: "Walk-in",
                    price: salesPrice,
                  },
                ],
              });
            }
            if (wholesalesPrice !== undefined && wholesalesPrice > 0) {
              await tx.itemPriceList.createMany({
                data: [
                  {
                    itemId: item.id,
                    customerGroup: "Wholesales",
                    price: wholesalesPrice,
                  },
                ],
              });
            }

            if (patientPrice !== undefined && patientPrice > 0) {
              await tx.itemPriceList.createMany({
                data: [
                  {
                    itemId: item.id,
                    customerGroup: "Patient",
                    price: patientPrice,
                  },
                ],
              });
            }

            createdItems.push(item);
            // If the item has a positive stock balance, prepare it for opening stock
            if (stockBalance !== undefined && stockBalance > 0) {
              openingLinesData.push({
                itemId: item.id,
                qty: stockBalance,
                unitCost: costPrice || 0,
              });
            }
          }
          // 4. Create Opening Stock if there are items with balances
          let openingStock = null;
          if (openingLinesData.length > 0) {
            const totalQty = openingLinesData.reduce(
              (sum, line) => sum + line.qty,
              0,
            );
            const totalValue = openingLinesData.reduce(
              (sum, line) => sum + line.qty * line.unitCost,
              0,
            );
            // Create parent Opening Stock entry
            openingStock = await tx.openingStock.create({
              data: {
                referenceNo,
                warehouseId,
                openingDate: new Date(openingDate),
                remarks: remarks || "QuickBooks Bulk Import",
                totalQty,
                totalValue,
                createdById: req.user!.id,
              },
            });
            // Create child Opening Stock Lines
            await tx.openingStockLine.createMany({
              data: openingLinesData.map((line) => ({
                openingStockId: openingStock!.id,
                itemId: line.itemId,
                qty: line.qty,
                unitCost: line.unitCost,
                lineTotal: line.qty * line.unitCost,
              })),
            });
            // Receive inventory via Costing Service (for costing/FIFO/LIFO tracking)
            for (const line of openingLinesData) {
              await costingService.receiveInventory(
                tx,
                line.itemId,
                warehouseId,
                line.qty,
                line.unitCost,
                "OPENING_STOCK",
                openingStock!.id,
                req.user!.id,
              );
            }
            // Post to the General Ledger
            await glService.postJournal(
              tx,
              [
                {
                  accountCode: "1350", // Inventory Asset Account
                  debit: totalValue,
                  credit: 0,
                  refType: "OPENING_STOCK",
                  refId: openingStock!.id,
                },
                {
                  accountCode: "3000", // Opening Balance Equity / Capital Account
                  debit: 0,
                  credit: totalValue,
                  refType: "OPENING_STOCK",
                  refId: openingStock!.id,
                },
              ],
              `Opening Stock (${referenceNo}) - QB Import`,
              req.user!.id,
              new Date(openingDate),
            );
          }
          return {
            importedItemsCount: createdItems.length,
            openingStockCreated: !!openingStock,
            referenceNo: openingStock ? referenceNo : null,
          };
        },
        {
          maxWait: 20000,
          timeout: 80000,
        },
      );
      res.status(201).json({
        message: "QuickBooks items and opening stock imported successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("QuickBooks import error:", error);
      res.status(400).json({
        error:
          error?.message || "Failed to import items and create opening stock",
      });
    }
  }
}
