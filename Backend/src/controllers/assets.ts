import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  createAssetCategorySchema,
  createAssetSchema,
  updateAssetSchema,
  capitalizeFromPurchaseSchema,
  disposeAssetSchema,
  runDepreciationSchema,
} from "../types/assets";
import { AuthRequest } from "../middleware/auth";
import { AssetsService } from "../services/assets";

const prisma = new PrismaClient();
const assetsService = new AssetsService();

export class AssetsController {
  // Asset Categories
  async getAssetCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await assetsService.getAssetCategories();
      res.json({ categories });
    } catch (error) {
      console.error("Get asset categories error:", error);
      res.status(500).json({ error: "Failed to fetch asset categories" });
    }
  }

  async createAssetCategory(req: AuthRequest, res: Response) {
    try {
      const validatedData = createAssetCategorySchema.parse(req.body);
      const category = await assetsService.createAssetCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Create asset category error:", error);
      res.status(400).json({ error: "Failed to create asset category" });
    }
  }

  async updateAssetCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createAssetCategorySchema.parse(req.body);
      const category = await assetsService.updateAssetCategory(
        id,
        validatedData,
      );
      res.json(category);
    } catch (error) {
      console.error("Update asset category error:", error);
      res.status(400).json({ error: "Failed to update asset category" });
    }
  }

  async deleteAssetCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await assetsService.deleteAssetCategory(id);
      res.json({ message: "Asset category deleted successfully" });
    } catch (error) {
      console.error("Delete asset category error:", error);
      res.status(400).json({ error: "Failed to delete asset category" });
    }
  }

  // Assets
  async getAssets(req: AuthRequest, res: Response) {
    try {
      const result = await assetsService.getAssets(req.query);
      res.json(result);
    } catch (error) {
      console.error("Get assets error:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  }

  async createAsset(req: AuthRequest, res: Response) {
    try {
      const validatedData = createAssetSchema.parse(req.body);
      const asset = await assetsService.createAsset(
        validatedData,
        req.user!.id,
      );
      res.status(201).json(asset);
    } catch (error) {
      console.error("Create asset error:", error);
      res.status(400).json({ error: "Failed to create asset" });
    }
  }

  async updateAsset(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateAssetSchema.parse(req.body);
      const asset = await assetsService.updateAsset(id, validatedData);
      res.json(asset);
    } catch (error) {
      console.error("Update asset error:", error);
      res.status(400).json({ error: "Failed to update asset" });
    }
  }

  async deleteAsset(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await assetsService.deleteAsset(id);
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      console.error("Delete asset error:", error);
      res.status(400).json({ error: "Failed to delete asset" });
    }
  }

  // Capitalization
  async capitalizeFromPurchase(req: AuthRequest, res: Response) {
    try {
      const validatedData = capitalizeFromPurchaseSchema.parse(req.body);
      const assets = await assetsService.capitalizeFromPurchase(
        validatedData,
        req.user!.id,
      );
      res.status(201).json({
        message: `${assets.length} assets capitalized successfully`,
        assets,
      });
    } catch (error) {
      console.error("Capitalize from purchase error:", error);
      res
        .status(400)
        .json({ error: "Failed to capitalize assets from purchase" });
    }
  }

  // Depreciation
  async runDepreciation(req: AuthRequest, res: Response) {
    try {
      const validatedData = runDepreciationSchema.parse(req.body);
      const result = await assetsService.runDepreciation(
        validatedData,
        req.user!.id,
      );
      res.json(result);
    } catch (error) {
      console.error("Run depreciation error:", error);
      res.status(400).json({ error: "Failed to run depreciation" });
    }
  }

  async getDepreciationSchedule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const schedule = await assetsService.getDepreciationSchedule(id);
      res.json(schedule);
    } catch (error) {
      console.error("Get depreciation schedule error:", error);
      res.status(500).json({ error: "Failed to fetch depreciation schedule" });
    }
  }

  // Asset Disposal
  async disposeAsset(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = disposeAssetSchema.parse(req.body);
      const disposal = await assetsService.disposeAsset(
        id,
        validatedData,
        req.user!.id,
      );
      res.json(disposal);
    } catch (error) {
      console.error("Dispose asset error:", error);
      res.status(400).json({ error: "Failed to dispose asset" });
    }
  }

  // Reports
  async getAssetRegister(req: AuthRequest, res: Response) {
    try {
      const register = await assetsService.getAssetRegister(req.query);
      res.json({ register });
    } catch (error) {
      console.error("Get asset register error:", error);
      res.status(500).json({ error: "Failed to fetch asset register" });
    }
  }

  async getAssetValuation(req: AuthRequest, res: Response) {
    try {
      const { asOfDate } = req.query;
      const valuation = await assetsService.getAssetValuation(
        asOfDate as string,
      );
      res.json(valuation);
    } catch (error) {
      console.error("Get asset valuation error:", error);
      res.status(500).json({ error: "Failed to fetch asset valuation" });
    }
  }

  // Get purchase orders for capitalization
  async getPurchaseOrdersForCapitalization(req: AuthRequest, res: Response) {
    try {
      const purchases = await prisma.purchase.findMany({
        where: {
          orderType: "ASSET",
          status: "ORDERED",
        },
        include: {
          vendor: { select: { code: true, name: true } },
          purchaseLines: {
            select: {
              id: true,
              assetName: true,
              qty: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
        orderBy: { orderDate: "desc" },
      });

      res.json({ purchases });
    } catch (error) {
      console.error("Get purchase orders for capitalization error:", error);
      res.status(500).json({ error: "Failed to fetch purchase orders" });
    }
  }
}
