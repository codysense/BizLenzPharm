import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  balanceSheetSchema,
  profitLossSchema,
  inventoryAgingSchema,
  arApAgingSchema,
} from "../types/reports";
import { AuthRequest } from "../middleware/auth";
import { ReportsService } from "../services/reports";
import jwt from "jsonwebtoken";

const METABASE_URL = "http://localhost:3002";
const METABASE_SECRET = process.env.METABASE_SECRET;

const prisma = new PrismaClient();
const reportsService = new ReportsService();

export class ReportsController {
  //Metabase Dashboard Embed
  getDashboardEmbed(req: Request, res: Response) {
    const payload = {
      resource: { dashboard: 1 },
      params: {},
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const token = jwt.sign(payload, METABASE_SECRET);

    res.json({
      url: `${METABASE_URL}/embed/dashboard/${token}#bordered=true&titled=true`,
    });
  }

  // Financial Reports
  async getBalanceSheet(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = balanceSheetSchema.parse(req.query);
      const report = await reportsService.getBalanceSheet(
        new Date(dateFrom),
        new Date(dateTo),
      );
      res.json(report);
    } catch (error) {
      console.error("Balance sheet error:", error);
      res.status(400).json({ error: "Failed to generate balance sheet" });
    }
  }

  async getProfitAndLoss(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = profitLossSchema.parse(req.query);
      const report = await reportsService.getProfitAndLoss(
        new Date(dateFrom),
        new Date(dateTo),
      );
      res.json(report);
    } catch (error) {
      console.error("Profit and loss error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate profit and loss statement" });
    }
  }

  async getTrialBalance(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo = new Date().toISOString() } = req.query;
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }
      const report = await reportsService.getTrialBalance(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Trial balance error:", error);
      res.status(400).json({ error: "Failed to generate trial balance" });
    }
  }

  async getGeneralLedger(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, accountId } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getGeneralLedger(
        new Date(dateFrom as string),
        new Date(dateTo as string),
        accountId as string,
      );
      res.json(report);
    } catch (error) {
      console.error("General ledger error:", error);
      res.status(400).json({ error: "Failed to generate general ledger" });
    }
  }

  async getCashFlow(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log("Date From:", dateFrom, "Date To:", dateTo);

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getCashFlow(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Cash flow error:", error);
      res.status(400).json({ error: "Failed to generate cash flow statement" });
    }
  }

  async getVendorBalances(req: AuthRequest, res: Response) {
    try {
      const { asOfDate } = req.query;

      if (!asOfDate) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getVendorBalances(
        new Date(asOfDate as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Vendor Balances  error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate Vendor Balances Report" });
    }
  }

  async getCustomerLedger(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, customerId } = req.query;

      if (!dateFrom || !dateTo || !customerId) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getCustomerLedger(
        new Date(dateFrom as string),
        new Date(dateTo as string),
        customerId as string,
      );
      res.json(report);
    } catch (error) {
      console.error("Customer Ledger  error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate Customer Ledger Report" });
    }
  }

  async getVendorLedger(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, vendorId } = req.query;

      if (!dateFrom || !dateTo || !vendorId) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getVendorLedger(
        new Date(dateFrom as string),
        new Date(dateTo as string),
        vendorId as string,
      );
      res.json(report);
    } catch (error) {
      console.error("Vendor Ledger  error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate Vendor Ledger Report" });
    }
  }
  async getCashAccountBalances(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getCashAccountBalances(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("CashAccount balances  error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate CashAccount balances Report" });
    }
  }

  async getCustomerBalances(req: AuthRequest, res: Response) {
    try {
      const { asOfDate } = req.query;

      if (!asOfDate) {
        return res.status(400).json({ error: "Date  is required" });
      }

      const report = await reportsService.getCustomerBalances(
        new Date(asOfDate as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Customer Balances error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate Customer Balances Report" });
    }
  }

  // Operational Reports
  async getInventoryAging(req: AuthRequest, res: Response) {
    try {
      const { asOfDate, warehouseId } = inventoryAgingSchema.parse(req.query);
      const report = await reportsService.getInventoryAging(
        new Date(asOfDate),
        warehouseId,
      );
      res.json(report);
    } catch (error) {
      console.error("Inventory aging error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate inventory aging report" });
    }
  }

  async getStockCard(req: AuthRequest, res: Response) {
    try {
      const { itemId, warehouseId, dateFrom, dateTo } = req.query;

      if (!itemId) {
        return res.status(400).json({ error: "Item ID is required" });
      }

      const report = await reportsService.getStockCard(
        itemId as string,
        warehouseId as string,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined,
      );
      res.json(report);
    } catch (error) {
      console.error("Stock card error:", error);
      res.status(400).json({ error: "Failed to generate stock card" });
    }
  }

  async getProductionVariance(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getProductionVariance(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Production variance error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate production variance report" });
    }
  }

  async getPOSSalesReport(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, warehouseId, userId } = req.query;

      // if (!dateFrom || !dateTo) {
      //   return res.status(400).json({ error: 'Date range is required' });
      // }

      const report = await reportsService.getPOSSalesReport({
        dateFrom: dateFrom ? new Date(dateFrom as string) : null,
        dateTo: dateTo ? new Date(dateTo as string) : null,
        warehouseId: warehouseId ? String(warehouseId) : null,
        userId: userId ? String(userId) : null,
      });
      res.json(report);
    } catch (error) {
      console.error("POS Sales Report error:", error);
      res.status(400).json({ error: "Failed to generate POS sales report" });
    }
  }

  async getSalesByItem(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo, itemId } = req.query;
      console.log(
        "Sales by item(controller)- Date From:",
        dateFrom,
        "Date To:",
        dateTo,
        "Item:",
        itemId,
      );

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const itemIdStr = typeof itemId === "string" ? itemId : undefined;

      const report = await reportsService.getSalesByItem(
        new Date(dateFrom as string),
        new Date(dateTo as string),
        itemIdStr,
      );
      res.json(report);
    } catch (error) {
      console.error("Sales by item error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate sales by item report" });
    }
  }

  async getSalesByCustomer(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getSalesByCustomer(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Sales by customer error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate sales by customer report" });
    }
  }

  async getPurchasesByVendor(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getPurchasesByVendor(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Purchases by vendor error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate purchases by vendor report" });
    }
  }

  async getArApAging(req: AuthRequest, res: Response) {
    try {
      const { asOfDate, type } = arApAgingSchema.parse(req.query);
      const report = await reportsService.getArApAging(
        new Date(asOfDate),
        type,
      );
      res.json(report);
    } catch (error) {
      console.error("AR/AP aging error:", error);
      res.status(400).json({ error: "Failed to generate AR/AP aging report" });
    }
  }

  async getProductionSummary(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getProductionSummary(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Production summary error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate production summary report" });
    }
  }

  async getProductionReport(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getProductionReport(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Production report error:", error);
      res.status(400).json({ error: "Failed to generate production  report" });
    }
  }

  async getMaterialUsage(req: AuthRequest, res: Response) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: "Date range is required" });
      }

      const report = await reportsService.getMaterialUsage(
        new Date(dateFrom as string),
        new Date(dateTo as string),
      );
      res.json(report);
    } catch (error) {
      console.error("Material Material Usage error:", error);
      res
        .status(400)
        .json({ error: "Failed to generate Material Material Usage report" });
    }
  }
}
