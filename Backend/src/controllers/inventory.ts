import { Request, Response } from "express";
import { ItemType, PrismaClient } from "@prisma/client";
import {
  createItemSchema,
  createBomSchema,
  inventoryAdjustmentSchema,
  bulkInventoryTransferSchema,
  createLocationSchema,
  createWarehouseSchema,
  createUOMSchema,
  updateUOMSchema,
} from "../types/inventory";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";
// import prisma from '@prisma/client';
import { Prisma } from "@prisma/client";
// import prisma from "../prisma"; //
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

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

export class InventoryController {
  //   async getItems(req: AuthRequest, res: Response) {
  //   try {
  //     const { page = 1, limit = 10, type, search, includeStock } = req.query;
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};

  //     if (type){
  //        where.type = type;
  //     }

  //     if (search) {
  //       where.OR = [
  //         { sku: { contains: search as string, mode: 'insensitive' } },
  //         { name: { contains: search as string, mode: 'insensitive' } }
  //       ];
  //     }

  //     // Apply warehouse filtering for non-admin users
  //     let warehouseFilter = null;
  //     if (!req.user!.roles.includes('CFO') && !req.user!.roles.includes('General Manager')) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true }
  //       });
  //       warehouseFilter = user?.warehouseId;
  //     }
  //     console.log('WHERE:', JSON.stringify(where, null, 2));

  //     const [items, total] = await Promise.all([
  //       prisma.item.findMany({
  //          //  apply search/type filters
  //          where,
  //         skip,
  //         take: Number(limit),
  //         orderBy: { createdAt: 'desc' }
  //       }),
  //       prisma.item.count({ where }) //count matches filters
  //     ]);

  //     //where,
  // //{ where }
  //     // Include stock quantities if requested
  //     let itemsWithStock = items;
  //     if (includeStock === 'true') {
  //       itemsWithStock = await Promise.all(
  //         items.map(async (item) => {
  //           let stockQty ;

  //       if (warehouseFilter) {
  //   //  Non-admin user → latest stock in their warehouse
  //           const latestEntry = await prisma.inventoryLedger.findFirst({
  //           where: { itemId: item.id, warehouseId: warehouseFilter },
  //             orderBy: { postedAt: 'desc' }
  //            });
  //         stockQty = latestEntry?.runningQty || 0;
  // } else {
  //   //  Admin user → sum of latest balances across all warehouses
  //   const warehouses = await prisma.warehouse.findMany({ select: { id: true } });

  //   const balances = await Promise.all(
  //     warehouses.map(async (wh) => {
  //       const latestEntry = await prisma.inventoryLedger.findFirst({
  //         where: { itemId: item.id, warehouseId: wh.id },
  //         orderBy: { postedAt: 'desc' }
  //       });
  //       return latestEntry?.runningQty || 0;
  //     })
  //   );

  //   stockQty = balances
  //   .map((qty) => Number(qty)) // ensure all are numbers
  //   .reduce((sum, qty) => sum + qty, 0);
  // }

  //           // const stockWhere: any = { itemId: item.id };
  //           // if (warehouseFilter) {
  //           //   stockWhere.warehouseId = warehouseFilter;
  //           // }

  //           // const stockEntries = await prisma.inventoryLedger.findMany({
  //           //   where: stockWhere,
  //           //   orderBy: { postedAt: 'desc' },
  //           //   take: warehouseFilter ? 1 : 10
  //           // });

  //           // // const stockQty = warehouseFilter
  //           // //   ? (stockEntries[0]?.runningQty || 0)
  //           // //   : stockEntries.reduce((sum, entry) => sum + Number(entry.runningQty), 0);

  //           // const stockQty = stockEntries[0]?.runningQty || 0

  //           return { ...item, stockQty: Number(stockQty) };
  //         })
  //       );
  //     }

  //     res.json({
  //       items: itemsWithStock,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit))
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Get items error:', error);
  //     res.status(500).json({ error: 'Failed to fetch items' });
  //   }
  // }

  // async createItem(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createItemSchema.parse(req.body);

  //     await prisma.item.upsert({
  //     where: { sku: validatedData.sku },
  //     update: { ...validatedData },
  //     create: { ...validatedData },
  //     });

  //     const item = await prisma.item.create({
  //       data: validatedData
  //     });

  //     res.status(201).json(item);
  //   } catch (error) {
  //     console.error('Create item error:', error);
  //     res.status(400).json({ error: 'Failed to create item' });
  //   }
  // }

  async deleteItem(req: AuthRequest, res: Response) {
    try {
      const { sku } = req.params;

      // Check if item can be deleted,
      const item = await prisma.item.findUnique({
        //check if item is active , quantity is zero not in any inventory transfer
        where: { sku },
        select: { isActive: true, id: true },
      });

      if (!item) {
        return res
          .status(404)
          .json({ error: "Item not found or already deleted" });
      }

      //Check if item has transaction or has BOM
      const transaction = await prisma.inventoryLedger.findMany({
        where: { itemId: item.id },
      });

      const bomEntry = await prisma.bom.findMany({
        where: { itemId: item.id },
      });

      if (transaction.length > 0 || bomEntry.length > 0) {
        return res
          .status(400)
          .json({ error: "Cannot delete item with transaction" });
      }

      //Delete item

      await prisma.item.delete({
        where: { sku },
      });

      res.json({ message: "item deleted successfully" });
    } catch (error) {
      console.error("Delete item error:", error);
      res.status(400).json({ error: "Failed to delete purchase" });
    }
  }

  //   async createItem(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = createItemSchema.parse(req.body);

  //     // console.log(req.body)

  //     const item = await prisma.item.upsert({
  //       where: { sku: validatedData.sku },
  //       update: { ...validatedData },
  //       create: { ...validatedData },
  //     });

  //     res.status(201).json(item);
  //   } catch (error) {
  //     console.error('Create/Update item error:', error);
  //     res.status(400).json({ error: 'Failed to create or update item' });
  //   }
  // }

  async createItem(req: AuthRequest, res: Response) {
    try {
      const validatedData = createItemSchema.parse(req.body);
      const { priceList, sku: inputSku, ...itemData } = validatedData;

      const lastItem = await prisma.item.findFirst({
        where: { type: "FINISHED_GOODS" },
        orderBy: { createdAt: "desc" },
      });

      let nextNumber = 1;
      if (lastItem) {
        // Extract the numeric part of the transactionNo
        const lastNumber = parseInt(lastItem?.sku.replace(/^ITM-/, ""), 10);
        nextNumber = lastNumber + 1;
        // console.log("Last Item", lastItem, "Last Number", lastNumber);
      }

      const nextItemSku = `ITM-${String(nextNumber).padStart(8, "0")}`;

      const item = await prisma.item.create({
        data: { sku: nextItemSku, ...itemData },
      });

      if (priceList && Array.isArray(priceList)) {
        // Delete old price list entries
        await prisma.itemPriceList.deleteMany({ where: { itemId: item.id } });

        // Create new price list entries
        await prisma.itemPriceList.createMany({
          data: priceList.map((p: any) => ({
            itemId: item.id,
            customerGroup: p.customerGroup,
            price: p.price,
          })),
        });
      }

      res.status(201).json(item);
    } catch (error) {
      console.error("Create item error:", error);
      res.status(400).json({ error: "Failed to create or update item" });
    }
  }

  async updateItem(req: AuthRequest, res: Response) {
    try {
      const validatedData = createItemSchema.parse(req.body);
      const { priceList, ...itemData } = validatedData;

      const item = await prisma.item.update({
        where: { sku: itemData.sku },
        data: { ...itemData },
      });
      if (priceList && Array.isArray(priceList)) {
        // Delete old price list entries
        await prisma.itemPriceList.deleteMany({ where: { itemId: item.id } });

        // Create new price list entries
        await prisma.itemPriceList.createMany({
          data: priceList.map((p: any) => ({
            itemId: item.id,
            customerGroup: p.customerGroup,
            price: p.price,
          })),
        });
      }

      res.status(201).json(item);
    } catch (error) {
      console.error("Update item error:", error);
      res.status(400).json({ error: "Failed to  update item" });
    }
  }

  async getBoms(req: AuthRequest, res: Response) {
    try {
      const { itemId } = req.query;

      const where: any = {};
      if (itemId) where.itemId = itemId;

      const boms = await prisma.bom.findMany({
        where,
        include: {
          item: {
            select: { sku: true, name: true },
          },
          bomLines: {
            include: {
              componentItem: {
                select: { sku: true, name: true, uom: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(boms);
    } catch (error) {
      console.error("Get BOMs error:", error);
      res.status(500).json({ error: "Failed to fetch BOMs" });
    }
  }

  async createBom(req: AuthRequest, res: Response) {
    try {
      const validatedData = createBomSchema.parse(req.body);

      const bom = await prisma.$transaction(
        async (tx) => {
          // Deactivate existing BOMs for this item
          await tx.bom.updateMany({
            where: { itemId: validatedData.itemId },
            data: { isActive: false },
          });

          // Create new BOM
          const newBom = await tx.bom.create({
            data: {
              itemId: validatedData.itemId,
              version: validatedData.version,
              bomLines: {
                create: validatedData.bomLines,
              },
            },
          });

          return newBom;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(bom);
    } catch (error) {
      console.error("Create BOM error:", error);
      res.status(400).json({ error: "Failed to create BOM" });
    }
  }

  async adjustInventory(req: AuthRequest, res: Response) {
    try {
      const validatedData = inventoryAdjustmentSchema.parse(req.body);

      await prisma.$transaction(
        async (tx) => {
          if (validatedData.adjustmentType === "IN") {
            // Inventory increase
            await costingService.receiveInventory(
              tx,
              validatedData.itemId,
              validatedData.warehouseId,
              validatedData.qty,
              validatedData.unitCost || 0,
              "ADJUSTMENT",
              `ADJ-${Date.now()}`,
              req.user!.id,
            );

            // Post to general ledger
            const value = validatedData.qty * (validatedData.unitCost || 0);
            await glService.postJournal(
              tx,
              [
                {
                  accountCode: "1300",
                  debit: value,
                  credit: 0,
                  refType: "ADJUSTMENT",
                  refId: `ADJ-${Date.now()}`,
                },
                {
                  accountCode: "8100",
                  debit: 0,
                  credit: value,
                  refType: "ADJUSTMENT",
                  refId: `ADJ-${Date.now()}`,
                },
              ],
              `Inventory adjustment: ${validatedData.reason}`,
              req.user!.id,
            );
          } else {
            // Inventory decrease
            const result = await costingService.issueInventory(
              tx,
              validatedData.itemId,
              validatedData.warehouseId,
              validatedData.qty,
              "ADJUSTMENT",
              `ADJ-${Date.now()}`,
              req.user!.id,
            );

            // Post to general ledger
            await glService.postJournal(
              tx,
              [
                {
                  accountCode: "8100",
                  debit: result.value,
                  credit: 0,
                  refType: "ADJUSTMENT",
                  refId: `ADJ-${Date.now()}`,
                },
                {
                  accountCode: "1300",
                  debit: 0,
                  credit: result.value,
                  refType: "ADJUSTMENT",
                  refId: `ADJ-${Date.now()}`,
                },
              ],
              `Inventory adjustment: ${validatedData.reason}`,
              req.user!.id,
            );
          }
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.json({ message: "Inventory adjusted successfully" });
    } catch (error) {
      console.error("Adjust inventory error:", error);
      res.status(400).json({ error: "Failed to adjust inventory" });
    }
  }

  // async transferInventory(req: AuthRequest, res: Response) {
  //   try {
  //     const validatedData = inventoryTransferSchema.parse(req.body);

  //     // Generate ONE refId for both OUT and IN entries
  //     const refId = `TRF-${Date.now()}`;

  //     await prisma.$transaction(
  //       async (tx) => {
  //         // Issue from source warehouse (OUT)
  //         const result = await costingService.issueInventory(
  //           validatedData.itemId,
  //           validatedData.fromWarehouseId,
  //           validatedData.qty,
  //           "TRANSFER",
  //           refId,
  //           req.user!.id
  //           // tx // pass the transaction client if service supports it
  //         );

  //         // Receive into destination warehouse (IN)
  //         await costingService.receiveInventory(
  //           validatedData.itemId,
  //           validatedData.toWarehouseId,
  //           validatedData.qty,
  //           result.unitCost,
  //           "TRANSFER",
  //           refId,
  //           req.user!.id
  //           // tx
  //         );
  //       },
  //       {
  //         maxWait: 5000, // 5s wait for connection
  //         timeout: 20000, // 20s max runtime
  //       }
  //     );

  //     res.json({ message: "Inventory transferred successfully", refId });
  //   } catch (error) {
  //     console.error("Transfer inventory error:", error);
  //     res.status(400).json({ error: "Failed to transfer inventory" });
  //   }
  // }

  async transferInventoryBulk(req: AuthRequest, res: Response) {
    try {
      const data = bulkInventoryTransferSchema.parse(req.body);
      const refId = `TRF-${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        // 1️ Create transfer header
        const transfer = await tx.inventoryTransfer.create({
          data: {
            refId,
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            createdById: req.user!.id,
          },
        });

        // 2️ Process items
        for (const item of data.transferItems) {
          const issueResult = await costingService.issueInventoryForTransfer(
            tx,
            item.itemId,
            data.fromWarehouseId,
            item.qty,
            "TRANSFER",
            refId,
            req.user!.id,
          );

          await costingService.receiveInventoryForTransfer(
            tx,
            item.itemId,
            data.toWarehouseId,
            item.qty,
            issueResult.unitCost,
            "TRANSFER",
            refId,
            req.user!.id,
          );

          // 3️ Create transfer line
          await tx.inventoryTransferItem.create({
            data: {
              transferId: transfer.id,
              itemId: item.itemId,
              qty: item.qty,
              unitCost: issueResult.unitCost,
            },
          });
        }
      });

      res.json({
        message: "Bulk inventory transfer successful",
        refId,
      });
    } catch (error) {
      console.error("Bulk transfer error:", error);
      res.status(400).json({ error: "Bulk transfer failed" });
    }
  }

  async getInventoryTransfers(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        itemId,
        fromWarehouseId,
        toWarehouseId,
        dateFrom,
        dateTo,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const newDateFrom = startOfDayUTC(new Date(dateFrom as string));
      const newDateTo = endOfDayUTC(new Date(dateTo as string));

      const where: any = {};

      if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId;
      if (toWarehouseId) where.toWarehouseId = toWarehouseId;

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = newDateFrom;
        if (dateTo) where.createdAt.lte = newDateTo;
      }

      if (itemId) {
        where.items = {
          some: { itemId: itemId as string },
        };
      }

      const [transfers, total] = await Promise.all([
        prisma.inventoryTransfer.findMany({
          where,
          include: {
            fromWarehouse: { select: { code: true, name: true } },
            toWarehouse: { select: { code: true, name: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                item: { select: { sku: true, name: true, uom: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.inventoryTransfer.count({ where }),
      ]);

      res.json({
        transfers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get inventory transfers error:", error);
      res.status(500).json({ error: "Failed to fetch inventory transfers" });
    }
  }

  async getInventoryTransfer(req: AuthRequest, res: Response) {
    try {
      const { refId } = req.params;

      if (!refId) {
        return res.status(400).json({ error: "refId is required" });
      }

      const transfer = await prisma.inventoryTransfer.findUnique({
        where: { refId },
        include: {
          fromWarehouse: { select: { code: true, name: true } },
          toWarehouse: { select: { code: true, name: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              item: { select: { sku: true, name: true, uom: true } },
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ error: "Inventory transfer not found" });
      }

      res.json({ transfer });
    } catch (error) {
      console.error("Get inventory transfer error:", error);
      res.status(500).json({ error: "Failed to fetch inventory transfer" });
    }
  }

  async printInventoryTransfer(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // refId

      const transfer = await prisma.inventoryTransfer.findUnique({
        where: { refId: id },
        include: {
          fromWarehouse: {
            select: { code: true, name: true },
          },
          toWarehouse: {
            select: { code: true, name: true },
          },
          createdBy: {
            select: { name: true },
          },
          items: {
            include: {
              item: {
                select: { sku: true, name: true, uom: true },
              },
            },
          },
        },
      });

      if (!transfer) {
        return res.status(404).json({ error: "Transfer not found" });
      }

      // Format line items
      const lines = transfer.items.map((line, index) => ({
        sn: index + 1,
        sku: line.item.sku,
        name: line.item.name,
        uom: line.item.uom,
        qty: Number(line.qty),
        // unitCost: Number(line.unitCost),
        //value: Number(line.qty) * Number(line.unitCost),
      }));

      const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
      // const totalValue = lines.reduce((sum, l) => sum + l.value, 0);

      res.json({
        transfer: {
          refId: transfer.refId,
          date: transfer.createdAt.toISOString(),
          fromWarehouse: transfer.fromWarehouse,
          toWarehouse: transfer.toWarehouse,
          postedBy: transfer.createdBy,
          items: lines,
          totals: {
            totalQty,
            // totalValue
          },
        },
        printData: {
          title: "INVENTORY TRANSFER NOTE",
          documentNo: transfer.refId,
          date: transfer.createdAt,
          fromWarehouse: transfer.fromWarehouse,
          toWarehouse: transfer.toWarehouse,
          postedBy: transfer.createdBy,
          items: lines,
          totals: {
            totalQty,
            // totalValue,
          },
        },
      });
    } catch (error) {
      console.error("Print inventory transfer error:", error);
      res.status(500).json({
        error: "Failed to generate inventory transfer print",
      });
    }
  }

  async getInventoryLedger(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        itemId,
        warehouseId,
        userId,
        itemType,
        refType,
        direction,
        dateFrom,
        dateTo,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const newDateFrom = startOfDayUTC(new Date(dateFrom as string));
      const newDateTo = endOfDayUTC(new Date(dateTo as string));

      const where: any = {};
      if (itemId) where.itemId = itemId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (userId) where.userId = userId;
      if (refType) where.refType = refType;
      if (direction) where.direction = direction;
      if (dateFrom || dateTo) {
        where.postedAt = {};
        if (dateFrom) where.postedAt.gte = newDateFrom;
        if (dateTo) where.postedAt.lte = newDateTo;
      }

      if (itemType) {
        where.item = { type: itemType };
      }

      //if user role is pos User, filter by their assigned warehouse
      if (req.user?.roles.includes("POS User")) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });
        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      const [entries, total] = await Promise.all([
        prisma.inventoryLedger.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            item: {
              select: { sku: true, name: true, type: true, uom: true },
            },
            warehouse: {
              select: { code: true, name: true },
            },
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: { postedAt: "desc" },
        }),
        prisma.inventoryLedger.count({ where }),
      ]);

      res.json({
        entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get inventory ledger error:", error);
      res.status(500).json({ error: "Failed to fetch inventory ledger" });
    }
  }

  // async exportInventoryLedger(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       format = "csv",
  //       itemId,
  //       warehouseId,
  //       userId,
  //       itemType,
  //       refType,
  //       direction,
  //       dateFrom,
  //       dateTo,
  //     } = req.query;

  //     const where: any = {};
  //     if (itemId) where.itemId = itemId;
  //     if (warehouseId) where.warehouseId = warehouseId;
  //     if (userId) where.userId = userId;
  //     if (refType) where.refType = refType;
  //     if (direction) where.direction = direction;
  //     if (dateFrom || dateTo) {
  //       where.postedAt = {};
  //       if (dateFrom) where.postedAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.postedAt.lte = new Date(dateTo as string);
  //     }
  //     if (itemType) {
  //       where.item = { type: itemType };
  //     }

  //     //if user role is pos User, filter by their assigned warehouse
  //     if (req.user?.roles.includes("POS User")) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });
  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //     const entries = await prisma.inventoryLedger.findMany({
  //       where,
  //       take: 10000, // Limit to prevent memory issues
  //       include: {
  //         item: {
  //           select: { sku: true, name: true, type: true, uom: true },
  //         },
  //         warehouse: {
  //           select: { code: true, name: true },
  //         },
  //         user: {
  //           select: { name: true, email: true },
  //         },
  //       },
  //       orderBy: { postedAt: "desc" },
  //     });

  //     if (format === "csv") {
  //       // Generate CSV
  //       const headers = [
  //         "Date",
  //         "Item SKU",
  //         "Item Name",
  //         "Item Type",
  //         "Warehouse",
  //         "Reference Type",
  //         "Direction",
  //         "Quantity",
  //         "UOM",
  //         "Unit Cost",
  //         "Value",
  //         "Running Qty",
  //         "Running Value",
  //         "Running Avg Cost",
  //         "User",
  //       ];

  //       const csvRows = entries.map((entry) => [
  //         new Date(entry.postedAt).toLocaleDateString(),
  //         entry.item.sku,
  //         entry.item.name,
  //         entry.item.type,
  //         entry.warehouse.name,
  //         entry.refType,
  //         entry.direction,
  //         entry.qty.toString(),
  //         entry.item.uom,
  //         entry.unitCost.toString(),
  //         entry.value.toString(),
  //         entry.runningQty.toString(),
  //         entry.runningValue.toString(),
  //         entry.runningAvgCost.toString(),
  //         entry.user?.name || "System",
  //       ]);

  //       const csvContent = [headers, ...csvRows]
  //         .map((row) => row.map((field) => `"${field}"`).join(","))
  //         .join("\n");

  //       res.setHeader("Content-Type", "text/csv");
  //       res.setHeader(
  //         "Content-Disposition",
  //         `attachment; filename="inventory-ledger-${
  //           new Date().toISOString().split("T")[0]
  //         }.csv"`,
  //       );
  //       res.send(csvContent);
  //     } else {
  //       // Return JSON for Excel/PDF processing
  //       res.json({ entries });
  //     }
  //   } catch (error) {
  //     console.error("Export inventory ledger error:", error);
  //     res.status(500).json({ error: "Failed to export inventory ledger" });
  //   }
  // }

  // async getInventoryValuation(req: AuthRequest, res: Response) {
  //   try {
  //     const { warehouseId, limit = 10, type } = req.query;

  //     const items = await prisma.item.findMany({
  //       where: {
  //         isActive: true,
  //         ...(type && { type: type as ItemType }),
  //       },
  //       select: {
  //         id: true,
  //         sku: true,
  //         name: true,
  //         type: true,
  //         costingMethod: true,
  //         minimumStockLevel: true,
  //       },
  //     });

  //     const valuation: any[] = [];
  //     let totalValue = 0;

  //     // Warehouses resolved ONCE (important)
  //     const warehouses = await prisma.warehouse.findMany({
  //       where: warehouseId ? { id: String(warehouseId) } : { isActive: true },
  //       select: { id: true },
  //     });

  //     for (const item of items) {
  //       for (const warehouse of warehouses) {
  //         const latestEntry = await prisma.inventoryLedger.findFirst({
  //           where: {
  //             itemId: item.id,
  //             warehouseId: warehouse.id,
  //           },
  //           orderBy: { postedAt: "desc" },
  //         });

  //         if (latestEntry && Number(latestEntry.runningQty) > 0) {
  //           const itemValuation = {
  //             itemId: item.id,
  //             sku: item.sku,
  //             name: item.name,
  //             type: item.type,
  //             costingMethod: item.costingMethod,
  //             qty: Number(latestEntry.runningQty),
  //             minimumStockLevel: item.minimumStockLevel || 0, // Placeholder, can be updated to actual minimum stock level
  //             unitCost: Number(latestEntry.runningAvgCost),
  //             totalValue: Number(latestEntry.runningValue),
  //           };

  //           valuation.push(itemValuation);
  //           totalValue += itemValuation.totalValue;
  //         }
  //       }
  //     }

  //     res.json({
  //       valuation,
  //       totalValue,
  //       asOfDate: new Date().toISOString(),
  //     });
  //   } catch (error) {
  //     console.error("Get inventory valuation error:", error);
  //     res.status(500).json({ error: "Failed to fetch inventory valuation" });
  //   }
  // }

  async exportInventoryLedger(req: AuthRequest, res: Response) {
    try {
      const {
        format = "csv",
        itemId,
        warehouseId,
        userId,
        itemType,
        refType,
        direction,
        dateFrom,
        dateTo,
      } = req.query;

      // =====================================================
      // BUILD FILTERS
      // =====================================================

      const where: any = {};
      const newDateFrom = startOfDayUTC(new Date(dateFrom as string));
      const newDateTo = endOfDayUTC(new Date(dateTo as string));

      if (itemId) where.itemId = itemId;
      if (warehouseId) where.warehouseId = warehouseId;
      if (userId) where.userId = userId;
      if (refType) where.refType = refType;
      if (direction) where.direction = direction;

      if (dateFrom || dateTo) {
        where.postedAt = {};

        if (dateFrom) {
          where.postedAt.gte = newDateFrom;
        }

        if (dateTo) {
          where.postedAt.lte = newDateTo;
        }
      }

      if (itemType) {
        where.item = {
          type: itemType,
        };
      }

      // =====================================================
      // POS USER WAREHOUSE RESTRICTION
      // =====================================================

      if (req.user?.roles.includes("POS User")) {
        const user = await prisma.user.findUnique({
          where: {
            id: req.user.id,
          },
          select: {
            warehouseId: true,
          },
        });

        if (user?.warehouseId) {
          where.warehouseId = user.warehouseId;
        }
      }

      // =====================================================
      // FETCH DATA
      // =====================================================

      const entries = await prisma.inventoryLedger.findMany({
        where,
        take: 10000,
        include: {
          item: {
            select: {
              sku: true,
              name: true,
              type: true,
              uom: true,
            },
          },

          warehouse: {
            select: {
              code: true,
              name: true,
            },
          },

          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },

        orderBy: {
          postedAt: "desc",
        },
      });

      // =====================================================
      // FORMAT DATA
      // =====================================================

      const rows = entries.map((entry) => ({
        date: new Date(entry.postedAt).toLocaleDateString(),

        sku: entry.item?.sku || "",

        itemName: entry.item?.name || "",

        itemType: entry.item?.type || "",

        warehouse: entry.warehouse?.name || "",

        refType: entry.refType || "",

        direction: entry.direction || "",

        qty: Number(entry.qty || 0),

        uom: entry.item?.uom || "",

        unitCost: Number(entry.unitCost || 0),

        value: Number(entry.value || 0),

        runningQty: Number(entry.runningQty || 0),

        runningValue: Number(entry.runningValue || 0),

        runningAvgCost: Number(entry.runningAvgCost || 0),

        user: entry.user?.name || "System",
      }));

      const today = new Date().toISOString().split("T")[0];

      // =====================================================
      // CSV EXPORT
      // =====================================================

      if (format === "csv") {
        const headers = [
          "Date",
          "SKU",
          "Item Name",
          "Item Type",
          "Warehouse",
          "Reference Type",
          "Direction",
          "Quantity",
          "UOM",
          "Unit Cost",
          "Value",
          "Running Qty",
          "Running Value",
          "Running Avg Cost",
          "User",
        ];

        const csvRows = rows.map((row) => [
          row.date,
          row.sku,
          row.itemName,
          row.itemType,
          row.warehouse,
          row.refType,
          row.direction,
          row.qty,
          row.uom,
          row.unitCost,
          row.value,
          row.runningQty,
          row.runningValue,
          row.runningAvgCost,
          row.user,
        ]);

        const csvContent = [headers, ...csvRows]
          .map((row) =>
            row
              .map((field) => `"${String(field).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");

        res.setHeader("Content-Type", "text/csv");

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="inventory-ledger-${today}.csv"`,
        );

        return res.status(200).send(csvContent);
      }

      // =====================================================
      // EXCEL EXPORT
      // =====================================================

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();

        workbook.creator = "ProfitPilot";

        workbook.created = new Date();

        const worksheet = workbook.addWorksheet("Inventory Ledger");

        worksheet.columns = [
          { header: "Date", key: "date", width: 15 },

          { header: "SKU", key: "sku", width: 20 },

          { header: "Item Name", key: "itemName", width: 35 },

          { header: "Item Type", key: "itemType", width: 20 },

          { header: "Warehouse", key: "warehouse", width: 25 },

          { header: "Reference Type", key: "refType", width: 20 },

          { header: "Direction", key: "direction", width: 15 },

          { header: "Qty", key: "qty", width: 12 },

          { header: "UOM", key: "uom", width: 10 },

          { header: "Unit Cost", key: "unitCost", width: 15 },

          { header: "Value", key: "value", width: 15 },

          { header: "Running Qty", key: "runningQty", width: 15 },

          { header: "Running Value", key: "runningValue", width: 18 },

          {
            header: "Running Avg Cost",
            key: "runningAvgCost",
            width: 18,
          },

          { header: "User", key: "user", width: 20 },
        ];

        worksheet.addRows(rows);

        // Header styling
        const headerRow = worksheet.getRow(1);

        headerRow.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF1F4E78",
          },
        };

        headerRow.alignment = {
          vertical: "middle",
          horizontal: "center",
        };

        // Freeze top row
        worksheet.views = [
          {
            state: "frozen",
            ySplit: 1,
          },
        ];

        // Currency formatting
        ["J", "K", "M", "N"].forEach((col) => {
          worksheet.getColumn(col).numFmt = "#,##0.00";
        });

        // Auto filter
        worksheet.autoFilter = {
          from: "A1",
          to: "O1",
        };

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="inventory-ledger-${today}.xlsx"`,
        );

        await workbook.xlsx.write(res);

        return res.end();
      }

      // =====================================================
      // PDF EXPORT
      // =====================================================

      if (format === "pdf") {
        const doc = new PDFDocument({
          margin: 20,
          size: "A4",
          layout: "landscape",
        });

        res.setHeader("Content-Type", "application/pdf");

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="inventory-ledger-${today}.pdf"`,
        );

        doc.pipe(res);

        // =====================================================
        // TITLE
        // =====================================================

        doc.fontSize(18).text("Inventory Ledger Report", {
          align: "center",
        });

        doc.moveDown();

        // =====================================================
        // TABLE HEADERS
        // =====================================================

        const headers = [
          "Date",
          "SKU",
          "Item",
          "Qty",
          "Unit Cost",
          "Value",
          "Warehouse",
        ];

        const columnPositions = [20, 90, 180, 380, 440, 520, 610];

        let y = 90;

        headers.forEach((header, index) => {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(header, columnPositions[index], y);
        });

        y += 20;

        // =====================================================
        // TABLE ROWS
        // =====================================================

        rows.forEach((row) => {
          // Add new page if needed
          if (y > 540) {
            doc.addPage();

            y = 40;

            headers.forEach((header, index) => {
              doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .text(header, columnPositions[index], y);
            });

            y += 20;
          }

          const values = [
            row.date,
            row.sku,
            row.itemName,
            row.qty.toFixed(2),
            row.unitCost.toFixed(2),
            row.value.toFixed(2),
            row.warehouse,
          ];

          values.forEach((value, index) => {
            doc
              .fontSize(9)
              .font("Helvetica")
              .text(String(value), columnPositions[index], y, {
                width: 70,
              });
          });

          y += 18;
        });

        // =====================================================
        // FOOTER
        // =====================================================

        doc.moveDown(2);

        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`, {
          align: "right",
        });

        doc.end();

        return;
      }

      // =====================================================
      // INVALID FORMAT
      // =====================================================

      return res.status(400).json({
        error: "Invalid export format",
      });
    } catch (error) {
      console.error("Export inventory ledger error:", error);

      return res.status(500).json({
        error: "Failed to export inventory ledger",
      });
    }
  }

  async getInventoryValuation(req: AuthRequest, res: Response) {
    try {
      const { warehouseId, type } = req.query;

      const result = await prisma.$queryRaw`
      SELECT 
        i.id AS "itemId",
        i.sku,
        i.name,
        i.type,
        i."costingMethod",
        i."minimumStockLevel",
        il."warehouseId",
        il."runningQty",
        il."runningAvgCost",
        il."runningValue"
      FROM (
        SELECT DISTINCT ON ("itemId", "warehouseId")
          "itemId",
          "warehouseId",
          "runningQty",
          "runningAvgCost",
          "runningValue"
        FROM "inventory_ledger"
        ORDER BY "itemId", "warehouseId", "postedAt" DESC
      ) il
      JOIN "items" i ON i.id = il."itemId"
      WHERE 
        i."isActive" = true
        ${warehouseId ? Prisma.sql`AND il."warehouseId" = ${warehouseId}` : Prisma.sql``}
        ${type ? Prisma.sql`AND i."type" = ${type}` : Prisma.sql``}
        AND il."runningQty" > 0;
    `;

      let totalValue = 0;

      const valuation = (result as any[]).map((row) => {
        const totalVal = Number(row.runningValue) || 0;
        totalValue += totalVal;

        return {
          itemId: row.itemId,
          sku: row.sku,
          name: row.name,
          type: row.type,
          costingMethod: row.costingMethod,
          warehouseId: row.warehouseId,
          qty: Number(row.runningQty) || 0,
          minimumStockLevel: row.minimumStockLevel || 0,
          unitCost: Number(row.runningAvgCost) || 0,
          totalValue: totalVal,
        };
      });

      return res.json({
        valuation,
        totalValue,
        asOfDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get inventory valuation error:", error);

      return res.status(500).json({
        error: "Failed to fetch inventory valuation",
      });
    }
  }

  async getWarehouses(req: AuthRequest, res: Response) {
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
          where.id = user.warehouseId;
        }
      }

      const warehouses = await prisma.warehouse.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: "asc" },
      });

      res.json({ warehouses });
    } catch (error) {
      console.error("Get warehouses error:", error);
      res.status(500).json({ error: "Failed to fetch warehouses" });
    }
  }

  async getWarehousesList(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (search) {
        where.OR = [
          { code: { contains: search as string, mode: "insensitive" } },
          { name: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const [warehouses, total] = await Promise.all([
        prisma.warehouse.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            location: {
              select: { code: true, name: true, city: true, state: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.warehouse.count({ where }),
      ]);

      res.json({
        warehouses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get warehouses list error:", error);
      res.status(500).json({ error: "Failed to fetch warehouses" });
    }
  }

  async createWarehouse(req: AuthRequest, res: Response) {
    try {
      const validatedData = createWarehouseSchema.parse(req.body);

      const warehouse = await prisma.warehouse.create({
        data: validatedData,
        include: {
          location: {
            select: { code: true, name: true, city: true, state: true },
          },
        },
      });

      res.status(201).json(warehouse);
    } catch (error) {
      console.error("Create warehouse error:", error);
      res.status(400).json({ error: "Failed to create warehouse" });
    }
  }

  async updateWarehouse(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: req.body,
        include: {
          location: {
            select: { code: true, name: true, city: true, state: true },
          },
        },
      });

      res.json(warehouse);
    } catch (error) {
      console.error("Update warehouse error:", error);
      res.status(400).json({ error: "Failed to update warehouse" });
    }
  }

  // async getLocations(req: AuthRequest, res: Response) {
  //   try {
  //     const { page = 1, limit = 10, search } = req.query;
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = {};
  //     if (search) {
  //       where.OR = [
  //         { code: { contains: search as string, mode: 'insensitive' } },
  //         { name: { contains: search as string, mode: 'insensitive' } },
  //         { city: { contains: search as string, mode: 'insensitive' } }
  //       ];
  //     }

  //     const [locations, total] = await Promise.all([
  //     // Apply warehouse filtering for non-admin users
  //     if (!req.user!.roles.includes('CFO') && !req.user!.roles.includes('General Manager')) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true }
  //       });
  //       if (user?.warehouseId) {
  //         where.warehouseId = user.warehouseId;
  //       }
  //     }

  //       prisma.location.findMany({
  //         where,
  //         skip,
  //         take: Number(limit),
  //         include: {
  //           _count: {
  //             select: { warehouses: true }
  //           }
  //         },
  //         orderBy: { createdAt: 'desc' }
  //       }),
  //       prisma.location.count({ where })
  //     ]);

  //     res.json({
  //       locations,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit))
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Get locations error:', error);
  //     res.status(500).json({ error: 'Failed to fetch locations' });
  //   }
  // }

  async getLocations(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (search) {
        where.OR = [
          { code: { contains: search as string, mode: "insensitive" } },
          { name: { contains: search as string, mode: "insensitive" } },
          { city: { contains: search as string, mode: "insensitive" } },
        ];
      }

      //  Apply warehouse filtering for non-admin users BEFORE queries
      if (
        !req.user!.roles.includes("CFO") &&
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

      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            _count: {
              select: { warehouses: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.location.count({ where }),
      ]);

      res.json({
        locations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get locations error:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  }

  async createLocation(req: AuthRequest, res: Response) {
    try {
      const validatedData = createLocationSchema.parse(req.body);

      const location = await prisma.location.create({
        data: validatedData,
      });

      res.status(201).json(location);
    } catch (error) {
      console.error("Create location error:", error);
      res.status(400).json({ error: "Failed to create location" });
    }
  }

  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const location = await prisma.location.update({
        where: { id },
        data: req.body,
      });

      res.json(location);
    } catch (error) {
      console.error("Update location error:", error);
      res.status(400).json({ error: "Failed to update location" });
    }
  }

  //UOM CRUD operations

  async createUOM(req: AuthRequest, res: Response) {
    try {
      const validatedData = createUOMSchema.parse(req.body);

      const uom = await prisma.uOM.create({
        data: {
          ...validatedData,
          createdBy: (validatedData as any).createdBy ?? req.user!.id,
        },
      });

      res.status(201).json(uom);
    } catch (error) {
      console.error("Create UOM error:", error);
      res.status(400).json({ error: "Failed to create UOM" });
    }
  }

  async getUOMs(req: AuthRequest, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = (req.query.search as string) || "";

      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [data, total] = await Promise.all([
        prisma.uOM.findMany({
          // where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.uOM.count(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get UOM error:", error);
      res.status(400).json({ error: "Failed to fetch UOM" });
    }
  }

  async updateUOM(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const validatedData = updateUOMSchema.parse(req.body);

      const updated = await prisma.uOM.update({
        where: { id },
        data: validatedData,
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error("Update UOM error:", error);
      res.status(400).json({ error: "Failed to update UOM" });
    }
  }

  async deleteUOM(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.uOM.delete({
        where: { id },
      });

      res.status(200).json({ message: "UOM deleted successfully" });
    } catch (error) {
      console.error("Delete UOM error:", error);
      res.status(400).json({ error: "Failed to delete UOM" });
    }
  }

  // async getInventoryTransfers(req: AuthRequest, res: Response) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 10,
  //       itemId,
  //       fromWarehouseId,
  //       toWarehouseId,
  //       dateFrom,
  //       dateTo,
  //     } = req.query;
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const where: any = { refType: "TRANSFER" };
  //     if (itemId) where.itemId = itemId;
  //     if (fromWarehouseId || toWarehouseId) {
  //       // For warehouse filtering, we need to check both directions
  //       if (fromWarehouseId && toWarehouseId) {
  //         where.OR = [
  //           { warehouseId: fromWarehouseId, direction: "OUT" },
  //           { warehouseId: toWarehouseId, direction: "IN" },
  //         ];
  //       } else if (fromWarehouseId) {
  //         where.warehouseId = fromWarehouseId;
  //         where.direction = "OUT";
  //       } else if (toWarehouseId) {
  //         where.warehouseId = toWarehouseId;
  //         where.direction = "IN";
  //       }
  //     }
  //     if (dateFrom || dateTo) {
  //       where.postedAt = {};
  //       if (dateFrom) where.postedAt.gte = new Date(dateFrom as string);
  //       if (dateTo) where.postedAt.lte = new Date(dateTo as string);
  //     }

  //     // Get all transfer entries
  //     const allTransferEntries = await prisma.inventoryLedger.findMany({
  //       where,
  //       include: {
  //         item: {
  //           select: { sku: true, name: true, uom: true },
  //         },
  //         warehouse: {
  //           select: { code: true, name: true },
  //         },
  //         user: {
  //           select: { name: true },
  //         },
  //       },
  //       orderBy: { postedAt: "desc" },
  //     });

  //     // Group by refId to create complete transfer records
  //     const transferMap = new Map();
  //     allTransferEntries.forEach((entry) => {
  //       if (!transferMap.has(entry.refId)) {
  //         transferMap.set(entry.refId, {
  //           id: entry.refId,
  //           transferDate: entry.postedAt.toISOString(),
  //           item: entry.item,
  //           qty: Math.abs(Number(entry.qty)),
  //           fromWarehouse: null,
  //           toWarehouse: null,
  //           user: entry.user,
  //         });
  //       }

  //       const transfer = transferMap.get(entry.refId);
  //       if (entry.direction === "OUT") {
  //         transfer.fromWarehouse = entry.warehouse;
  //       } else {
  //         transfer.toWarehouse = entry.warehouse;
  //       }
  //     });

  //     // Filter complete transfers and apply pagination
  //     const completeTransfers = Array.from(transferMap.values())
  //       .filter((t) => t.fromWarehouse && t.toWarehouse)
  //       .sort(
  //         (a, b) =>
  //           new Date(b.transferDate).getTime() -
  //           new Date(a.transferDate).getTime()
  //       );

  //     const total = completeTransfers.length;
  //     const paginatedTransfers = completeTransfers.slice(
  //       skip,
  //       skip + Number(limit)
  //     );

  //     res.json({
  //       transfers: paginatedTransfers,
  //       pagination: {
  //         page: Number(page),
  //         limit: Number(limit),
  //         total,
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Get inventory transfers error:", error);
  //     res.status(500).json({ error: "Failed to fetch inventory transfers" });
  //   }
  // }

  // async printInventoryTransfer(req: AuthRequest, res: Response) {
  //   try {
  //     const { id } = req.params; // refId of the transfer

  //     // Fetch all ledger entries for this transfer
  //     const entries = await prisma.inventoryLedger.findMany({
  //       where: {
  //         refId: id,
  //         refType: "TRANSFER",
  //       },
  //       include: {
  //         item: {
  //           select: { sku: true, name: true, uom: true },
  //         },
  //         warehouse: {
  //           select: { code: true, name: true },
  //         },
  //         user: {
  //           select: { name: true },
  //         },
  //       },
  //       orderBy: { postedAt: "asc" },
  //     });

  //     if (!entries || entries.length === 0) {
  //       return res.status(404).json({ error: "Transfer not found" });
  //     }

  //     // Separate into OUT and IN
  //     const outEntry = entries.find((e) => e.direction === "OUT");
  //     const inEntry = entries.find((e) => e.direction === "IN");

  //     if (!outEntry || !inEntry) {
  //       return res.status(400).json({ error: "Transfer record is incomplete" });
  //     }

  //     const transfer = {
  //       id,
  //       transferDate: outEntry.postedAt.toISOString(),
  //       item: outEntry.item,
  //       qty: Math.abs(Number(outEntry.qty)),
  //       fromWarehouse: outEntry.warehouse,
  //       toWarehouse: inEntry.warehouse,
  //       user: outEntry.user,
  //     };

  //     // Format the print data
  //     res.json({
  //       transfer,
  //       printData: {
  //         title: "INVENTORY TRANSFER NOTE",
  //         documentNo: id,
  //         date: transfer.transferDate,
  //         item: transfer.item,
  //         quantity: transfer.qty,
  //         fromWarehouse: transfer.fromWarehouse,
  //         toWarehouse: transfer.toWarehouse,
  //         postedBy: transfer.user,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Print inventory transfer error:", error);
  //     res
  //       .status(500)
  //       .json({ error: "Failed to generate inventory transfer print" });
  //   }
  // }

  async getItemStock(req: AuthRequest, res: Response) {
    try {
      const { itemId, warehouseId } = req.params;

      const lastEntry = await prisma.inventoryLedger.findFirst({
        where: { itemId, warehouseId },
        orderBy: { postedAt: "desc" },
      });

      const stock = {
        qty: lastEntry?.runningQty ? Number(lastEntry.runningQty) : 0,
        value: lastEntry?.runningValue ? Number(lastEntry.runningValue) : 0,
        avgCost: lastEntry?.runningAvgCost
          ? Number(lastEntry.runningAvgCost)
          : 0,
      };

      res.json(stock);
    } catch (error) {
      console.error("Get item stock error:", error);
      res.status(500).json({ error: "Failed to fetch item stock" });
    }
  }

  async getItems(req: AuthRequest, res: Response) {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);
      const rawType = req.query.type;
      const search = req.query.search ? String(req.query.search) : undefined;
      const includeStock = String(req.query.includeStock ?? "false");
      const skip = (page - 1) * limit;
      const noZeroItem = String(req.query.noZeroItem ?? "false");

      const where: Prisma.ItemWhereInput = {};
      const typeFilter =
        typeof rawType === "string" && rawType.length
          ? (rawType as ItemType)
          : undefined;
      if (typeFilter) where.type = typeFilter;

      // Warehouse filter logic
      let warehouseFilter: string | null = null;
      if (
        !req.user!.roles.includes("Senior Accountant") &&
        !req.user!.roles.includes("General Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });
        warehouseFilter = user?.warehouseId ?? null;
      } else if (req.query.warehouseId) {
        warehouseFilter = String(req.query.warehouseId);
      }

      let items: any[] = [];
      let total = 0;

      if (search) {
        const enumParam = typeFilter;

        const query = Prisma.sql`
        SELECT i.*
        FROM "items" i
        WHERE 1=1
        ${
          enumParam
            ? Prisma.sql`AND i."type" = ${enumParam}::"ItemType"`
            : Prisma.empty
        }
        AND (
          i."sku" ILIKE ${"%" + search + "%"} COLLATE "C"
          OR i."name" ILIKE ${"%" + search + "%"} COLLATE "C"
        )
        ORDER BY i."createdAt" DESC
        LIMIT ${limit} OFFSET ${skip};
      `;

        const countQuery = Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "items" i
        WHERE 1=1
        ${
          enumParam
            ? Prisma.sql`AND i."type" = ${enumParam}::"ItemType"`
            : Prisma.empty
        }
        AND (
          i."sku" ILIKE ${"%" + search + "%"} COLLATE "C"
          OR i."name" ILIKE ${"%" + search + "%"} COLLATE "C"
        );
      `;

        items = await prisma.$queryRaw<any[]>(query);
        const countResult =
          await prisma.$queryRaw<{ count: number }[]>(countQuery);
        total = countResult[0]?.count ?? 0;

        // Fetch price lists separately (since raw SQL doesn’t include relations)
        const itemIds = items.map((i) => i.id);
        const priceLists = await prisma.itemPriceList.findMany({
          where: { itemId: { in: itemIds } },
          select: {
            id: true,
            itemId: true,
            customerGroup: true,
            price: true,
          },
        });

        // Merge priceList info into each item
        items = items.map((item) => ({
          ...item,
          priceList: priceLists.filter((pl) => pl.itemId === item.id),
        }));
      } else {
        // Prisma query with relation
        [items, total] = await Promise.all([
          prisma.item.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
              priceList: {
                // This pulls all prices for the item
                select: {
                  id: true,
                  customerGroup: true,
                  price: true,
                },
              },
            },
          }),
          prisma.item.count({ where }),
        ]);
      }

      // if (includeStock === "true" || noZeroItem === "true") {
      //   items = await Promise.all(
      //     items.map(async (item) => {
      //       let stockQty = 0;

      //       if (warehouseFilter) {
      //         const latestEntry = await prisma.inventoryLedger.findFirst({
      //           where: { itemId: item.id, warehouseId: warehouseFilter },
      //           orderBy: { postedAt: "desc" },
      //         });
      //         stockQty = Number(latestEntry?.runningQty ?? 0);
      //       } else {
      //         const warehouses = await prisma.warehouse.findMany({
      //           select: { id: true },
      //         });
      //         const balances = await Promise.all(
      //           warehouses.map(async (wh) => {
      //             const latestEntry = await prisma.inventoryLedger.findFirst({
      //               where: { itemId: item.id, warehouseId: wh.id },
      //               orderBy: { postedAt: "desc" },
      //             });
      //             return Number(latestEntry?.runningQty ?? 0);
      //           }),
      //         );
      //         stockQty = balances.reduce((sum, qty) => sum + qty, 0);
      //       }

      //       return { ...item, stockQty };
      //     }),
      //   );
      // }
      if (includeStock === "true" || noZeroItem === "true") {
        items = await Promise.all(
          items.map(async (item) => {
            let stockQty = 0;

            if (warehouseFilter) {
              const latestEntry = await prisma.inventoryLedger.findFirst({
                where: { itemId: item.id, warehouseId: warehouseFilter },
                orderBy: { postedAt: "desc" },
              });
              stockQty = Number(latestEntry?.runningQty ?? 0);
            } else {
              const warehouses = await prisma.warehouse.findMany({
                select: { id: true },
              });

              const balances = await Promise.all(
                warehouses.map(async (wh) => {
                  const latestEntry = await prisma.inventoryLedger.findFirst({
                    where: { itemId: item.id, warehouseId: wh.id },
                    orderBy: { postedAt: "desc" },
                  });
                  return Number(latestEntry?.runningQty ?? 0);
                }),
              );

              stockQty = balances.reduce((sum, qty) => sum + qty, 0);
            }

            return { ...item, stockQty };
          }),
        );

        // APPLY FILTER
        if (noZeroItem === "true") {
          items = items.filter((item) => Number(item.stockQty) > 0);
          total = items.length;
        }
      }

      res.json({
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get items error:", error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  }

  async getItemById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      let warehouseFilter: string | null = null;

      if (
        !req.user!.roles.includes("Senior Accountant") &&
        !req.user!.roles.includes("General Manager")
      ) {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { warehouseId: true },
        });

        warehouseFilter = user?.warehouseId ?? null;
      } else if (req.query.warehouseId) {
        warehouseFilter = String(req.query.warehouseId);
      }

      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          priceList: {
            select: {
              id: true,
              customerGroup: true,
              price: true,
            },
          },
        },
      });

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const stockResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(sub."runningQty"), 0) as "stockQty"
      FROM (
        SELECT DISTINCT ON ("warehouseId")
          "warehouseId",
          "runningQty"
        FROM "inventory_ledger"
        WHERE "itemId" = ${item.id}
        ${warehouseFilter ? Prisma.sql`AND "warehouseId" = ${warehouseFilter}` : Prisma.empty}
        ORDER BY "warehouseId", "postedAt" DESC
      ) sub;
    `;

      const stockQty = Number((stockResult as any)[0]?.stockQty ?? 0);

      res.json({
        ...item,
        stockQty,
      });
    } catch (error) {
      console.error("Get item error:", error);
      res.status(500).json({ error: "Failed to fetch item" });
    }
  }

  // async getItemById(req: AuthRequest, res: Response) {
  //   try {
  //     const { id } = req.params;

  //     // Warehouse filter logic (same as getItems)
  //     let warehouseFilter: string | null = null;

  //     if (
  //       !req.user!.roles.includes("Senior Accountant") &&
  //       !req.user!.roles.includes("General Manager")
  //     ) {
  //       const user = await prisma.user.findUnique({
  //         where: { id: req.user!.id },
  //         select: { warehouseId: true },
  //       });

  //       warehouseFilter = user?.warehouseId ?? null;
  //     } else if (req.query.warehouseId) {
  //       warehouseFilter = String(req.query.warehouseId);
  //     }

  //     const item = await prisma.item.findUnique({
  //       where: { id },
  //       include: {
  //         priceList: {
  //           select: {
  //             id: true,
  //             customerGroup: true,
  //             price: true,
  //           },
  //         },
  //       },
  //     });

  //     if (!item) {
  //       return res.status(404).json({ error: "Item not found" });
  //     }

  //     /* =========================
  //      STOCK CALCULATION
  //   ========================== */

  //     let stockQty = 0;

  //     if (warehouseFilter) {
  //       const latestEntry = await prisma.inventoryLedger.findFirst({
  //         where: { itemId: item.id, warehouseId: warehouseFilter },
  //         orderBy: { postedAt: "desc" },
  //       });

  //       stockQty = Number(latestEntry?.runningQty ?? 0);
  //     } else {
  //       const warehouses = await prisma.warehouse.findMany({
  //         select: { id: true },
  //       });

  //       const balances = await Promise.all(
  //         warehouses.map(async (wh) => {
  //           const latestEntry = await prisma.inventoryLedger.findFirst({
  //             where: { itemId: item.id, warehouseId: wh.id },
  //             orderBy: { postedAt: "desc" },
  //           });

  //           return Number(latestEntry?.runningQty ?? 0);
  //         }),
  //       );

  //       stockQty = balances.reduce((sum, qty) => sum + qty, 0);
  //     }

  //     res.json({
  //       ...item,
  //       stockQty,
  //     });
  //   } catch (error) {
  //     console.error("Get item error:", error);
  //     res.status(500).json({ error: "Failed to fetch item" });
  //   }
  // }
}
