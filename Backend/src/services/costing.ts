import {
  PrismaClient,
  Prisma,
  CostingMethod,
  LedgerDirection,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export class CostingService {
  // use tx for transaction safety
  async getCostingMethod(
    tx: Prisma.TransactionClient,
    itemId: string,
  ): Promise<CostingMethod> {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      select: { costingMethod: true },
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    if (item.costingMethod === CostingMethod.GLOBAL) {
      // Get global costing policy inside same tx
      const policy = await tx.policy.findUnique({
        where: { key: "global_costing_method" },
      });

      return (policy?.valueJson as CostingMethod) || CostingMethod.WEIGHTED_AVG;
    }

    return item.costingMethod;
  }

  async issueInventory(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<{ unitCost: number; value: number; ledgerEntries: any[] }> {
    // return prisma.$transaction(
    // (tx) => {
    const costingMethod = await this.getCostingMethod(tx, itemId);

    if (
      costingMethod === CostingMethod.WEIGHTED_AVG ||
      costingMethod === "GLOBAL"
    ) {
      return this.issueWeightedAverage(
        tx,
        itemId,
        warehouseId,
        qty,
        refType,
        refId,
        userId,
      );
    } else {
      return this.issueFifo(
        tx,
        itemId,
        warehouseId,
        qty,
        refType,
        refId,
        userId,
      );
    }
    // },
    // { timeout: 15000 },
    //);
  }

  async issueInventoryForTransfer(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<{ unitCost: number; value: number; ledgerEntries: any[] }> {
    const costingMethod = await this.getCostingMethod(tx, itemId);

    if (
      costingMethod === CostingMethod.WEIGHTED_AVG ||
      costingMethod === "GLOBAL"
    ) {
      return this.issueWeightedAverage(
        tx,
        itemId,
        warehouseId,
        qty,
        refType,
        refId,
        userId,
      );
    } else {
      return this.issueFifo(
        tx,
        itemId,
        warehouseId,
        qty,
        refType,
        refId,
        userId,
      );
    }
  }

  async receiveInventoryForTransfer(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    unitCost: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<void> {
    const costingMethod = await this.getCostingMethod(tx, itemId);

    const lastEntry = await tx.inventoryLedger.findFirst({
      where: { itemId, warehouseId },
      orderBy: { postedAt: "desc" },
    });

    const currentQty = lastEntry?.runningQty || new Decimal(0);
    const currentValue = lastEntry?.runningValue || new Decimal(0);

    const newQty = currentQty.plus(qty);
    const newValue = currentValue.plus(new Decimal(qty).mul(unitCost));
    const newAvgCost = newQty.gt(0) ? newValue.div(newQty) : new Decimal(0);

    await tx.inventoryLedger.create({
      data: {
        itemId,
        warehouseId,
        refType,
        refId,
        direction: LedgerDirection.IN,
        qty: new Decimal(qty),
        unitCost: new Decimal(unitCost),
        value: new Decimal(qty).mul(unitCost),
        runningQty: newQty,
        runningValue: newValue,
        runningAvgCost: newAvgCost,
        userId,
      },
    });

    if (costingMethod === CostingMethod.FIFO) {
      await tx.inventoryBatch.create({
        data: {
          itemId,
          warehouseId,
          qtyOnHand: new Decimal(qty),
          unitCost: new Decimal(unitCost),
          receivedAt: new Date(),
        },
      });
    }
  }

  async receiveInventory(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    unitCost: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<void> {
    // await prisma.$transaction(
    //async (tx) => {
    const costingMethod = await this.getCostingMethod(tx, itemId);

    // Get current running totals
    const lastEntry = await tx.inventoryLedger.findFirst({
      where: { itemId, warehouseId },
      orderBy: { postedAt: "desc" },
    });

    const currentQty = lastEntry?.runningQty || new Decimal(0);
    const currentValue = lastEntry?.runningValue || new Decimal(0);

    const newQty = currentQty.plus(qty);
    const newValue = currentValue.plus(new Decimal(qty).mul(unitCost));
    const newAvgCost = newQty.gt(0) ? newValue.div(newQty) : new Decimal(0);

    // Create inventory ledger entry
    await tx.inventoryLedger.create({
      data: {
        itemId,
        warehouseId,
        refType,
        refId,
        direction: LedgerDirection.IN,
        qty: new Decimal(qty),
        unitCost: new Decimal(unitCost),
        value: new Decimal(qty).mul(unitCost),
        runningQty: newQty,
        runningValue: newValue,
        runningAvgCost: newAvgCost,
        userId,
      },
    });

    // For FIFO, create inventory batch
    if (costingMethod === CostingMethod.FIFO) {
      await tx.inventoryBatch.create({
        data: {
          itemId,
          warehouseId,
          qtyOnHand: new Decimal(qty),
          unitCost: new Decimal(unitCost),
          receivedAt: new Date(),
        },
      });
    }
    //},
    // {
    //   maxWait: 5000, // 5s wait for connection
    //   timeout: 20000, // 20s max runtime
    // },
    //);
  }

  private async issueWeightedAverage(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<{ unitCost: number; value: number; ledgerEntries: any[] }> {
    // Get current running totals
    const lastEntry = await tx.inventoryLedger.findFirst({
      where: { itemId, warehouseId },
      orderBy: { postedAt: "desc" },
    });

    if (!lastEntry || lastEntry.runningQty.lt(qty)) {
      throw new Error(
        `Insufficient stock. Available: ${
          lastEntry?.runningQty || 0
        }, Required: ${qty}`,
      );
    }

    const currentQty = lastEntry.runningQty;
    const currentValue = lastEntry.runningValue;
    const currentAvgCost = lastEntry.runningAvgCost;

    const issueValue = new Decimal(qty).mul(currentAvgCost);
    const newQty = currentQty.minus(qty);
    const newValue = currentValue.minus(issueValue);
    const newAvgCost = newQty.gt(0) ? newValue.div(newQty) : new Decimal(0);

    // Create inventory ledger entry
    const ledgerEntry = await tx.inventoryLedger.create({
      data: {
        itemId,
        warehouseId,
        refType,
        refId,
        direction: LedgerDirection.OUT,
        qty: new Decimal(qty),
        unitCost: currentAvgCost,
        value: issueValue.neg(),
        runningQty: newQty,
        runningValue: newValue,
        runningAvgCost: newAvgCost,
        userId,
      },
    });

    return {
      unitCost: currentAvgCost.toNumber(),
      value: issueValue.toNumber(),
      ledgerEntries: [ledgerEntry],
    };
  }

  private async issueFifo(
    tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
    qty: number,
    refType: string,
    refId: string,
    userId?: string,
  ): Promise<{ unitCost: number; value: number; ledgerEntries: any[] }> {
    // Get available batches ordered by received date (FIFO)
    const batches = await tx.inventoryBatch.findMany({
      where: { itemId, warehouseId, qtyOnHand: { gt: 0 } },
      orderBy: { receivedAt: "asc" },
    });

    const totalAvailable = batches.reduce(
      (sum, batch) => sum.plus(batch.qtyOnHand),
      new Decimal(0),
    );

    if (totalAvailable.lt(qty)) {
      throw new Error(
        `Insufficient stock. Available: ${totalAvailable}, Required: ${qty}`,
      );
    }

    let remainingQty = new Decimal(qty);
    let totalValue = new Decimal(0);
    let weightedUnitCost = new Decimal(0);
    const ledgerEntries = [];

    // Get current running totals
    const lastEntry = await tx.inventoryLedger.findFirst({
      where: { itemId, warehouseId },
      orderBy: { postedAt: "desc" },
    });

    let runningQty = lastEntry?.runningQty || new Decimal(0);
    let runningValue = lastEntry?.runningValue || new Decimal(0);

    // Issue from batches in FIFO order
    for (const batch of batches) {
      if (remainingQty.lte(0)) break;

      const qtyToTake = Decimal.min(remainingQty, batch.qtyOnHand);
      const issueValue = qtyToTake.mul(batch.unitCost);

      totalValue = totalValue.plus(issueValue);
      remainingQty = remainingQty.minus(qtyToTake);
      runningQty = runningQty.minus(qtyToTake);
      runningValue = runningValue.minus(issueValue);

      const runningAvgCost = runningQty.gt(0)
        ? runningValue.div(runningQty)
        : new Decimal(0);

      // Create ledger entry
      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          itemId,
          warehouseId,
          refType,
          refId,
          direction: LedgerDirection.OUT,
          qty: qtyToTake,
          unitCost: batch.unitCost,
          value: issueValue.neg(),
          runningQty,
          runningValue,
          runningAvgCost,
          batchId: batch.id,
          userId,
        },
      });

      ledgerEntries.push(ledgerEntry);

      // Update batch
      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { qtyOnHand: batch.qtyOnHand.minus(qtyToTake) },
      });
    }

    weightedUnitCost = new Decimal(qty).gt(0)
      ? totalValue.div(qty)
      : new Decimal(0);

    return {
      unitCost: weightedUnitCost.toNumber(),
      value: totalValue.toNumber(),
      ledgerEntries,
    };
  }

  async getInventoryValue(
    // tx: Prisma.TransactionClient,
    itemId: string,
    warehouseId: string,
  ): Promise<{ qty: number; value: number; avgCost: number }> {
    const costingMethod = await prisma.item
      .findUnique({
        where: { id: itemId },
        select: { costingMethod: true },
      })
      .then((item) => item?.costingMethod ?? CostingMethod.WEIGHTED_AVG);
    // console.log("Costing Method ", costingMethod);

    if (
      costingMethod === CostingMethod.WEIGHTED_AVG ||
      costingMethod === "GLOBAL"
    ) {
      const lastEntry = await prisma.inventoryLedger.findFirst({
        where: { itemId, warehouseId },
        orderBy: { postedAt: "desc" },
      });

      if (!lastEntry) {
        return { qty: 0, value: 0, avgCost: 0 };
      }

      const qty = lastEntry.runningQty.toNumber();
      const value = lastEntry.runningValue.toNumber();
      const avgCost = lastEntry.runningAvgCost.toNumber();

      //  If stock still exists, return normally
      if (qty > 0) {
        return { qty, value, avgCost };
      }

      //  If stock is zero, fetch last known avgCost > 0
      const lastKnownCost = await prisma.inventoryLedger.findFirst({
        where: {
          itemId,
          warehouseId,
          runningAvgCost: { gt: 0 },
        },
        orderBy: { postedAt: "desc" },
      });

      return {
        qty: 0,
        value: 0,
        avgCost: lastKnownCost ? lastKnownCost.runningAvgCost.toNumber() : 0,
      };
    } else {
      // FIFO - sum batches
      const batches = await prisma.inventoryBatch.findMany({
        where: { itemId, warehouseId, qtyOnHand: { gt: 0 } },
      });

      const totalQty = batches.reduce(
        (sum, b) => sum + b.qtyOnHand.toNumber(),
        0,
      );
      const totalValue = batches.reduce(
        (sum, b) => sum + b.qtyOnHand.toNumber() * b.unitCost.toNumber(),
        0,
      );
      const avgCost = totalQty > 0 ? totalValue / totalQty : 0;
      // console.log("avgCost from Fifo", avgCost);

      return { qty: totalQty, value: totalValue, avgCost };
    }
  }
}
