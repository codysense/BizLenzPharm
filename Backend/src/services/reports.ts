import { PrismaClient, ProductionOrder } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
//import { prisma } from "../../prisma";

const prisma = new PrismaClient();

interface ProductionSummary {
  name: string;
  CumProduction: number; // Note: exact case as in SQL
}

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

export class ReportsService {
  // Financial Reports
  async getBalanceSheet(fromDate: Date, asOfDate: Date) {
    const endDate = endOfDayUTC(asOfDate);
    const startDate = startOfDayUTC(fromDate);

    // Get chart of accounts
    const chartAccounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        accountType: {
          in: [
            "CURRENT_ASSETS",
            "NON_CURRENT_ASSETS",
            "TRADE_RECEIVABLES",
            "CURRENT_LIABILITY",
            "NON_CURRENT_LIABILITY",
            "TRADE_PAYABLES",
            "EQUITY",
          ],
        },
        name: { notIn: ["Memo Cash Clearing", "Asset Clearing Account"] },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { lte: endDate },
            },
          },
        },
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    // Get cash accounts separately
    // const cashAccounts = await prisma.cashAccount.findMany({
    //   // where: { isActive: true }
    // });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    // Process chart of accounts
    chartAccounts.forEach((account) => {
      const totalDebits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const totalCredits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );

      const balance = [
        "CURRENT_ASSETS",
        "NON_CURRENT_ASSETS",
        "TRADE_RECEIVABLES",
      ].includes(account.accountType)
        ? totalDebits.minus(totalCredits).toNumber()
        : totalCredits.minus(totalDebits).toNumber();

      const accountData = {
        accountCode: account.code,
        accountName: account.name,
        balance: balance,
      };

      if (
        ["CURRENT_ASSETS", "NON_CURRENT_ASSETS", "TRADE_RECEIVABLES"].includes(
          account.accountType,
        )
      ) {
        assets.push(accountData);
        // totalAssets += account.code === '1100' ? balance: 0;
        totalAssets += balance;
      } else if (
        [
          "CURRENT_LIABILITY",
          "NON_CURRENT_LIABILITY",
          "TRADE_PAYABLES",
        ].includes(account.accountType)
      ) {
        liabilities.push(accountData);
        totalLiabilities += balance;
      } else if (account.accountType === "EQUITY") {
        equity.push(accountData);
        totalEquity += balance;
      }
    });

    // Add cash accounts to assets
    // let totalCashBalance = 0;
    // cashAccounts.forEach(cashAccount => {

    //   const balance = Number(cashAccount.balance);
    //   assets.push({
    //     accountCode: cashAccount.code,
    //     accountName: `${cashAccount.name} (${cashAccount.accountType})`,
    //     balance: (balance)
    //   });
    //   totalAssets +=  balance;
    //   totalCashBalance += balance;
    // });

    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 1);

    const { netIncome: retainProfit } = await this.getProfitAndLoss(
      new Date("01/01/1900"),
      newDate,
    );

    const { netIncome: netProfit } = await this.getProfitAndLoss(
      startDate,
      endDate,
    );

    //  console.log("Net Profit", netProfit, 'retain Profit', retainProfit)

    equity.push({
      accountName: "Retain Profit",
      balance: retainProfit,
      accountCode: "RetPrt001",
    });
    totalEquity += retainProfit;
    equity.push({
      accountName: "Net Profit",
      balance: netProfit,
      accountCode: "NetPrt001",
    });
    totalEquity += netProfit;
    // console.log("Assets", assets)

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      // totalCashBalance
    };
  }

  /**
   * Generates a Profit and Loss report for a specified date range.
   *
   * Retrieves active chart of accounts of types 'INCOME', 'EXPENSES', 'OTHER_INCOME', and 'COST_OF_SALES',
   * along with their journal lines within the given date range. Calculates total revenues, expenses,
   * and net income based on account balances.
   *
   * @param fromDate - The start date of the reporting period.
   * @param toDate - The end date of the reporting period.
   * @returns An object containing:
   *   - fromDate: The start date of the report.
   *   - toDate: The end date of the report.
   *   - revenues: Array of revenue account details and amounts.
   *   - expenses: Array of expense account details and amounts.
   *   - totalRevenue: The total revenue amount.
   *   - totalExpense: The total expense amount.
   *   - netIncome: The calculated net income (totalRevenue - totalExpense).
   *
   * @throws Will propagate any errors from the database query.
   */
  async getProfitAndLoss(fromDate: Date, toDate: Date) {
    if (!fromDate) {
      fromDate = new Date("01/01/1900");
    }

    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    // console.log(
    //   "Generating Profit and Loss report for date range:",
    //   fromDate,
    //   "to",
    //   toDate,
    // );

    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        accountType: {
          in: ["INCOME", "EXPENSES", "OTHER_INCOME", "COST_OF_SALES"],
        },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: {
                gte: newFromDate,
                lte: newToDate,
              },
            },
          },
        },
      },
      orderBy: [{ accountType: "asc" }, { code: "asc" }],
    });

    const revenues: any[] = [];
    const expenses: any[] = [];
    const otherIncomes: any[] = [];
    const costOfSales: any[] = [];
    let totalRevenue = 0;
    let totalExpense = 0;
    let totalOtherIncome = 0;
    let totalCostOfSales = 0;

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
        account.accountType === "INCOME" ||
        account.accountType === "OTHER_INCOME"
          ? totalCredits.minus(totalDebits).toNumber()
          : totalDebits.minus(totalCredits).toNumber();

      const accountData = {
        accountCode: account.code,
        accountName: account.name,
        amount: Math.abs(netAmount),
      };

      if (account.accountType === "INCOME") {
        revenues.push(accountData);
        totalRevenue += accountData.amount;
        //totalRevenue += netAmount;
      } else if (account.accountType === "OTHER_INCOME") {
        otherIncomes.push(accountData);
        totalOtherIncome += accountData.amount;
        //totalOtherIncome += netAmount;
      } else if (account.accountType === "COST_OF_SALES") {
        costOfSales.push(accountData);
        totalCostOfSales += accountData.amount;
        //totalCostOfSales += netAmount;
      } else if (account.accountType === "EXPENSES") {
        expenses.push(accountData);
        totalExpense += accountData.amount;
        //totalExpense += netAmount;
      } else {
        totalExpense += accountData.amount;
        // totalExpense += netAmount;
      }
    });
    const grossProfit = totalRevenue - totalCostOfSales;

    const netIncome = grossProfit + totalOtherIncome - totalExpense;

    // console.log(
    //   "Net Income",
    //   netIncome,
    //   "Gross Profit",
    //   grossProfit,
    //   "Total Other Income",
    //   totalOtherIncome,
    // );

    return {
      fromDate,
      toDate,
      revenues,
      totalRevenue,
      costOfSales,
      totalCostOfSales,
      grossProfit,
      otherIncomes,
      totalOtherIncome,
      expenses,
      totalExpense,
      netIncome,
    };
  }

  //Get POS Sales

  async getPOSSalesReport(params: {
    dateFrom: Date;
    dateTo: Date;
    warehouseId?: string | null;
    userId?: string | null;
  }) {
    const { dateFrom, dateTo, warehouseId, userId } = params;
    // console.log(dateFrom, dateTo, warehouseId, userId)
    // base query
    const newToDate = endOfDayUTC(dateTo);
    const newFromDate = startOfDayUTC(dateFrom);

    let query = `
    WITH report AS (
      SELECT 
        ps."createdAt"::date AS "TransactionDate",
        ps."saleNo" AS "SaleNo",
        w.name AS "WarehouseName",
        u.name AS "SalesRep",
        ca.name AS "CashAccountName",
        ps."totalAmount" AS "TotalAmount",
        ps."amountPaid" AS "AmountPaid"
      FROM pos_sales ps
      LEFT JOIN warehouses w   ON ps."warehouseId"   = w.id
      LEFT JOIN cash_accounts ca ON ps."cashAccountId" = ca.id
      LEFT JOIN users u       ON ps."userId"        = u.id
      WHERE ps."createdAt"::date BETWEEN $1::date AND $2::date and status = 'COMPLETED'
  `;

    const values: any[] = [newFromDate, newToDate];
    let paramIndex = 3;

    // add warehouse filter if present
    if (warehouseId) {
      query += ` AND ps."warehouseId" = $${paramIndex}`;
      values.push(warehouseId);
      paramIndex++;
    }

    // add user filter if present
    if (userId) {
      query += ` AND ps."userId" = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    }

    query += `
    )
    SELECT * FROM report
    UNION ALL
    SELECT 
      NULL AS "TransactionDate",
      'Grand Total' AS "SaleNo",
      '' AS "WarehouseName",
      '' AS "SalesRep",
      '' AS "CashAccountName",
      SUM("TotalAmount") AS "TotalAmount",
      SUM("AmountPaid")  AS "AmountPaid"
    FROM report
    ORDER BY "TransactionDate" NULLS LAST;
  `;

    const result = await prisma.$queryRawUnsafe<any[]>(query, ...values);

    return result.map((r) => ({
      ...r,
      TransactionDate: r.TransactionDate?.toISOString().split("T")[0] ?? "-",
      TotalAmount: r.TotalAmount != null ? Number(r.TotalAmount) : 0,
      AmountPaid: r.AmountPaid != null ? Number(r.AmountPaid) : 0,
    }));
  }

  async getTrialBalance(fromDate: Date, toDate: Date) {
    // Get chart of accounts
    // For balance sheet accounts (equity, assets, liability)
    // For balance sheet accounts (equity, assets, liability) - EXCLUDING Cash and Bank
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    const balanceSheetAccounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        name: {
          notIn: [
            "Memo Cash Clearing",
            "Cash and Bank",
            "Asset Clearing Account",
          ],
        },
        accountType: {
          in: [
            "EQUITY",
            "CURRENT_ASSETS",
            "NON_CURRENT_ASSETS",
            "CURRENT_LIABILITY",
            "NON_CURRENT_LIABILITY",
          ],
        },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { lte: newToDate }, // From inception till toDate
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    // For Cash and Bank account - using date range
    const cashAndBankAccount = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        name: "Cash and Bank",
        accountType: "CURRENT_ASSETS",
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { gte: newFromDate, lte: newToDate }, // Within date range
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    // For income/expense accounts
    const incomeExpenseAccounts = await prisma.chartOfAccount.findMany({
      where: {
        isActive: true,
        name: { notIn: ["Memo Cash Clearing", "Asset Clearing Account"] },
        accountType: {
          notIn: [
            "EQUITY",
            "CURRENT_ASSETS",
            "NON_CURRENT_ASSETS",
            "CURRENT_LIABILITY",
            "NON_CURRENT_LIABILITY",
          ],
        },
      },
      include: {
        journalLines: {
          where: {
            journal: {
              date: { gte: newFromDate, lte: newToDate }, // Within date range
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    // Combine all results
    const chartAccounts = [
      ...balanceSheetAccounts,
      ...cashAndBankAccount,
      ...incomeExpenseAccounts,
    ].sort((a, b) => a.code.localeCompare(b.code));

    // Get cash accounts
    const cashAccounts = await prisma.cashAccount.findMany({
      where: { isActive: true },
    });

    const trialBalanceData = [];

    // Process chart of accounts
    chartAccounts.forEach((account) => {
      const totalDebits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0),
      );
      const totalCredits = account.journalLines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0),
      );
      const balance = totalDebits.minus(totalCredits);

      trialBalanceData.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.accountType,
        debits: totalDebits.toNumber(),
        credits: totalCredits.toNumber(),
        balance: balance.toNumber(),
      });
    });

    const newDate = new Date(newFromDate);
    newDate.setDate(newDate.getDate() - 1);

    const { netIncome: retainProfit } = await this.getProfitAndLoss(
      new Date("01/01/1900"),
      newDate,
    );

    trialBalanceData.push({
      accountName: "Retained Profit",
      balance: retainProfit,
      accountCode: "RetPrt001",
      accountType: "Equity",
    });

    // Add cash accounts to trial balance
    // cashAccounts.forEach(cashAccount => {
    //   const balance = Number(cashAccount.balance);
    //   trialBalanceData.push({
    //     accountCode: cashAccount.code,
    //     accountName: `${cashAccount.name} (${cashAccount.accountType})`,
    //     accountType: 'CURRENT_ASSETS',
    //     debits: balance >= 0 ? balance : 0,
    //     credits: balance < 0 ? Math.abs(balance) : 0,
    //     balance: balance
    //   });
    // });

    return trialBalanceData.sort((a, b) =>
      a.accountCode.localeCompare(b.accountCode),
    );
  }

  async getGeneralLedger(fromDate: Date, toDate: Date, accountId?: string) {
    const fromDateStart = startOfDayUTC(fromDate);
    const toDateEnd = endOfDayUTC(toDate);
    const where: any = {
      journal: {
        date: {
          gte: fromDateStart,
          lte: toDateEnd,
        },
      },
    };

    if (accountId) {
      where.accountId = accountId;
    }

    // Get journal lines for the period
    const journalLines = await prisma.journalLine.findMany({
      where,
      include: {
        journal: {
          select: { journalNo: true, date: true, memo: true },
        },
        account: {
          select: { code: true, name: true, accountType: true },
        },
      },
      orderBy: [
        { journal: { date: "asc" } },
        { journal: { journalNo: "asc" } },
      ],
    });

    // Calculate opening balance (all transactions before fromDate)
    const openingBalanceWhere: any = {
      journal: {
        date: {
          lt: fromDateStart,
        },
      },
    };

    if (accountId) {
      openingBalanceWhere.accountId = accountId;
    }

    const openingBalanceLines = await prisma.journalLine.findMany({
      where: openingBalanceWhere,
    });

    const openingBalance = openingBalanceLines.reduce((balance, line) => {
      return balance + line.debit.toNumber() - line.credit.toNumber();
    }, 0);

    // Calculate totals for the period
    const totalReceipt = journalLines.reduce(
      (sum, line) => sum + line.debit.toNumber(),
      0,
    );
    const totalPayment = journalLines.reduce(
      (sum, line) => sum + line.credit.toNumber(),
      0,
    );

    // Calculate closing balance
    const closingBalance = openingBalance + totalReceipt - totalPayment;

    // Map journal lines with running balance
    let runningBalance = openingBalance;
    const lines = journalLines.map((line) => {
      runningBalance += line.debit.toNumber() - line.credit.toNumber();

      return {
        date: line.journal.date,
        journalNo: line.journal.journalNo,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.accountType,
        memo: line.journal.memo,
        debit: line.debit.toNumber(),
        credit: line.credit.toNumber(),
        balance: runningBalance,
        refType: line.refType,
        refId: line.refId,
      };
    });

    return {
      openingBalance,
      closingBalance,
      totalReceipt,
      totalPayment,
      lines,
      accountInfo:
        journalLines.length > 0
          ? {
              code: journalLines[0].account.code,
              name: journalLines[0].account.name,
              accountType: journalLines[0].account.accountType,
            }
          : null,
    };
  }

  async getCashAccountBalances(dateFrom: Date, dateTo: Date) {
    const newToDate = endOfDayUTC(dateTo);
    const newFromDate = startOfDayUTC(dateFrom);
    const rawResult = await prisma.$queryRawUnsafe<
      {
        SerialNo: number | null;
        AccountName: string;
        AccountType: string;
        OpeningBalance: number | null;
        TotalInflow: number;
        TotalOutflow: number;
        ClosingBalance: number;
      }[]
    >(
      `
    WITH tx AS (
      SELECT
        ca.id            AS account_id,
        ca.name          AS account_name,
        ca."accountType" AS account_type,
        ca.balance       AS current_balance,

        COALESCE(
          SUM(ct.amount) FILTER (
            WHERE ct."transactionType" = 'RECEIPT'
              AND ct."transactionDate" >= $1
              AND ct."transactionDate" < ($2::date + INTERVAL '1 day')
          ), 0
        )::NUMERIC AS total_inflow,

        COALESCE(
          SUM(ct.amount) FILTER (
            WHERE ct."transactionType" = 'PAYMENT'
              AND ct."transactionDate" >= $1
              AND ct."transactionDate" < ($2::date + INTERVAL '1 day')
          ), 0
        )::NUMERIC AS total_outflow,

        COALESCE(
          SUM(ct.amount) FILTER (
            WHERE ct."transactionType" = 'RECEIPT'
              AND ct."transactionDate" >= $1
          ), 0
        )::NUMERIC AS inflows_after_start,

        COALESCE(
          SUM(ct.amount) FILTER (
            WHERE ct."transactionType" = 'PAYMENT'
              AND ct."transactionDate" >= $1
          ), 0
        )::NUMERIC AS outflows_after_start

      FROM cash_accounts ca
      LEFT JOIN cash_transactions ct
             ON ca.id = ct."cashAccountId"
      WHERE ca.name <> 'Memo Clearing'
      GROUP BY ca.id, ca.name, ca."accountType", ca.balance
    ),
    report AS (
      SELECT
        ROW_NUMBER() OVER (ORDER BY account_name)::INT AS "SerialNo", --  cast to INT
        account_name AS "AccountName",
        account_type AS "AccountType",
        (current_balance - inflows_after_start + outflows_after_start)::NUMERIC AS "OpeningBalance",
        total_inflow   AS "TotalInflow",
        total_outflow  AS "TotalOutflow",
        ((current_balance - inflows_after_start + outflows_after_start)
           + total_inflow - total_outflow)::NUMERIC AS "ClosingBalance"
      FROM tx
    )
    SELECT * FROM report
    UNION ALL
    SELECT
      NULL AS "SerialNo",
      'Grand Total' AS "AccountName",
      '' AS "AccountType",
      NULL AS "OpeningBalance",
      SUM("TotalInflow")::NUMERIC  AS "TotalInflow",
      SUM("TotalOutflow")::NUMERIC AS "TotalOutflow",
      SUM("ClosingBalance")::NUMERIC AS "ClosingBalance"
    FROM report
    ORDER BY "SerialNo" NULLS LAST;
  `,
      newFromDate,
      newToDate,
    );

    // Convert Decimals → numbers
    const safeResult = rawResult.map((r) => ({
      ...r,
      SerialNo: r.SerialNo === null ? null : Number(r.SerialNo),
      OpeningBalance:
        r.OpeningBalance === null ? null : Number(r.OpeningBalance),
      TotalInflow: Number(r.TotalInflow),
      TotalOutflow: Number(r.TotalOutflow),
      ClosingBalance: Number(r.ClosingBalance),
    }));

    return safeResult;
  }

  async getCustomerBalances(asOfDate: Date) {
    const newAsOfDate = endOfDayUTC(asOfDate);
    const result = await prisma.$queryRawUnsafe<
      {
        customer_id: string;
        customer_code: string;
        customer_name: string;
        total_sales: number;
        total_receipts: number;
        outstanding_balance: number;
      }[]
    >(
      `
SELECT 
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,

    COALESCE(s.total_sales, 0) AS total_sales,
    COALESCE(p.total_receipts, 0) AS total_receipts,
    COALESCE(r.total_refunds, 0) AS total_refunds,
    COALESCE(dm.total_debit_memos, 0) AS total_debit_memos,
    COALESCE(cm.total_credit_memos, 0) AS total_credit_memos,

    /* FINAL OUTSTANDING */
    COALESCE(s.total_sales, 0)
      - COALESCE(p.total_receipts, 0)
      + COALESCE(r.total_refunds, 0)
      + COALESCE(dm.total_debit_memos, 0)
      - COALESCE(cm.total_credit_memos, 0)
      AS outstanding_balance

FROM customers c

/* ---------------- SALES ---------------- */
LEFT JOIN (
    SELECT 
        "customerId",
        SUM("totalAmount") AS total_sales
    FROM sales
    WHERE "orderDate" <= $1
      AND status IN ('INVOICED', 'PAID', 'RETURNED')
    GROUP BY "customerId"
) s ON s."customerId" = c.id


/* ---------------- RECEIPTS (AR ONLY) ---------------- */
LEFT JOIN (
    SELECT
        cp."customerId",
        SUM(cpl."lineAmount") AS total_receipts
    FROM customer_payments cp
    INNER JOIN customer_payment_lines cpl
        ON cpl."customerPaymentId" = cp.id
    INNER JOIN chart_of_accounts coa
        ON coa.id = cpl."glAccountId"
       AND coa.code = '1200'
    WHERE cp.status = 'PAID'
      AND cp."paymentDate" <= $1
    GROUP BY cp."customerId"
) p ON p."customerId" = c.id


/* ---------------- REFUNDS ---------------- */
LEFT JOIN (
    SELECT 
        "customerId",
        SUM("amountRefunded") AS total_refunds
    FROM sales_refunds
    WHERE "refundDate" <= $1
    GROUP BY "customerId"
) r ON r."customerId" = c.id


/* ---------------- DEBIT MEMOS ---------------- */
LEFT JOIN (
    SELECT
        "customerId",

        SUM(
          CASE 
            WHEN "memoType" = 'DEBIT' AND "isReversal" = false THEN "amount"
            WHEN "memoType" = 'CREDIT' AND "isReversal" = true THEN "amount"
            ELSE 0
          END
        ) AS total_debit_memos

    FROM memo
    WHERE "date" <= $1
    GROUP BY "customerId"
) dm ON dm."customerId" = c.id


/* ---------------- CREDIT MEMOS ---------------- */
LEFT JOIN (
    SELECT
        "customerId",
         SUM(
         CASE
          WHEN m."memoType" = 'CREDIT' AND m."isReversal" = false THEN  m."amount"
          WHEN m."memoType" = 'DEBIT' AND m."isReversal" = true THEN m."amount"
          ELSE 0
        END )
        AS total_credit_memos
    FROM memo m
    WHERE    m."date" <= $1
    GROUP BY m."customerId"
) cm ON cm."customerId" = c.id

ORDER BY c.name;
`,
      newAsOfDate,
    );
    //console.log("Customer Balances Result:", result);

    return result;
  }

  async getCustomerLedger(fromDate: Date, toDate: Date, customerId: string) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    //  Opening Balance before period
    const opening = await prisma.$queryRawUnsafe<{ balance: number }[]>(
      `
   SELECT COALESCE(SUM(x.balance), 0) AS balance
FROM (

  /* ---------------- SALES (DEBIT) ---------------- */
  SELECT s."totalAmount" AS balance
  FROM sales s
  WHERE s."customerId" = $1
    AND s."orderDate" < $2
    AND s.status IN ('INVOICED', 'PAID', 'RETURNED')

  UNION ALL

  /* ---------------- PAYMENTS (CREDIT) ---------------- */
  SELECT -SUM(ABS(cpl."lineAmount")) AS balance
  FROM customer_payments cp
  INNER JOIN customer_payment_lines cpl
      ON cpl."customerPaymentId" = cp.id
  INNER JOIN chart_of_accounts coa
      ON coa.id = cpl."glAccountId"
     AND coa.code = '1200'
  WHERE cp."customerId" = $1
    AND cp.status = 'PAID'
    AND cp."paymentDate" < $2

  UNION ALL

  /* ---------------- REFUNDS (DEBIT) ---------------- */
  SELECT srr."amountRefunded" AS balance
  FROM sales_refunds srr
  WHERE srr."customerId" = $1
    AND srr."refundDate" < $2

  UNION ALL
 
/* ---------------- CUSTOMER CREDIT MEMO (CREDIT AR) ---------------- */
/* ---------------- CUSTOMER MEMOS ---------------- */
SELECT 
  CASE 
    WHEN m."memoType" = 'CREDIT' AND m."isReversal" = false  THEN -m."amount"
    WHEN m."memoType" = 'DEBIT' AND m."isReversal" = false THEN  m."amount"
    WHEN m."memoType" = 'CREDIT' AND m."isReversal" = true  THEN m."amount"
    WHEN m."memoType" = 'DEBIT' AND m."isReversal" = true THEN  -m."amount"
  END AS balance
FROM memo m
WHERE m."customerId" = $1
  AND m."date" < $2


) x;
    `,
      customerId,
      newFromDate,
    );

    const openingBalance = Number(opening[0].balance || 0);

    //  Ledger entries in period
    const entries = await prisma.$queryRawUnsafe<
      {
        type: string;
        account_code: string;
        account_name: string;
        transaction_type: string;
        reference: string;
        date: Date;
        debit: number;
        credit: number;
        balance: number;
        description: string;
      }[]
    >(
      `
    SELECT 
  'CUSTOMER' AS type,
  c."code" AS account_code,
  c."name" AS account_name,
  'SALE' AS transaction_type,
  s."orderNo" AS reference,
  s."orderDate" AS date,
  s."totalAmount" AS debit,
  0 AS credit,
  s."totalAmount" AS amount,
  'Sales Invoice' AS description
FROM sales s
INNER JOIN customers c ON s."customerId" = c.id
WHERE c.id = $1
 AND s."orderDate" >= $2
AND s."orderDate" < ($3 + INTERVAL '1 day')

  AND s.status IN ('INVOICED', 'PAID','RETURNED')

UNION ALL

/* ---------------- CUSTOMER PAYMENTS (AR CLEARING) ---------------- */
SELECT
  'CUSTOMER' AS type,
  c."code" AS account_code,
  c."name" AS account_name,
  'RECEIPT' AS transaction_type,
  cp."paymentNo" AS reference,
  cp."paymentDate" AS date,
  0 AS debit,
  ABS(cpl."lineAmount") AS credit,
  ABS(cpl."lineAmount") AS amount,
  CONCAT('Customer payment ', COALESCE(cp."reference", '')) AS description
FROM customer_payments cp
INNER JOIN customer_payment_lines cpl
    ON cpl."customerPaymentId" = cp.id
INNER JOIN chart_of_accounts coa
    ON coa.id = cpl."glAccountId"
   AND coa.code = '1200'
INNER JOIN customers c
    ON cp."customerId" = c.id
WHERE c.id = $1
  AND cp.status = 'PAID'
  AND cp."paymentDate" >= $2
  AND cp."paymentDate" < ($3 + INTERVAL '1 day')

UNION ALL

/* ---------------- REFUNDS ---------------- */
SELECT 
  'CUSTOMER' AS type,
  c."code" AS account_code,
  c."name" AS account_name,
  'REFUND' AS transaction_type,
  srr."refundNo" AS reference,
  srr."refundDate" AS date,
  srr."amountRefunded" AS debit,
  0 AS credit,
  srr."amountRefunded" AS amount,
  CONCAT('Payment refunded ', COALESCE(srr."reference", '')) AS description
FROM sales_refunds srr
INNER JOIN customers c ON srr."customerId" = c.id
WHERE c.id = $1
  AND srr."refundDate" >= $2
  AND srr."refundDate" < ($3 + INTERVAL '1 day')

  UNION ALL

/* ---------------- CUSTOMER MEMOS ---------------- */
/* ---------------- CUSTOMER MEMOS ---------------- */
SELECT
  'CUSTOMER' AS type,
  c."code" AS account_code,
  c."name" AS account_name,
  CASE 
    WHEN m."memoType" = 'CREDIT' and m."isReversal" = false THEN 'CREDIT_MEMO'
    WHEN m."memoType" = 'DEBIT' and m."isReversal" = false THEN 'DEBIT_MEMO' 
    WHEN m."memoType" = 'CREDIT' and m."isReversal" = true THEN 'CREDIT_MEMO_REVERSAL'
    ELSE 'DEBIT_MEMO_REVERSAL'
  END AS transaction_type,
  m."memoNo" AS reference,
  m."date" AS date,

  /* DEBIT LOGIC */
  CASE 
    WHEN m."memoType" = 'DEBIT' AND m."isReversal" = false THEN m."amount"
    WHEN m."memoType" = 'CREDIT' AND m."isReversal" = true THEN m."amount"
    ELSE 0
  END AS debit,

  /* CREDIT LOGIC */
  CASE 
    WHEN m."memoType" = 'CREDIT' AND m."isReversal" = false THEN m."amount"
    WHEN m."memoType" = 'DEBIT' AND m."isReversal" = true THEN m."amount"
    ELSE 0
  END AS credit,

  m."amount" AS amount,
  COALESCE(m."description", 'Memo') AS description

FROM memo m
INNER JOIN customers c ON m."customerId" = c.id
WHERE c.id = $1
  AND m."date" >= $2
  AND m."date" < ($3 + INTERVAL '1 day')


ORDER BY date, transaction_type, reference;
;
    `,
      customerId,
      newFromDate,
      newToDate,
    );

    //  Totals
    const totalSales = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );
    const totalPayments = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );
    const closingBalance = openingBalance + totalSales - totalPayments;

    return {
      openingBalance,
      entries,
      totals: {
        totalSales,
        totalPayments,
        closingBalance,
      },
    };
  }

  async getVendorLedger(fromDate: Date, toDate: Date, vendorId: string) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    //  Opening Balance before period
    const opening = await prisma.$queryRawUnsafe<{ balance: number }[]>(
      `
    SELECT COALESCE(SUM(x.balance), 0) AS balance
FROM (

    /* PURCHASES */
    SELECT p."totalAmount" AS balance
    FROM purchases p
    WHERE p."vendorId" = $1
      AND p."orderDate" < $2
      AND p."status" != 'DRAFT'

    UNION ALL

    /* PAYMENTS (AP 2000) */
    SELECT -SUM(vpl."lineAmount")
    FROM vendor_payments vp
    INNER JOIN vendor_payment_lines vpl
        ON vpl."vendorPaymentId" = vp.id
    INNER JOIN chart_of_accounts coa
        ON coa.id = vpl."glAccountId"
       AND coa.code = '2000'
    WHERE vp."vendorId" = $1
      AND vp.status = 'PAID'
      AND vp."paymentDate" < $2

    UNION ALL

    /* PURCHASE REFUNDS */
    SELECT -pr."amount"
    FROM purchase_refunds pr
    WHERE pr."vendorId" = $1
      AND pr."refundDate" < $2

    UNION ALL

    /* DEBIT MEMOS (reduce AP) */
    SELECT -m."amount"
    FROM memo m
    WHERE m."vendorId" = $1
      AND m."memoType" = 'DEBIT'
      AND m."date" < $2

    UNION ALL

    /* CREDIT MEMOS (increase AP) */
    SELECT m."amount"
    FROM memo m
    WHERE m."vendorId" = $1
      AND m."memoType" = 'CREDIT'
      AND m."date" < $2

) x;

    `,
      vendorId,
      newFromDate,
    );

    const openingBalance = Number(opening[0]?.balance || 0);

    //  Ledger entries in period
    const entries = await prisma.$queryRawUnsafe<
      {
        type: string;
        account_code: string;
        account_name: string;
        transaction_type: string;
        reference: string;
        date: Date;
        debit: number;
        credit: number;
        balance: number;
        description: string;
      }[]
    >(
      `
    /* ---------------- PURCHASE INVOICES ---------------- */
SELECT 
    'VENDOR' AS type,
    v."code" AS account_code,
    v."name" AS account_name,
    'PURCHASE' AS transaction_type,
    p."orderNo" AS reference,
    p."orderDate" AS date,
    0 AS debit,
    p."totalAmount" AS credit,
    p."totalAmount" AS balance,
    'Purchase Invoice' AS description
FROM purchases p
INNER JOIN vendors v ON p."vendorId" = v."id"
WHERE v."id" = $1
  AND p."orderDate" >= $2
  AND p."orderDate" < ($3 + INTERVAL '1 day')
  AND p."status" IN ('INVOICED', 'PAID', 'PARTIALLY_PAID', 'RETURNED')

UNION ALL

/* ---------------- PAYMENTS (ACCOUNTS PAYABLE – CODE 2000) ---------------- */
SELECT 
    'VENDOR' AS type,
    v."code" AS account_code,
    v."name" AS account_name,
    'PAYMENT' AS transaction_type,
    vp."paymentNo" AS reference,
    vp."paymentDate" AS date,
    SUM(vpl."lineAmount") AS debit,
    0 AS credit,
    -SUM(vpl."lineAmount") AS balance,
    CONCAT('Payment made ', COALESCE(vp."reference", '')) AS description
FROM vendor_payments vp
INNER JOIN vendor_payment_lines vpl
    ON vpl."vendorPaymentId" = vp.id
INNER JOIN chart_of_accounts coa
    ON coa.id = vpl."glAccountId"
   AND coa.code = '2000'                  -- Accounts Payable
INNER JOIN vendors v
    ON vp."vendorId" = v."id"
WHERE v."id" = $1
  AND vp.status = 'PAID'
  AND vp."paymentDate" >= $2
  AND vp."paymentDate" < ($3 + INTERVAL '1 day')
GROUP BY vp.id, v."code", v."name"

UNION ALL

/* ---------------- PURCHASE REFUNDS / CREDIT NOTES ---------------- */
SELECT 
    'VENDOR' AS type,
    v."code" AS account_code,
    v."name" AS account_name,
    'REFUND' AS transaction_type,
    pr."refundNo" AS reference,
    pr."refundDate" AS date,
    pr."amount" AS debit,
    0 AS credit,
    -pr."amount" AS balance,
    CONCAT('Refund issued ', COALESCE(pr."reference", '')) AS description
FROM purchase_refunds pr
INNER JOIN vendors v ON pr."vendorId" = v."id"
WHERE v."id" = $1
  AND pr."refundDate" >= $2
  AND pr."refundDate" < ($3 + INTERVAL '1 day')

  UNION ALL

SELECT 
    'VENDOR' AS type,
    v."code" AS account_code,
    v."name" AS account_name,
    'DEBIT_MEMO' AS transaction_type,
    m."memoNo" AS reference,
    m."date" AS date,
    m."amount" AS debit,
    0 AS credit,
    -m."amount" AS balance,
    m."description" AS description
FROM memo m
INNER JOIN vendors v ON m."vendorId" = v."id"
WHERE v."id" = $1
  AND m."memoType" = 'DEBIT'
  AND m."date" >= $2
  AND m."date" < ($3 + INTERVAL '1 day')

  UNION ALL

SELECT 
    'VENDOR' AS type,
    v."code" AS account_code,
    v."name" AS account_name,
    'CREDIT_MEMO' AS transaction_type,
    m."memoNo" AS reference,
    m."date" AS date,
    0 AS debit,
    m."amount" AS credit,
    m."amount" AS balance,
    m."description" AS description
FROM memo m
INNER JOIN vendors v ON m."vendorId" = v."id"
WHERE v."id" = $1
  AND m."memoType" = 'CREDIT'
  AND m."date" >= $2
  AND m."date" < ($3 + INTERVAL '1 day')


ORDER BY date, transaction_type, reference;
    `,
      vendorId,
      newFromDate,
      newToDate,
    );

    //  Totals
    const totalPurchases = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );
    const totalPayments = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );
    // const netMovement = entries.reduce(
    //   (sum, e) => sum + Number(e.debit || 0) - Number(e.credit || 0),
    //   0,
    // );

    // const closingBalance = openingBalance + netMovement;

    const totalDebits = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );

    const totalCredits = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );

    const closingBalance = openingBalance + totalCredits - totalDebits;

    return {
      openingBalance,
      entries,
      totals: {
        totalPurchases,
        totalPayments,
        closingBalance,
      },
    };
  }

  async getVendorBalances(asOfDate: Date) {
    const newAsOfDate = endOfDayUTC(asOfDate);
    const result = await prisma.$queryRawUnsafe<
      {
        vendor_id: string;
        vendor_code: string;
        vendor_name: string;
        total_purchases: number;
        total_payments: number;
        // total_refunds: number;
        outstanding_balance: number;
      }[]
    >(
      `
    SELECT 
    v.id   AS vendor_id,
    v.code AS vendor_code,
    v.name AS vendor_name,

    COALESCE(p.total_purchases, 0) AS total_purchases,
    COALESCE(pay.total_payments, 0) AS total_payments,
    COALESCE(r.total_refunds, 0) AS total_refunds,
    COALESCE(dm.total_debit_memos, 0) AS total_debit_memos,
    COALESCE(cm.total_credit_memos, 0) AS total_credit_memos,

    COALESCE(p.total_purchases, 0)
      - COALESCE(pay.total_payments, 0)
      - COALESCE(r.total_refunds, 0)
      - COALESCE(dm.total_debit_memos, 0)
      + COALESCE(cm.total_credit_memos, 0)
      AS outstanding_balance

FROM vendors v

/* PURCHASES */
LEFT JOIN (
    SELECT 
        "vendorId",
        SUM("totalAmount") AS total_purchases
    FROM purchases
    WHERE "orderDate" <= $1
      AND status IN ('INVOICED', 'PAID', 'PARTIALLY_PAID', 'RETURNED')
    GROUP BY "vendorId"
) p ON p."vendorId" = v.id

/* PAYMENTS */
LEFT JOIN (
    SELECT 
        vp."vendorId",
        SUM(vpl."lineAmount") AS total_payments
    FROM vendor_payments vp
    INNER JOIN vendor_payment_lines vpl
        ON vpl."vendorPaymentId" = vp.id
    INNER JOIN chart_of_accounts coa
        ON coa.id = vpl."glAccountId"
       AND coa.code = '2000'
    WHERE vp.status IN ('PAID', 'PARTIALLY_PAID', 'RETURNED', 'INVOICED')
      AND vp."paymentDate" <= $1
    GROUP BY vp."vendorId"
) pay ON pay."vendorId" = v.id

/* REFUNDS */
LEFT JOIN (
    SELECT 
        "vendorId",
        SUM("amount") AS total_refunds
    FROM purchase_refunds
    WHERE "refundDate" <= $1
    GROUP BY "vendorId"
) r ON r."vendorId" = v.id

/* DEBIT MEMOS */
LEFT JOIN (
    SELECT
        "vendorId",
        SUM("amount") AS total_debit_memos
    FROM memo
    WHERE "memoType" = 'DEBIT'
      AND "date" <= $1
      AND "vendorId" IS NOT NULL
    GROUP BY "vendorId"
) dm ON dm."vendorId" = v.id

/* CREDIT MEMOS */
LEFT JOIN (
    SELECT
        "vendorId",
        SUM("amount") AS total_credit_memos
    FROM memo
    WHERE "memoType" = 'CREDIT'
      AND "date" <= $1
    GROUP BY "vendorId"
) cm ON cm."vendorId" = v.id

ORDER BY v.name;


  `,
      newAsOfDate,
    );

    // console.log("Vendor Balances Result:", result);
    return result;
  }

  async getCashFlow(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    // Get cash account transactions
    const cashTransactions = await prisma.cashTransaction.findMany({
      where: {
        transactionDate: {
          gte: newFromDate,
          lte: newToDate,
        },
      },
      include: {
        cashAccount: {
          select: { name: true, accountType: true },
        },
      },
      orderBy: { transactionDate: "asc" },
    });

    // Categorize cash flows
    const operatingActivities: any[] = [];
    const investingActivities: any[] = [];
    const financingActivities: any[] = [];

    let operatingCashFlow = 0;
    let investingCashFlow = 0;
    let financingCashFlow = 0;

    cashTransactions.forEach((transaction) => {
      const amount =
        transaction.transactionType === "RECEIPT"
          ? transaction.amount.toNumber()
          : -transaction.amount.toNumber();

      // Categorize based on description or reference type
      if (
        transaction.refType === "SALES_RECEIPT" ||
        transaction.description?.toLowerCase().includes("sales")
      ) {
        operatingActivities.push({
          description: transaction.description,
          amount,
          date: transaction.transactionDate,
        });
        operatingCashFlow += amount;
      } else if (
        transaction.refType === "PURCHASE_PAYMENT" ||
        transaction.description?.toLowerCase().includes("purchase")
      ) {
        operatingActivities.push({
          description: transaction.description,
          amount,
          date: transaction.transactionDate,
        });
        operatingCashFlow += amount;
      } else {
        // Default to operating for now
        operatingActivities.push({
          description: transaction.description,
          amount,
          date: transaction.transactionDate,
        });
        operatingCashFlow += amount;
      }
    });

    const netCashFlow =
      operatingCashFlow + investingCashFlow + financingCashFlow;

    return {
      fromDate,
      toDate,
      operatingActivities,
      investingActivities,
      financingActivities,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
    };
  }

  // Operational Reports

  async getProductionSummary(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    const result = await prisma.productionOrder.groupBy({
      by: ["itemId"],
      where: {
        status: "FINISHED",
        finishedAt: {
          gte: newFromDate,
          lte: newToDate,
        },
      },
      _sum: {
        qtyProduced: true,
      },
    });

    // Then join with items to get names
    const resultWithNames = await Promise.all(
      result.map(async (group, index) => {
        const item = await prisma.item.findUnique({
          where: { id: group.itemId },
          select: { name: true },
        });
        return {
          no: index + 1,
          name: item?.name,
          CumProduction: group._sum.qtyProduced,
        };
      }),
    );
    return resultWithNames;
  }

  // Production Report
  async getProductionReport(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    const orders = await prisma.productionOrder.findMany({
      where: {
        status: "FINISHED",
        finishedAt: {
          gte: newFromDate,
          lte: newToDate,
        },
      },
      include: {
        item: {
          select: { name: true },
        },
      },
      orderBy: [{ finishedAt: "asc" }, { item: { name: "asc" } }],
    });

    return orders.map((order, index) => ({
      no: index + 1,
      ProductionDate: order.finishedAt
        ? order.finishedAt.toISOString().split("T")[0]
        : "",
      name: order.item?.name ?? "",
      qtyProduced: order.qtyProduced,
    }));
  }

  async getMaterialUsage(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);

    const results = await prisma.inventoryLedger.findMany({
      where: {
        direction: "OUT",
        refType: "PRODUCTION",
        postedAt: {
          gte: newFromDate,
          lte: newToDate,
        },
      },
      include: {
        item: {
          select: { name: true },
        },
      },
      orderBy: [{ postedAt: "asc" }, { item: { name: "asc" } }],
      take: 100,
    });

    // format output to match your SQL result
    return results.map((r, ind) => ({
      no: ind + 1,
      PostedDate: r.postedAt.toISOString().split("T")[0], // like SQL DATE()
      name: r.item.name,
      refType: r.refType,
      qty: r.qty,
    }));
  }

  async getInventoryAging(asOfDate: Date, warehouseId?: string) {
    const newAsOfDate = endOfDayUTC(asOfDate);
    const where: any = {
      postedAt: { lte: newAsOfDate },
    };
    if (warehouseId) where.warehouseId = warehouseId;

    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where,
      include: {
        item: {
          select: { sku: true, name: true, type: true },
        },
        warehouse: {
          select: { code: true, name: true },
        },
      },
      orderBy: { postedAt: "asc" },
    });

    // Group by item and calculate aging
    const agingMap = new Map();
    const currentDate = new Date(newAsOfDate);

    ledgerEntries.forEach((entry) => {
      const key = `${entry.itemId}-${entry.warehouseId}`;
      if (!agingMap.has(key)) {
        agingMap.set(key, {
          item: entry.item,
          warehouse: entry.warehouse,
          qty: 0,
          value: 0,
          avgAge: 0,
          batches: [],
        });
      }

      const aging = agingMap.get(key);
      if (entry.direction === "IN") {
        const daysSinceReceived = Math.floor(
          (currentDate.getTime() - entry.postedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        aging.batches.push({
          qty: entry.qty.toNumber(),
          value: entry.value.toNumber(),
          age: daysSinceReceived,
          receivedDate: entry.postedAt,
        });
      }
    });

    // Calculate aging buckets
    const agingReport = Array.from(agingMap.values()).map((item) => {
      const totalQty = item.batches.reduce(
        (sum: number, batch: any) => sum + batch.qty,
        0,
      );
      const totalValue = item.batches.reduce(
        (sum: number, batch: any) => sum + batch.value,
        0,
      );

      const aging0to30 = item.batches
        .filter((b: any) => b.age <= 30)
        .reduce((sum: number, b: any) => sum + b.value, 0);
      const aging31to60 = item.batches
        .filter((b: any) => b.age > 30 && b.age <= 60)
        .reduce((sum: number, b: any) => sum + b.value, 0);
      const aging61to90 = item.batches
        .filter((b: any) => b.age > 60 && b.age <= 90)
        .reduce((sum: number, b: any) => sum + b.value, 0);
      const agingOver90 = item.batches
        .filter((b: any) => b.age > 90)
        .reduce((sum: number, b: any) => sum + b.value, 0);

      return {
        item: item.item,
        warehouse: item.warehouse,
        totalQty,
        totalValue,
        aging0to30,
        aging31to60,
        aging61to90,
        agingOver90,
      };
    });

    return agingReport;
  }

  async getStockCard(
    itemId: string,
    warehouseId?: string,
    fromDate?: Date,
    toDate?: Date,
  ) {
    const newFromDate = fromDate ? startOfDayUTC(fromDate) : undefined;
    const newToDate = toDate ? endOfDayUTC(toDate) : undefined;

    const where: any = { itemId };
    if (warehouseId) where.warehouseId = warehouseId;
    if (newFromDate || newToDate) {
      where.postedAt = {};
      if (newFromDate) where.postedAt.gte = newFromDate;
      if (newToDate) where.postedAt.lte = newToDate;
    }

    const entries = await prisma.inventoryLedger.findMany({
      where,
      include: {
        item: {
          select: { sku: true, name: true, uom: true },
        },
        warehouse: {
          select: { code: true, name: true },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { postedAt: "asc" },
    });

    return entries.map((entry) => ({
      date: entry.postedAt,
      refType: entry.refType,
      refId: entry.refId,
      direction: entry.direction,
      qty: entry.qty.toNumber(),
      unitCost: entry.unitCost.toNumber(),
      value: entry.value.toNumber(),
      runningQty: entry.runningQty.toNumber(),
      runningValue: entry.runningValue.toNumber(),
      runningAvgCost: entry.runningAvgCost.toNumber(),
      user: entry.user?.name || "System",
    }));
  }

  async getProductionVariance(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    const productionOrders = await prisma.productionOrder.findMany({
      where: {
        createdAt: {
          gte: newFromDate,
          lte: newToDate,
        },
        status: { in: ["FINISHED", "CLOSED"] },
      },
      include: {
        item: {
          select: { sku: true, name: true, standardCost: true },
        },
        bom: {
          include: {
            bomLines: {
              include: {
                componentItem: {
                  select: { sku: true, name: true, standardCost: true },
                },
              },
            },
          },
        },
        wipLedger: true,
      },
    });

    const varianceReport = productionOrders.map((order) => {
      // Calculate standard cost
      let standardMaterialCost = 0;
      if (order.bom) {
        standardMaterialCost = order.bom.bomLines.reduce((sum, line) => {
          const componentCost =
            line.componentItem.standardCost?.toNumber() || 0;
          return (
            sum +
            line.qtyPer.toNumber() *
              componentCost *
              order.qtyProduced.toNumber()
          );
        }, 0);
      }

      // Calculate actual costs
      const actualMaterialCost = order.wipLedger
        .filter((w) => w.type === "ISSUE")
        .reduce((sum, w) => sum + w.amount.toNumber(), 0);

      const actualLaborCost = order.wipLedger
        .filter((w) => w.type === "LABOR")
        .reduce((sum, w) => sum + w.amount.toNumber(), 0);

      const actualOverheadCost = order.wipLedger
        .filter((w) => w.type === "OVERHEAD")
        .reduce((sum, w) => sum + w.amount.toNumber(), 0);

      const totalActualCost =
        actualMaterialCost + actualLaborCost + actualOverheadCost;
      const totalStandardCost = standardMaterialCost; // Add standard labor and overhead if available

      return {
        orderNo: order.orderNo,
        item: order.item,
        qtyProduced: order.qtyProduced.toNumber(),
        standardMaterialCost,
        actualMaterialCost,
        materialVariance: actualMaterialCost - standardMaterialCost,
        actualLaborCost,
        actualOverheadCost,
        totalActualCost,
        totalStandardCost,
        totalVariance: totalActualCost - totalStandardCost,
      };
    });

    return varianceReport;
  }

  async getSalesByItem(fromDate: Date, toDate: Date, itemId?: string) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    console.log("Getting sales by item with params:", {
      fromDate: newFromDate,
      toDate: newToDate,
      itemId,
    });

    //Get Item ID if item code or name is provided
    // let itemId: string | undefined = undefined;
    // if (item) {
    //   const foundItem = await prisma.item.findFirst({
    //     where: {
    //       OR: [{ sku: item }, { name: item }],
    //     },
    //   });
    //   itemId = foundItem?.id;
    // }

    const sales = await prisma.sale.findMany({
      where: {
        orderDate: {
          gte: newFromDate,
          lte: newToDate,
        },
        status: { in: ["DELIVERED", "INVOICED", "PAID"] },
      },
      include: {
        saleLines: {
          where: itemId !== "undefined" ? { itemId: itemId } : undefined,
          include: {
            item: {
              select: { sku: true, name: true, type: true },
            },
          },
        },
      },
    });

    const itemSalesMap = new Map();

    sales.forEach((sale) => {
      sale.saleLines.forEach((line) => {
        const key = line.itemId;
        if (!itemSalesMap.has(key)) {
          itemSalesMap.set(key, {
            item: line.item,
            totalQty: 0,
            totalValue: 0,
            orderCount: 0,
          });
        }

        const itemSales = itemSalesMap.get(key);
        itemSales.totalQty += line.qty.toNumber();
        itemSales.totalValue += line.lineTotal.toNumber();
        itemSales.orderCount += 1;
      });
    });

    return Array.from(itemSalesMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );
  }

  async getSalesByCustomer(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    const sales = await prisma.sale.findMany({
      where: {
        orderDate: {
          gte: newFromDate,
          lte: newToDate,
        },
        status: { in: ["DELIVERED", "INVOICED", "PAID"] },
      },
      include: {
        customer: {
          select: { code: true, name: true },
        },
      },
    });

    const customerSalesMap = new Map();

    sales.forEach((sale) => {
      const key = sale.customerId;
      if (!customerSalesMap.has(key)) {
        customerSalesMap.set(key, {
          customer: sale.customer,
          totalValue: 0,
          orderCount: 0,
          avgOrderValue: 0,
        });
      }

      const customerSales = customerSalesMap.get(key);
      customerSales.totalValue += sale.totalAmount.toNumber();
      customerSales.orderCount += 1;
      customerSales.avgOrderValue =
        customerSales.totalValue / customerSales.orderCount;
    });

    return Array.from(customerSalesMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );
  }

  async getPurchasesByVendor(fromDate: Date, toDate: Date) {
    const newToDate = endOfDayUTC(toDate);
    const newFromDate = startOfDayUTC(fromDate);
    const purchases = await prisma.purchase.findMany({
      where: {
        orderDate: {
          gte: newFromDate,
          lte: newToDate,
        },
        status: { in: ["RECEIVED", "INVOICED", "PAID"] },
      },
      include: {
        vendor: {
          select: { code: true, name: true },
        },
      },
    });

    const vendorPurchasesMap = new Map();

    purchases.forEach((purchase) => {
      const key = purchase.vendorId;
      if (!vendorPurchasesMap.has(key)) {
        vendorPurchasesMap.set(key, {
          vendor: purchase.vendor,
          totalValue: 0,
          orderCount: 0,
          avgOrderValue: 0,
        });
      }

      const vendorPurchases = vendorPurchasesMap.get(key);
      vendorPurchases.totalValue += purchase.totalAmount.toNumber();
      vendorPurchases.orderCount += 1;
      vendorPurchases.avgOrderValue =
        vendorPurchases.totalValue / vendorPurchases.orderCount;
    });

    return Array.from(vendorPurchasesMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );
  }

  async getArApAging(asOfDate: Date, type: "AR" | "AP") {
    const newAsOfDate = endOfDayUTC(asOfDate);
    if (type === "AR") {
      // Accounts Receivable Aging
      const invoicedSales = await prisma.sale.findMany({
        where: {
          status: { in: ["INVOICED"] },
          orderDate: { lte: newAsOfDate },
        },
        include: {
          customer: {
            select: { code: true, name: true },
          },
          salesReceipts: {
            select: { amountReceived: true },
          },
          SalesRefunds: {
            select: { amountRefunded: true },
          },
        },
      });

      return invoicedSales
        .map((sale) => {
          const totalReceived = sale.salesReceipts.reduce(
            (sum, receipt) => sum + receipt.amountReceived.toNumber(),
            0,
          );
          const totalRefunded = sale.SalesRefunds.reduce(
            (sum, refund) => sum + refund.amountRefunded.toNumber(),
            0,
          );
          const outstandingAmount =
            sale.totalAmount.toNumber() - totalReceived + totalRefunded;
          const daysPastDue = Math.floor(
            (newAsOfDate.getTime() - sale.orderDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          return {
            customer: sale.customer,
            orderNo: sale.orderNo,
            orderDate: sale.orderDate,
            totalAmount: sale.totalAmount.toNumber(),
            amountReceived: totalReceived,
            AmountRefunded: totalRefunded,
            outstandingAmount,
            daysPastDue,
            agingBucket:
              daysPastDue <= 30
                ? "Current"
                : daysPastDue <= 60
                  ? "31-60 Days"
                  : daysPastDue <= 90
                    ? "61-90 Days"
                    : "Over 90 Days",
          };
        })
        .filter((item) => item.outstandingAmount > 0);
    } else {
      // Accounts Payable Aging
      const invoicedPurchases = await prisma.purchase.findMany({
        where: {
          status: { in: ["INVOICED", "PARTIALLY_PAID"] },
          orderDate: { lte: newAsOfDate },
        },
        include: {
          vendor: {
            select: { code: true, name: true, paymentTerms: true },
          },
          // VendorPayments: {
          //   select: { totalAmount: true }
          // }
          // ,
          PurchaseRefunds: {
            select: { amount: true },
          },
        },
      });

      return invoicedPurchases
        .map((purchase) => {
          //const totalPaid = purchase.reduce((sum, payment) => sum + payment.amountPaid.toNumber(), 0);
          const totalRefunds = purchase.PurchaseRefunds.reduce(
            (sum, refund) => sum + refund.amount.toNumber(),
            0,
          );
          const outstandingAmount =
            purchase.balanceAmount.toNumber() + totalRefunds;
          const daysPastDue = Math.floor(
            (newAsOfDate.getTime() - purchase.orderDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          return {
            vendor: purchase.vendor,
            orderNo: purchase.orderNo,
            orderDate: purchase.orderDate,
            totalAmount: purchase.totalAmount.toNumber(),
            //amountPaid: totalPaid,
            amountRefunded: totalRefunds,
            outstandingAmount,
            daysPastDue,
            agingBucket:
              daysPastDue <= 30
                ? "Current"
                : daysPastDue <= 60
                  ? "31-60 Days"
                  : daysPastDue <= 90
                    ? "61-90 Days"
                    : "Over 90 Days",
          };
        })
        .filter((item) => item.outstandingAmount > 0);
    }
  }
}
