import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { ReportsService } from "../services/reports";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const reportsService = new ReportsService();

function getDateRange(query: any): { startDate: Date; endDate: Date } {
  const now = new Date();
  const period = (query.period as string)?.toLowerCase();

  let startDate: Date;
  let endDate: Date = new Date();

  if (query.startDate && query.endDate) {
    startDate = new Date(query.startDate as string);
    endDate = new Date(query.endDate as string);
    return { startDate, endDate };
  }

  switch (period) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case "this_week": {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date();
      break;
    }
    case "this_year": {
      startDate = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0, 0));
      endDate = new Date();
      break;
    }
    case "this_month":
    default: {
      startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
      endDate = new Date();
      break;
    }
  }

  return { startDate, endDate };
}

export class DashboardController {
  async getExecutiveSummary(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = getDateRange(req.query);

      const [
        regularSales,
        posSales,
        salesReturns,
        posReturns,
        regularPurchases,
        purchaseReturns,
        receivables,
        payables,
        vendorPayments,
        operationalPayments,
        customerPayments,
        cashInflows,
        profitLoss,
      ] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            status: { in: ["INVOICED", "PAID"] },
            orderDate: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.posSale.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.salesReturn.aggregate({
          where: {
            status: "CONFIRMED",
            returnDate: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.posReturn.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.purchase.aggregate({
          where: {
            orderDate: { gte: startDate, lte: endDate },
            status: { in: ["ORDERED", "RECEIVED", "INVOICED", "PAID", "PARTIALLY_PAID"] },
          },
          _sum: { totalAmount: true },
        }),

        prisma.purchaseReturn.aggregate({
          where: {
            status: "CONFIRMED",
            returnDate: { gte: startDate, lte: endDate },
          },
          _sum: { totalAmount: true },
        }),

        prisma.sale.aggregate({
          where: {
            status: "INVOICED",
          },
          _sum: { totalAmount: true },
        }),

        prisma.purchase.aggregate({
          where: {
            status: {
              in: ["INVOICED", "PARTIALLY_PAID"],
            },
          },
          _sum: {
            balanceAmount: true,
          },
        }),

        prisma.vendorPayment.aggregate({
          where: {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),

        prisma.cashTransaction.aggregate({
          where: {
            transactionType: "PAYMENT",
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        prisma.customerPayment.aggregate({
          where: {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),

        prisma.cashTransaction.aggregate({
          where: {
            transactionType: "RECEIPT",
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        reportsService.getProfitAndLoss(startDate, endDate),
      ]);

      const grossSales =
        Number(regularSales._sum.totalAmount || 0) +
        Number(posSales._sum.totalAmount || 0);

      const totalReturns =
        Number(salesReturns._sum.totalAmount || 0) +
        Number(posReturns._sum.totalAmount || 0);

      const netRevenue = grossSales - totalReturns;

      const grossPurchases = Number(regularPurchases._sum.totalAmount || 0);
      const totalPurchaseReturns = Number(
        purchaseReturns._sum.totalAmount || 0,
      );
      const netPurchases = grossPurchases - totalPurchaseReturns;

      const expenses =
        Number(vendorPayments._sum.totalAmount || 0) +
        Number(operationalPayments._sum.amount || 0);

      const inflow =
        Number(cashInflows._sum.amount || 0) +
        Number(customerPayments._sum.totalAmount || 0);
      const outflow = Number(operationalPayments._sum.amount || 0);

      res.json({
        revenue: netRevenue,
        grossSales,
        totalReturns,
        netSales: netRevenue,
        grossPurchases,
        totalPurchaseReturns,
        netPurchases,
        receivables: Number(receivables._sum.totalAmount || 0),
        payables: Number(payables._sum.balanceAmount || 0),
        expenses: profitLoss.totalExpense,
        cashInflow: inflow,
        cashOutflow: expenses,
        netCashFlow: inflow - outflow,
        grossProfit: profitLoss.grossProfit,
        netProfit: profitLoss.netIncome,
        breakDownExpense: profitLoss.expenses,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch executive summary" });
    }
  }

  async getTopProducts(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = getDateRange(req.query);

      const topProducts = await prisma.$queryRaw`
          WITH regular_sales_agg AS (
            SELECT sl."itemId", SUM(sl.qty) as qty, SUM(sl."lineTotal") as revenue
            FROM sale_lines sl
            JOIN sales s ON s.id = sl."saleId"
            WHERE s.status IN ('INVOICED', 'PAID', 'DELIVERED')
              AND s."orderDate" >= ${startDate} AND s."orderDate" <= ${endDate}
            GROUP BY sl."itemId"
          ),
          pos_sales_agg AS (
            SELECT psl."itemId", SUM(psl.qty) as qty, SUM(psl."lineTotal") as revenue
            FROM pos_sale_lines psl
            JOIN pos_sales ps ON ps.id = psl."posSaleId"
            WHERE ps.status = 'COMPLETED'
              AND ps."createdAt" >= ${startDate} AND ps."createdAt" <= ${endDate}
            GROUP BY psl."itemId"
          ),
          sales_returns_agg AS (
            SELECT srl."itemId", SUM(srl.qty) as qty, SUM(srl."lineTotal") as revenue
            FROM sales_return_lines srl
            JOIN sales_returns sr ON sr.id = srl."salesReturnId"
            WHERE sr.status = 'CONFIRMED'
              AND sr."returnDate" >= ${startDate} AND sr."returnDate" <= ${endDate}
            GROUP BY srl."itemId"
          ),
          pos_returns_agg AS (
            SELECT prl."itemId", SUM(prl."qtyReturned") as qty, SUM(prl."lineTotal") as revenue
            FROM pos_return_lines prl
            JOIN pos_returns pr ON pr.id = prl."posReturnId"
            WHERE pr."createdAt" >= ${startDate} AND pr."createdAt" <= ${endDate}
            GROUP BY prl."itemId"
          )
          SELECT
            i.name AS itemname,
            GREATEST(0, COALESCE(rs.qty, 0) + COALESCE(ps.qty, 0) - COALESCE(sret.qty, 0) - COALESCE(pret.qty, 0)) AS qtysold,
            GREATEST(0, COALESCE(rs.revenue, 0) + COALESCE(ps.revenue, 0) - COALESCE(sret.revenue, 0) - COALESCE(pret.revenue, 0)) AS revenue
          FROM items i
          LEFT JOIN regular_sales_agg rs ON rs."itemId" = i.id
          LEFT JOIN pos_sales_agg ps ON ps."itemId" = i.id
          LEFT JOIN sales_returns_agg sret ON sret."itemId" = i.id
          LEFT JOIN pos_returns_agg pret ON pret."itemId" = i.id
          WHERE rs."itemId" IS NOT NULL OR ps."itemId" IS NOT NULL
          ORDER BY revenue DESC
          LIMIT 5;
        `;

      res.json(topProducts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch top products" });
    }
  }

  async getTopCustomers(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = getDateRange(req.query);
      const topCustomers = await prisma.$queryRaw`
  SELECT
    c.name AS "customerName",

    GREATEST(0,
      COALESCE(
        SUM(
          CASE
            WHEN s.status IN ('INVOICED', 'PAID')
            AND s."orderDate" >= ${startDate}
            AND s."orderDate" <= ${endDate}
            THEN s."totalAmount"
            ELSE 0
          END
        ),
        0
      )::numeric
      - COALESCE(
        (
          SELECT SUM(sr."totalAmount")
          FROM sales_returns sr
          WHERE sr."customerId" = c.id
            AND sr.status = 'CONFIRMED'
            AND sr."returnDate" >= ${startDate}
            AND sr."returnDate" <= ${endDate}
        ),
        0
      )::numeric
    ) AS "totalPurchased",

    COALESCE(
      SUM(
        CASE
          WHEN s.status = 'INVOICED'
          THEN s."totalAmount"
          ELSE 0
        END
      ),
      0
    )::numeric AS "outstandingBalance"

  FROM customers c
  LEFT JOIN sales s
    ON s."customerId" = c.id

  GROUP BY c.id, c.name
  ORDER BY "totalPurchased" DESC
  LIMIT 5
`;

      res.json(topCustomers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch top customers" });
    }
  }

  async getExpenseBreakdown(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = getDateRange(req.query);
      const breakdown = await prisma.$queryRaw`
  SELECT 
    category,
    SUM(amount) as amount
  FROM (
    
    -- Operational payments from cash transactions
    SELECT
      gla.name AS category,
      ctl."lineAmount" AS amount
    FROM cash_transaction_lines ctl
    JOIN chart_of_accounts gla 
      ON gla.id = ctl."glAccountId"
    JOIN cash_transactions ct 
      ON ct.id = ctl."cashTransactionId"
    WHERE 
      ct."transactionType" = 'PAYMENT'
      AND ct."transactionDate" >= ${startDate}
      AND ct."transactionDate" <= ${endDate}

    UNION ALL

    -- Vendor payments
    SELECT
      gla.name AS category,
      vpl."lineAmount" AS amount
    FROM vendor_payment_lines vpl
    JOIN chart_of_accounts gla 
      ON gla.id = vpl."glAccountId"
    JOIN vendor_payments vp 
      ON vp.id = vpl."vendorPaymentId"
    WHERE
      vp."paymentDate" >= ${startDate}
      AND vp."paymentDate" <= ${endDate}

  ) combined_expenses
  GROUP BY category
  ORDER BY amount DESC;
`;

      res.json(breakdown);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch expense breakdown" });
    }
  }

  async getAlerts(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      const lowStockItems = await prisma.$queryRaw`
  SELECT
    i.name AS "itemName",
    i.sku,
    w.name AS "warehouseName",
    latest."runningQty" AS quantity,
    i."minimumStockLevel"
  FROM (
    SELECT DISTINCT ON ("itemId", "warehouseId")
      "itemId",
      "warehouseId",
      "runningQty",
      "postedAt"
    FROM inventory_ledger
    ORDER BY "itemId", "warehouseId", "postedAt" DESC
  ) latest
  JOIN items i 
    ON i.id = latest."itemId"
  JOIN warehouses w 
    ON w.id = latest."warehouseId"
  WHERE 
    latest."runningQty" <= COALESCE(i."minimumStockLevel", 0)
    AND i."isActive" = true
  ORDER BY latest."runningQty" ASC
  limit 10;
`;
      const overdueReceivables = await prisma.$queryRaw`
        SELECT
          c.name AS customerName,
          c.code as customerCode,
          s."totalAmount" AS outstandingAmount,
          s."orderDate" as orderDate
        FROM sales s
        JOIN customers c ON c.id = s."customerId"
        WHERE s.status = 'INVOICED' AND s."orderDate" <= ${oneMonthAgo}
      Order By outstandingAmount desc
        limit 10 
      `;

      const pendingPurchases = await prisma.$queryRaw`
        SELECT  
          v.name AS vendorName,
          p."totalAmount" AS pendingAmount
        FROM purchases p
        JOIN vendors v ON v.id = p."vendorId"
        WHERE p.status = 'ORDERED'
      `;

      const pendingProductionOrders = await prisma.$queryRaw`
        SELECT  
          po."orderNo" AS orderNumber,
          SUM(po."qtyTarget") AS totalQuantity
        FROM production_orders po
        WHERE po.status = 'PLANNED' OR po.status = 'RELEASED'
        GROUP BY orderNumber
      `;
      res.json({
        lowStockItems,
        overdueReceivables,
        pendingPurchases,
        pendingProductionOrders,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  }
}

