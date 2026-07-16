import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

interface JournalEntry {
  accountCode: string;
  debit: number;
  credit: number;
  refType?: string;
  refId?: string;
}

export class GeneralLedgerService {
  async postJournal(
    tx: Prisma.TransactionClient,
    entries: JournalEntry[],
    memo: string,
    userId: string,
    date?: Date | undefined,
  ): Promise<string> {
    //return await prisma.$transaction(
    //async (tx) => {
    // Validate double-entry (debits = credits)
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(
        `Journal entries are not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }

    // Generate journal number
    const count = await tx.journal.count();
    const journalNo = `J${String(count + 1).padStart(6, "0")}`;

    // Create journal header
    const journal = await tx.journal.create({
      data: {
        journalNo,
        date: date || new Date(),
        memo,
        postedBy: userId,
      },
    });

    // Create journal lines
    for (const entry of entries) {
      const account = await tx.chartOfAccount.findUnique({
        where: { code: entry.accountCode },
      });

      if (!account) {
        throw new Error(`Account code ${entry.accountCode} not found`);
      }

      await tx.journalLine.create({
        data: {
          journalId: journal.id,
          accountId: account.id,
          debit: new Decimal(entry.debit),
          credit: new Decimal(entry.credit),
          refType: entry.refType,
          refId: entry.refId,
        },
      });
    }

    return journal.id;
    // },
    // {
    //   maxWait: 5000, // 5s wait for connection
    //   timeout: 20000, // 20s max runtime
    // },
    //);
  }

  async getTrialBalance(asOfDate: Date) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { isActive: true },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { lte: asOfDate },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    return accounts.map((account) => {
      const totalDebits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const totalCredits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );
      const balance = totalDebits.minus(totalCredits);

      return {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.accountType,
        debits: totalDebits.toNumber(),
        credits: totalCredits.toNumber(),
        balance: balance.toNumber(),
      };
    });
  }

  async getProfitAndLoss(fromDate: Date, toDate: Date) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        accountType: { in: ["REVENUE", "EXPENSE"] },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: {
                gte: fromDate,
                lte: toDate,
              },
            },
          },
        },
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    const revenues: any[] = [];
    const expenses: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    accounts.forEach((account) => {
      const totalDebits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const totalCredits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );
      const netAmount =
        account.accountType === "REVENUE"
          ? totalCredits.minus(totalDebits).toNumber()
          : totalDebits.minus(totalCredits).toNumber();

      const accountData = {
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      };

      if (account.accountType === "REVENUE") {
        revenues.push(accountData);
        totalRevenue += netAmount;
      } else {
        expenses.push(accountData);
        totalExpense += netAmount;
      }
    });

    const netIncome = totalRevenue - totalExpense;

    return {
      revenues,
      expenses,
      totalRevenue,
      totalExpense,
      netIncome,
    };
  }

  async getBalanceSheet(asOfDate: Date) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        accountType: { in: ["ASSET", "LIABILITY", "EQUITY"] },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { lte: asOfDate },
            },
          },
        },
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    accounts.forEach((account) => {
      const totalDebits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const totalCredits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );
      const balance =
        account.accountType === "ASSET"
          ? totalDebits.minus(totalCredits).toNumber()
          : totalCredits.minus(totalDebits).toNumber();

      const accountData = {
        accountCode: account.code,
        accountName: account.name,
        balance: Math.abs(balance),
      };

      if (account.accountType === "ASSET") {
        assets.push(accountData);
        totalAssets += balance;
      } else if (account.accountType === "LIABILITY") {
        liabilities.push(accountData);
        totalLiabilities += balance;
      } else {
        equity.push(accountData);
        totalEquity += balance;
      }
    });

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }
}
