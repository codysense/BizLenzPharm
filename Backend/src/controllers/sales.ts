import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  createCustomerSchema,
  createSaleSchema,
  deliverSaleSchema,
  createSalesReturnSchema,
  confirmSalesReturnSchema,
} from "../types/sales";
import { AuthRequest } from "../middleware/auth";
import { CostingService } from "../services/costing";
import { GeneralLedgerService } from "../services/gl";
import { z } from "zod";

const prisma = new PrismaClient();
const costingService = new CostingService();
const glService = new GeneralLedgerService();
const createCustomerGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
});

async function getReturnableQuantities(saleId: string) {
  const saleLines = await prisma.saleLine.findMany({
    where: { saleId },
    include: { item: true },
  });

  const returned = await prisma.salesReturnLine.groupBy({
    by: ["saleLineId"],
    where: {
      salesReturn: { saleId, status: "CONFIRMED" },
    },
    _sum: { qty: true },
  });

  const returnedMap = new Map(
    returned.map((r) => [r.saleLineId, Number(r._sum.qty || 0)]),
  );

  return saleLines.map((line) => ({
    saleLineId: line.id,
    itemId: line.itemId,
    item: line.item,
    originalQty: Number(line.qty),
    unitPrice: Number(line.unitPrice),
    alreadyReturned: returnedMap.get(line.id) || 0,
    returnable: Number(line.qty) - (returnedMap.get(line.id) || 0),
  }));
}

async function getSaleIssueUnitCost(
  tx: Prisma.TransactionClient,
  saleId: string,
  itemId: string,
) {
  const issued = await tx.inventoryLedger.groupBy({
    by: ["itemId"],
    where: {
      refType: "SALE",
      refId: saleId,
      itemId,
      direction: "OUT",
    },
    _sum: { qty: true, value: true },
  });

  if (!issued.length || !issued[0]._sum.qty) {
    throw new Error(
      `No inventory issue found for item ${itemId} on sale ${saleId}`,
    );
  }

  const totalQty = Number(issued[0]._sum.qty);
  const totalValue = Number(issued[0]._sum.value);

  return Math.abs(totalValue) / totalQty;
}

export class SalesController {
  async getSales(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status, customerId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            customer: {
              select: { code: true, name: true },
            },
            preparer: {
              select: { name: true },
            },
            saleLines: {
              include: {
                item: {
                  select: { sku: true, name: true, uom: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.sale.count({ where }),
      ]);

      // Add outstanding balances to customers
      const salesWithBalances = await Promise.all(
        sales.map(async (sale) => {
          const balanceResult = (await prisma.$queryRaw`
            SELECT COALESCE(
              (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = ${sale.customerId} AND s.status IN ('INVOICED', 'PAID')) -
              (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = ${sale.customerId}), 
              0
            ) as balance
          `) as any[];

          return {
            ...sale,
            customer: {
              ...sale.customer,
              outstandingBalance: Number(balanceResult[0]?.balance || 0),
            },
          };
        }),
      );

      res.json({
        sales: salesWithBalances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get sales error:", error);
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  }

  async createSale(req: AuthRequest, res: Response) {
    try {
      const validatedData = createSaleSchema.parse(req.body);
      // console.log("Creating sale with data:", validatedData);

      const sale = await prisma.$transaction(
        async (tx) => {
          // Generate order number

          const lastSale = await prisma.sale.findFirst({
            orderBy: { createdAt: "desc" },
          });

          let nextNumber = 1;
          if (lastSale) {
            // Extract the numeric part of the orderNo
            const lastNumber = parseInt(
              lastSale.orderNo.replace(/^SO/, ""),
              10,
            );
            nextNumber = lastNumber + 1;
          }

          const orderNo = `SO${String(nextNumber).padStart(6, "0")}`;

          // Calculate total amount
          const totalAmount = validatedData.saleLines.reduce((sum, line) => {
            return sum + line.qty * line.unitPrice;
          }, 0);

          // Create sale
          const newSale = await tx.sale.create({
            data: {
              orderNo,
              customerId: validatedData.customerId,
              orderDate: new Date(validatedData.orderDate),
              totalAmount,
              notes: validatedData.notes,
              status: "CONFIRMED",
              preparedBy: req.user!.id,
            },
          });

          // Create sale lines
          for (const line of validatedData.saleLines) {
            await tx.saleLine.create({
              data: {
                saleId: newSale.id,
                itemId: line.itemId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                lineTotal: line.qty * line.unitPrice,
              },
            });
          }

          return newSale;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.status(201).json(sale);
    } catch (error) {
      console.error("Create sale error:", error);
      res.status(400).json({ error: "Failed to create sale" });
    }
  }

  async deliverSale(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = deliverSaleSchema.parse(req.body);
      //  console.log("Delivering sale with data:", id, validatedData);

      await prisma.$transaction(
        async (tx) => {
          // Update sale status
          await tx.sale.update({
            where: { id },
            data: {
              status: "DELIVERED",
              deliveredBy: req.user!.id,
              deliveredAt: new Date(),
            },
          });

          // Post to general ledger
          const sale = await tx.sale.findUnique({
            where: { id },
            include: { saleLines: { include: { item: true } } },
          });

          if (sale) {
            const totalCogs = await calculateCogs(
              sale.saleLines,
              validatedData.deliveryLines,
            );

            //console.log("Total COGS:", totalCogs);

            const itemType = await getItemTypeById(sale.saleLines[0].itemId);
            await glService.postJournal(
              tx,
              [
                {
                  accountCode: "1200",
                  debit: Number(sale.totalAmount),
                  credit: 0,
                  refType: "SALE",
                  refId: id,
                },
                {
                  accountCode: "4000",
                  debit: 0,
                  credit: Number(sale.totalAmount),
                  refType: "SALE",
                  refId: id,
                },
                {
                  accountCode: "5000",
                  debit: totalCogs,
                  credit: 0,
                  refType: "SALE",
                  refId: id,
                },
                {
                  accountCode: itemType === "FINISHED_GOODS" ? "1350" : "1300",
                  debit: 0,
                  credit: totalCogs,
                  refType: "SALE",
                  refId: id,
                },
              ],
              `Sale delivery: ${sale.orderNo}`,
              req.user!.id,
            );
          }

          // Process each delivery line
          for (const deliveryLine of validatedData.deliveryLines) {
            const saleLine = await tx.saleLine.findUnique({
              where: { id: deliveryLine.saleLineId },
              include: { item: true },
            });

            if (!saleLine) {
              throw new Error(`Sale line ${deliveryLine.saleLineId} not found`);
            }

            // Issue inventory using costing service
            await costingService.issueInventory(
              tx,
              saleLine.itemId,
              deliveryLine.warehouseId,
              deliveryLine.qtyDelivered,
              "SALE",
              id,
              req.user!.id,
            );
          }
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.json({ message: "Sale delivered successfully" });
    } catch (error) {
      console.error("Deliver sale error:", error);
      res.status(400).json({ error: "Failed to deliver sale" });
    }
  }

  async invoiceSale(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.sale.update({
        where: { id },
        data: {
          status: "INVOICED",
          invoicedBy: req.user!.id,
          invoicedAt: new Date(),
        },
      });

      res.json({ message: "Sale invoiced successfully" });
    } catch (error) {
      console.error("Invoice sale error:", error);
      res.status(400).json({ error: "Failed to invoice sale" });
    }
  }

  async getReturnableLines(req: AuthRequest, res: Response) {
    try {
      const { saleId } = req.params;

      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      if (!["DELIVERED", "INVOICED", "PAID"].includes(sale.status)) {
        return res.status(400).json({
          error: "Only delivered, invoiced or paid sales can be returned",
        });
      }

      const lines = await getReturnableQuantities(saleId);
      res.json({ sale, lines });
    } catch (error) {
      console.error("Get returnable lines error:", error);
      res.status(500).json({ error: "Failed to fetch returnable lines" });
    }
  }

  async createSalesReturn(req: AuthRequest, res: Response) {
    try {
      const validatedData = createSalesReturnSchema.parse(req.body);

      const salesReturn = await prisma.$transaction(
        async (tx) => {
          const sale = await tx.sale.findUnique({
            where: { id: validatedData.saleId },
          });
          if (!sale) throw new Error("Sale not found");

          const returnable = await getReturnableQuantities(
            validatedData.saleId,
          );
          const returnableMap = new Map(
            returnable.map((r) => [r.saleLineId, r]),
          );

          let subtotal = 0;
          const lineData: {
            saleLineId: string;
            itemId: string;
            qty: number;
            unitPrice: number;
            lineTotal: number;
          }[] = [];

          for (const line of validatedData.returnLines) {
            const info = returnableMap.get(line.saleLineId);
            if (!info) {
              throw new Error(
                `Sale line ${line.saleLineId} not found on this sale`,
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
              saleLineId: line.saleLineId,
              itemId: line.itemId,
              qty: line.qty,
              unitPrice: info.unitPrice,
              lineTotal,
            });
          }

          const lastReturn = await tx.salesReturn.findFirst({
            orderBy: { createdAt: "desc" },
          });
          let nextNumber = 1;
          if (lastReturn) {
            nextNumber =
              parseInt(lastReturn.returnNo.replace(/^SR/, ""), 10) + 1;
          }
          const returnNo = `SR${String(nextNumber).padStart(6, "0")}`;

          const newReturn = await tx.salesReturn.create({
            data: {
              returnNo,
              saleId: sale.id,
              customerId: sale.customerId,
              reason: validatedData.reason,
              subtotal,
              tax: 0,
              totalAmount: subtotal,
              status: "DRAFT",
              preparedBy: req.user!.id,
            },
          });

          for (const line of lineData) {
            await tx.salesReturnLine.create({
              data: { salesReturnId: newReturn.id, ...line, unitCost: 0 },
            });
          }

          return newReturn;
        },
        { maxWait: 5000, timeout: 20000 },
      );

      res.status(201).json(salesReturn);
    } catch (error: any) {
      console.error("Create sales return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to create sales return" });
    }
  }

  async confirmSalesReturn(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = confirmSalesReturnSchema.parse(req.body);

      await prisma.$transaction(
        async (tx) => {
          const salesReturn = await tx.salesReturn.findUnique({
            where: { id },
            include: {
              salesReturnLines: { include: { item: true } },
              sale: { include: { saleLines: true } },
            },
          });

          if (!salesReturn) throw new Error("Sales return not found");
          if (salesReturn.status !== "DRAFT") {
            throw new Error(
              `Sales return ${salesReturn.returnNo} is not in DRAFT status`,
            );
          }

          const returnable = await getReturnableQuantities(salesReturn.saleId);
          const returnableMap = new Map(
            returnable.map((r) => [r.saleLineId, r]),
          );

          let totalCostReversal = 0;

          for (const line of salesReturn.salesReturnLines) {
            const info = returnableMap.get(line.saleLineId);
            if (!info || Number(line.qty) > info.returnable) {
              throw new Error(
                `Return quantity for ${line.item.name} exceeds what remains returnable`,
              );
            }

            const unitCost = await getSaleIssueUnitCost(
              tx,
              salesReturn.saleId,
              line.itemId,
            );

            await costingService.receiveInventory(
              tx,
              line.itemId,
              validatedData.warehouseId,
              Number(line.qty),
              unitCost,
              "SALES_RETURN",
              salesReturn.id,
              req.user!.id,
            );

            const lineCost = unitCost * Number(line.qty);
            totalCostReversal += lineCost;

            await tx.salesReturnLine.update({
              where: { id: line.id },
              data: { unitCost },
            });
          }

          const itemType = await getItemTypeById(
            salesReturn.salesReturnLines[0].itemId,
          );

          await glService.postJournal(
            tx,
            [
              {
                accountCode: "4900",
                debit: Number(salesReturn.totalAmount),
                credit: 0,
                refType: "SALES_RETURN",
                refId: id,
              },
              {
                accountCode: "1200",
                debit: 0,
                credit: Number(salesReturn.totalAmount),
                refType: "SALES_RETURN",
                refId: id,
              },
              {
                accountCode: itemType === "FINISHED_GOODS" ? "1350" : "1300",
                debit: totalCostReversal,
                credit: 0,
                refType: "SALES_RETURN",
                refId: id,
              },
              {
                accountCode: "5000",
                debit: 0,
                credit: totalCostReversal,
                refType: "SALES_RETURN",
                refId: id,
              },
            ],
            `Sales return: ${salesReturn.returnNo} (${salesReturn.sale.orderNo})`,
            req.user!.id,
          );

          await tx.salesReturn.update({
            where: { id },
            data: {
              status: "CONFIRMED",
              settlementMethod: validatedData.settlementMethod,
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
                    accountCode: "1200",
                    debit: Number(salesReturn.totalAmount),
                    credit: 0,
                    refType: "SALES_RETURN_REFUND",
                    refId: id,
                  },
                  {
                    accountCode: glAccount.code,
                    debit: 0,
                    credit: Number(salesReturn.totalAmount),
                    refType: "SALES_RETURN_REFUND",
                    refId: id,
                  },
                ],
                `Cash refund for return ${salesReturn.returnNo}`,
                req.user!.id,
              );

              await tx.cashAccount.update({
                where: { id: cashAccount.id },
                data: {
                  balance: {
                    decrement: salesReturn.totalAmount,
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

      res.json({ message: "Sales return confirmed successfully" });
    } catch (error: any) {
      console.error("Confirm sales return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to confirm sales return" });
    }
  }

  async getSalesReturns(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status, customerId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (customerId) where.customerId = customerId;

      const [returns, total] = await Promise.all([
        prisma.salesReturn.findMany({
          where,
          skip,
          take: Number(limit),
          include: {
            customer: { select: { code: true, name: true } },
            sale: { select: { orderNo: true } },
            preparer: { select: { name: true } },
            salesReturnLines: {
              include: { item: { select: { sku: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salesReturn.count({ where }),
      ]);

      res.json({
        salesReturns: returns,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get sales returns error:", error);
      res.status(500).json({ error: "Failed to fetch sales returns" });
    }
  }

  async cancelSalesReturn(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.salesReturn.updateMany({
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
      res.json({ message: "Sales return cancelled successfully" });
    } catch (error: any) {
      console.error("Cancel sales return error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to cancel sales return" });
    }
  }

  async getCustomers(req: AuthRequest, res: Response) {
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

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: "desc" },
          include: {
            customerGroup: true,
          },
        }),
        prisma.customer.count({ where }),
      ]);

      // Calculate outstanding balances for each customer
      const customersWithBalances = await Promise.all(
        customers.map(async (customer) => {
          const balanceResult = (await prisma.$queryRaw`
            SELECT COALESCE(
              (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = ${customer.id} AND s.status IN ('INVOICED', 'PAID')) -
              (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = ${customer.id}), 
              0
            ) as balance
          `) as any[];

          return {
            ...customer,
            outstandingBalance: Number(balanceResult[0]?.balance || 0),
          };
        }),
      );

      res.json({
        customers: customersWithBalances,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  }

  async getCustomerById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          customerGroup: true,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const balanceResult = (await prisma.$queryRaw`
      SELECT COALESCE(
        (SELECT SUM(s."totalAmount") FROM sales s WHERE s."customerId" = ${customer.id} AND s.status IN ('INVOICED', 'PAID')) -
        (SELECT SUM(sr."amountReceived") FROM sales_receipts sr WHERE sr."customerId" = ${customer.id}),
        0
      ) as balance
    `) as any[];

      const customerWithBalance = {
        ...customer,
        outstandingBalance: Number(balanceResult[0]?.balance || 0),
      };

      res.json(customerWithBalance);
    } catch (error) {
      console.error("Get customer by id error:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  }

  async createCustomerGroup(req: Request, res: Response) {
    try {
      const data = createCustomerGroupSchema.parse(req.body);
      const group = await prisma.customerGroup.create({
        data: { ...data },
      });
      res.status(201).json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(400).json({ error: "Failed to create group" });
    }
  }

  async updateCustomerGroup(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log("Updating group with ID:", id);
      const data = createCustomerGroupSchema.partial().parse(req.body);
      const group = await prisma.customerGroup.update({
        where: { id },
        data,
      });
      res.json(group);
    } catch (error) {
      console.error("Update group error:", error);
      res.status(400).json({ error: "Failed to update group" });
    }
  }

  async getCustomerGroups(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";

      let where: Prisma.CustomerGroupWhereInput = {};

      if (search) {
        where = {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        };
      }

      const [groups, total] = await Promise.all([
        prisma.customerGroup.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { customers: true } },
          },
        }),
        prisma.customerGroup.count({ where }),
      ]);

      const groupsWithCount = groups.map((group) => ({
        ...group,
        customerCount: group._count.customers,
      }));

      // const where = search
      //   ? { name: { contains: search, mode: 'insensitive' } }
      //   : {};

      // const [groups, total] = await Promise.all([
      //   prisma.customerGroup.findMany({
      //     where,
      //     skip: (page - 1) * limit,
      //     take: limit,
      //     orderBy: { createdAt: 'desc' },
      //     include: {
      //       _count: {
      //         select: { customers: true },
      //       },
      //     },
      //   }),
      //   prisma.customerGroup.count({ where }),
      // ]);

      // const groupsWithCount = groups.map((group) => ({
      //   ...group,
      //   customerCount: group._count.customers,
      // }));

      res.json({
        groups: groupsWithCount,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get customer groups error:", error);
      res.status(500).json({ error: "Failed to load customer groups" });
    }
  }

  // async createCustomer(req: AuthRequest, res: Response) {
  //   try {

  //     const validatedData = createCustomerSchema.parse(req.body);

  //               const customer = await prisma.customer.upsert({
  //                 where: { code: validatedData.code },
  //                 update: { ...validatedData },
  //                 create: { ...validatedData },
  //               });
  //     // const customer = await prisma.customer.create({
  //     //   data: req.body
  //     // });

  //     res.status(201).json(customer);
  //   } catch (error) {
  //     console.error('Create customer error:', error);
  //     res.status(400).json({ error: 'Failed to create customer' });
  //   }
  // }

  async createCustomer(req: AuthRequest, res: Response) {
    try {
      const validatedData = createCustomerSchema.parse(req.body);
      const { customerGroupId, mode, ...rest } = validatedData;

      // console.log("Creating/updating customer with data:", validatedData);

      const existingCustomer = await prisma.customer.findUnique({
        where: { code: validatedData.code },
      });

      //  CREATE MODE
      if (mode === "create") {
        if (existingCustomer) {
          return res.status(400).json({
            error: "Customer with this code already exists",
          });
        }

        const customer = await prisma.customer.create({
          data: {
            ...rest,
            ...(customerGroupId && {
              customerGroup: { connect: { id: customerGroupId } },
            }),
          },
          include: { customerGroup: true },
        });

        return res.status(201).json(customer);
      }

      //  UPDATE MODE
      if (mode === "update") {
        if (!existingCustomer) {
          return res.status(404).json({
            error: "Customer not found for update",
          });
        }

        const customer = await prisma.customer.update({
          where: { code: validatedData.code },
          data: {
            ...rest,
            ...(customerGroupId
              ? { customerGroup: { connect: { id: customerGroupId } } }
              : { customerGroup: { disconnect: true } }),
          },
          include: { customerGroup: true },
        });

        return res.json(customer);
      }

      return res.status(400).json({ error: "Invalid operation mode" });
    } catch (error) {
      console.error("Create/Update customer error:", error);
      res.status(400).json({ error: "Failed to process customer" });
    }
  }

  async updateSale(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { customerId, orderDate, notes, saleLines } = req.body;

      // Check if sale can be edited
      const existingSale = await prisma.sale.findUnique({
        where: { id },
        select: { status: true },
      });

      if (
        !existingSale ||
        !["DRAFT", "CONFIRMED"].includes(existingSale.status)
      ) {
        return res
          .status(400)
          .json({ error: "Cannot edit sale in current status" });
      }

      const sale = await prisma.$transaction(
        async (tx) => {
          // Calculate new total
          const totalAmount = saleLines.reduce((sum: number, line: any) => {
            return sum + line.qty * line.unitPrice;
          }, 0);

          // Update sale
          const updatedSale = await tx.sale.update({
            where: { id },
            data: {
              customerId,
              orderDate: new Date(orderDate),
              totalAmount,
              notes,
            },
          });

          // Delete existing lines
          await tx.saleLine.deleteMany({
            where: { saleId: id },
          });

          // Create new lines
          for (const line of saleLines) {
            await tx.saleLine.create({
              data: {
                saleId: id,
                itemId: line.itemId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                lineTotal: line.qty * line.unitPrice,
              },
            });
          }

          return updatedSale;
        },
        {
          maxWait: 5000, // 5s wait for connection
          timeout: 20000, // 20s max runtime
        },
      );

      res.json(sale);
    } catch (error) {
      console.error("Update sale error:", error);
      res.status(400).json({ error: "Failed to update sale" });
    }
  }

  async deleteSale(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if sale can be deleted
      const sale = await prisma.sale.findUnique({
        where: { id },
        select: { status: true, orderNo: true },
      });

      if (!sale || !["DRAFT", "CONFIRMED"].includes(sale.status)) {
        return res
          .status(400)
          .json({ error: "Cannot delete sale in current status" });
      }

      await prisma.sale.delete({
        where: { id },
      });

      res.json({ message: "Sale deleted successfully" });
    } catch (error) {
      console.error("Delete sale error:", error);
      res.status(400).json({ error: "Failed to delete sale" });
    }
  }

  async printSaleInvoice(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          customer: true,
          saleLines: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      if (!["INVOICED", "PAID"].includes(sale.status)) {
        return res
          .status(400)
          .json({ error: "Sale must be invoiced to print" });
      }

      res.json({
        sale,
        printData: {
          title: "SALES INVOICE",
          documentNo: sale.orderNo,
          date: sale.orderDate,
          customer: sale.customer,
          lines: sale.saleLines,
          total: sale.totalAmount,
        },
      });
    } catch (error) {
      console.error("Print sale invoice error:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  }
}

// Helper function for COGS calculation
async function calculateCogs(
  saleLines: any[],
  deliveryLines: any[],
): Promise<number> {
  let totalCogs = 0;
  // console.log("Calculating COGS for delivery lines:", deliveryLines);
  // console.log("Against sale lines:", saleLines);

  for (const deliveryLine of deliveryLines) {
    const saleLine = saleLines.find((sl) => sl.id === deliveryLine.saleLineId);
    if (saleLine) {
      // Get current inventory value for COGS calculation
      const inventoryValue = await costingService.getInventoryValue(
        saleLine.itemId,
        deliveryLine.warehouseId,
      );
      // console.log("Inventory value for item", saleLine.itemId, ":", inventoryValue);
      totalCogs += deliveryLine.qtyDelivered * inventoryValue.avgCost;
    }
  }

  return totalCogs;
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
