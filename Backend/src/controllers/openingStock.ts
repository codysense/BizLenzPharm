import { Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

import { AuthRequest } from "../middleware/auth";

import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";

import { createOpeningStockSchema } from "../types/openingStock";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();

export class OpeningStockController {
  async createOpeningStock(req: AuthRequest, res: Response) {
    try {
      const validatedData = createOpeningStockSchema.parse(req.body);

      const lastOpeningStock = await prisma.openingStock.findFirst({
        orderBy: {
          createdAt: "desc",
        },
      });

      let nextNumber = 1;

      if (lastOpeningStock) {
        const match = lastOpeningStock.referenceNo.match(/\d+$/);

        if (match) {
          nextNumber = parseInt(match[0], 10) + 1;
        }
      }

      const referenceNo = `OS${String(nextNumber).padStart(6, "0")}`;

      const totalQty = validatedData.openingLines.reduce(
        (sum, line) => sum + line.qty,
        0,
      );

      const totalValue = validatedData.openingLines.reduce(
        (sum, line) => sum + line.qty * line.unitCost,
        0,
      );

      const openingStock = await prisma.$transaction(
        async (tx) => {
          const opening = await tx.openingStock.create({
            data: {
              referenceNo,
              warehouseId: validatedData.warehouseId,
              openingDate: new Date(validatedData.openingDate),
              remarks: validatedData.remarks,
              totalQty,
              totalValue,
              createdById: req.user!.id,
            },
          });

          await tx.openingStockLine.createMany({
            data: validatedData.openingLines.map((line) => ({
              openingStockId: opening.id,
              itemId: line.itemId,
              qty: Number(line.qty),
              unitCost: Number(line.unitCost),
              lineTotal: Number(line.qty) * Number(line.unitCost),
            })),
          });

          for (const line of validatedData.openingLines) {
            await costingService.receiveInventory(
              tx,
              line.itemId,
              validatedData.warehouseId,
              line.qty,
              line.unitCost,
              "OPENING_STOCK",
              opening.id,
              req.user!.id,
            );
          }

          await glService.postJournal(
            tx,
            [
              {
                accountCode: "1350",
                debit: totalValue,
                credit: 0,
                refType: "OPENING_STOCK",
                refId: opening.id,
              },
              {
                accountCode: "3000",
                debit: 0,
                credit: totalValue,
                refType: "OPENING_STOCK",
                refId: opening.id,
              },
            ],
            `Opening Stock (${referenceNo})`,
            req.user!.id,
            new Date(validatedData.openingDate),
          );

          return opening;
        },
        {
          maxWait: 5000,
          timeout: 20000,
        },
      );

      res.status(201).json(openingStock);
    } catch (error: any) {
      console.error("Create Opening Stock Error:", error);

      res.status(400).json({
        error: error?.message ?? "Failed to create opening stock",
      });
    }
  }

  async getOpeningStocks(req: AuthRequest, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const search = req.query.search?.toString() ?? "";
      const warehouseId = req.query.warehouseId?.toString();

      const where: Prisma.OpeningStockWhereInput = {
        AND: [
          search
            ? {
                referenceNo: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {},
          warehouseId
            ? {
                warehouseId,
              }
            : {},
        ],
      };

      const [rows, total] = await prisma.$transaction([
        prisma.openingStock.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            openingDate: "desc",
          },
          include: {
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            openingLines: {
              select: {
                id: true,
                item: true,
                qty: true,
                unitCost: true,
              },
            },
          },
        }),

        prisma.openingStock.count({
          where,
        }),
      ]);

      res.json({
        data: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error("Get Opening Stocks Error:", error);

      res.status(500).json({
        error: "Failed to retrieve opening stocks",
      });
    }
  }

  async getOpeningStock(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const openingStock = await prisma.openingStock.findUnique({
        where: {
          id,
        },
        include: {
          warehouse: true,

          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },

          openingLines: {
            include: {
              item: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  uom: true,
                },
              },
            },
            orderBy: {
              item: {
                name: "asc",
              },
            },
          },
        },
      });

      if (!openingStock) {
        return res.status(404).json({
          error: "Opening Stock not found",
        });
      }

      res.json(openingStock);
    } catch (error: any) {
      console.error("Get Opening Stock Error:", error);

      res.status(500).json({
        error: "Failed to retrieve opening stock",
      });
    }
  }
}
