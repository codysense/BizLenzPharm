import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  PieChart,
  Users,
  Building,
  Clock,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  reportsApi,
  inventoryApi,
  salesApi,
  purchaseApi,
  productionApi,
  managementApi,
} from "../lib/api";
import { DataTable } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { ReportExporter } from "../utils/reportExport";
import toast from "react-hot-toast";
import { CustomerSelect } from "../components/CustomerSelect";
import { VendorSelect } from "../components/VendorSelect";
import { ChartAccountSelect } from "../components/ChartAccountSelect";
import { GenericSearchSelect } from "../components/GenericSearchCombo";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [usersFilter, setUsersFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [remoteItem, setRemoteItem] = useState<T | null>(null);

  // Get filter options
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-reports"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: items } = useQuery({
    queryKey: ["items-for-reports"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  // const { data: customers } = useQuery({
  //   queryKey: ['customers-for-reports'],
  //   queryFn: () => salesApi.getCustomers({ limit: 100 })
  // });

  // const { data: vendors } = useQuery({
  //   queryKey: ['vendors-for-reports'],
  //   queryFn: () => purchaseApi.getVendors({ limit: 100 })
  // });

  const { data: accounts } = useQuery({
    queryKey: ["accounts-forreports"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  // console.log(accounts)

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => managementApi.getUsersWithDetails({ limit: 100 }),
  });

  // console.log(allUsers)

  // const posUsers = allUsers.filter(user =>
  //   Array.isArray(user.userRoles)
  //     ? user.userRoles.includes('POS Users') // if it's an array
  //     : user.userRoles === 'POS Users'       // if it's a single string
  // );

  //Map item for Search component
  const mappedItems =
    items?.items?.map((item: any) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
    })) || [];

  const searchItemRemote = async (query: string) => {
    const res = await inventoryApi.getItems({
      search: query,
      limit: 1,
    });

    const item = res?.items?.[0];

    if (!item) return null;

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
    };
  };

  const reports = [
    // Financial Reports
    {
      id: "balance-sheet",
      name: "Balance Sheet",
      description: "Assets, liabilities, and equity at a specific date",
      icon: FileText,
      category: "Financial",
      requiresDateRange: true,
    },
    {
      id: "profit-loss",
      name: "Profit & Loss Statement",
      description: "Revenue and expense summary for a period",
      icon: TrendingUp,
      category: "Financial",
      requiresDateRange: true,
    },
    {
      id: "trial-balance",
      name: "Trial Balance",
      description: "All account balances at a specific date",
      icon: BarChart3,
      category: "Financial",
      requiresDateRange: true,
    },
    {
      id: "general-ledger",
      name: "General Ledger",
      description: "Detailed journal entries for all accounts",
      icon: FileText,
      category: "Financial",
      requiresDateRange: true,
      supportAccount: true,
    },
    {
      id: "cash-flow",
      name: "Cash Flow Statement",
      description: "Cash receipts and payments analysis",
      icon: DollarSign,
      category: "Financial",
      requiresDateRange: true,
    },

    {
      id: "vendor-balances",
      name: "Vendor Balances",
      description:
        "List of Vendors with their Outstanding balnces as of Particular",
      icon: DollarSign,
      category: "Financial",
      requiresAsOfDate: true,
    },
    {
      id: "vendor-ledger",
      name: "Vendor Ledger",
      description: "Vendor Statment of Account",
      icon: DollarSign,
      category: "Financial",
      requiresDateRange: true,
      supportVendors: true,
    },
    {
      id: "cashAccount-balances",
      name: "CashAcount Balances",
      description:
        "Summary of Cash and Bank accounts balanes and total trnsactions",
      icon: DollarSign,
      category: "Financial",
      requiresDateRange: true,
    },
    {
      id: "customer-balances",
      name: "Customer Balances",
      description:
        "List of Customers with their Outstanding balnces as of Particular",
      icon: DollarSign,
      category: "Financial",
      requiresAsOfDate: true,
    },
    {
      id: "customer-ledger",
      name: "Customer Ledger",
      description: "Customer Statment of Account",
      icon: DollarSign,
      category: "Financial",
      requiresDateRange: true,
      supportCustomers: true,
    },

    // Operational Reports
    {
      id: "inventory-valuation",
      name: "Inventory Valuation Report",
      description: "Current inventory values by item and warehouse",
      icon: Package,
      category: "Operational",
    },
    {
      id: "inventory-aging",
      name: "Inventory Aging Report",
      description: "Age analysis of inventory items",
      icon: Clock,
      category: "Operational",
      requiresAsOfDate: true,
      supportsWarehouse: true,
    },
    {
      id: "stock-card",
      name: "Stock Card Report",
      description: "Detailed movement history for specific items",
      icon: Package,
      category: "Operational",
      requiresItem: true,
      supportsWarehouse: true,
      supportsDateRange: true,
    },
    {
      id: "wip-summary",
      name: "Work in Progress Summary",
      description: "Manufacturing costs and WIP balances",
      icon: BarChart3,
      category: "Operational",
    },
    {
      id: "production-variance",
      name: "Production Variance Report",
      description: "Standard vs actual production costs",
      icon: AlertTriangle,
      category: "Operational",
      requiresDateRange: true,
    },
    {
      id: "sales-by-item",
      name: "Sales by Item Report",
      description: "Sales performance analysis by product",
      icon: PieChart,
      category: "Operational",
      requiresDateRange: true,
      requiresItem: true,
    },
    {
      id: "pos-sales",
      name: "POS Sales Report",
      description: "Detail POS Sales for all terminals",
      icon: Calendar,
      category: "Operational",
      requiresDateRange: true,
      supportsWarehouse: true,
      supportUsers: true,
    },
    {
      id: "sales-by-customer",
      name: "Sales by Customer Report",
      description: "Customer sales analysis and performance",
      icon: Users,
      category: "Operational",
      requiresDateRange: true,
    },
    {
      id: "purchases-by-vendor",
      name: "Purchases by Vendor Report",
      description: "Vendor purchase analysis and performance",
      icon: Building,
      category: "Operational",
      requiresDateRange: true,
    },
    {
      id: "ar-aging",
      name: "Accounts Receivable Aging",
      description: "Outstanding customer balances by age",
      icon: CreditCard,
      category: "Operational",
      requiresAsOfDate: true,
    },
    {
      id: "ap-aging",
      name: "Accounts Payable Aging",
      description: "Outstanding vendor balances by age",
      icon: CreditCard,
      category: "Operational",
      requiresAsOfDate: true,
    },
    {
      id: "production-summary",
      name: "Production Summary by Product",
      description: "Item Produced by Product with a period",
      icon: CreditCard,
      category: "Operational",
      requiresDateRange: true,
    },
    {
      id: "production-report",
      name: "Detail Production Report by Product ",
      description: "Details of Item Produced wthin a period",
      icon: CreditCard,
      category: "Operational",
      requiresDateRange: true,
    },
    {
      id: "material-usage",
      name: "Material Usage Detail",
      description: "Total Material usage summary by Item",
      icon: CreditCard,
      category: "Operational",
      requiresDateRange: true,
    },
  ];

  const categories = [...new Set(reports.map((r) => r.category))];

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      alert("Please select a report to generate");
      return;
    }

    const report = reports.find((r) => r.id === selectedReport);
    if (!report) return;

    setLoading(true);
    try {
      let data;

      switch (selectedReport) {
        case "balance-sheet":
          data = await reportsApi.getBalanceSheet({ dateFrom, dateTo });
          break;
        case "profit-loss":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getProfitAndLoss({ dateFrom, dateTo });
          break;
        case "cashAccount-balances":
          if (!dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getCashAccountBalances({ dateFrom, dateTo });
          break;
        case "pos-sales":
          // if (!dateFrom || !dateTo) {
          //   alert('Please select date range');
          //   return;
          // }
          // console.log(dateFrom,dateTo, warehouseFilter, usersFilter)
          data = await reportsApi.getPOSSalesReport({
            dateFrom,
            dateTo,
            warehouseId: warehouseFilter,
            userId: usersFilter,
          });
          break;
        case "trial-balance":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getTrialBalance({ dateFrom, dateTo });
          break;
        case "general-ledger":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getGeneralLedger({
            dateFrom,
            dateTo,
            accountId: accountFilter,
          });
          break;
        case "cash-flow":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getCashFlow({ dateFrom, dateTo });
          break;
        case "inventory-valuation":
          data = await inventoryApi.getInventoryValuation(
            warehouseFilter ? { warehouseId: warehouseFilter } : undefined,
          );
          break;
        case "inventory-aging":
          data = await reportsApi.getInventoryAging({
            asOfDate,
            ...(warehouseFilter && { warehouseId: warehouseFilter }),
          });
          break;
        case "stock-card":
          if (!itemFilter) {
            alert("Please select an item");
            return;
          }
          data = await reportsApi.getStockCard({
            itemId: itemFilter,
            ...(warehouseFilter && { warehouseId: warehouseFilter }),
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
          });
          break;
        case "customer-ledger":
          if (!customerId) {
            alert("Please select a customer");
            return;
          }
          if (!dateFrom || !dateTo) {
            alert("Please select date range");

            return;
          }
          data = await reportsApi.getCustomerLedger({
            dateFrom,
            dateTo,
            customerId: customerId,
          });
          break;
        case "vendor-ledger":
          if (!vendorFilter) {
            alert("Please select a vendor");
            return;
          }
          if (!dateFrom || !dateTo) {
            alert("Please select date range");

            return;
          }
          data = await reportsApi.getVendorLedger({
            dateFrom,
            dateTo,
            vendorId: vendorFilter,
          });
          break;

        case "wip-summary":
          data = await productionApi.getWipSummary();
          break;
        case "production-variance":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getProductionVariance({ dateFrom, dateTo });
          break;
        case "sales-by-item":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getSalesByItem({
            dateFrom,
            dateTo,
            //mark itemID as optional

            itemId: itemFilter || undefined,
          });
          break;
        case "sales-by-customer":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getSalesByCustomer({ dateFrom, dateTo });
          break;
        case "purchases-by-vendor":
          if (!dateFrom || !dateTo) {
            alert("Please select date range");
            return;
          }
          data = await reportsApi.getPurchasesByVendor({ dateFrom, dateTo });
          break;
        case "ar-aging":
          data = await reportsApi.getArApAging({ asOfDate, type: "AR" });
          break;
        case "ap-aging":
          data = await reportsApi.getArApAging({ asOfDate, type: "AP" });
          break;
        case "production-summary":
          data = await reportsApi.getProductionSummary({ dateFrom, dateTo });
          break;
        case "production-report":
          data = await reportsApi.getProductionReport({ dateFrom, dateTo });
          break;
        case "material-usage":
          data = await reportsApi.getMaterialUsage({ dateFrom, dateTo });
          break;
        case "vendor-balances":
          data = await reportsApi.getVendorBalances({ asOfDate });
          break;
        case "customer-balances":
          data = await reportsApi.getCustomerBalances({ asOfDate });
          break;
        default:
          alert("Report not implemented yet");
          return;
      }

      setReportData(data);
    } catch (error) {
      console.error("Generate report error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (format: "pdf" | "xlsx" | "csv") => {
    if (!reportData) {
      toast.error("Please generate a report first");
      return;
    }

    const report = reports.find((r) => r.id === selectedReport);
    if (!report) return;

    try {
      switch (selectedReport) {
        case "balance-sheet":
          ReportExporter.exportBalanceSheet(reportData, format);
          break;
        case "profit-loss":
          ReportExporter.exportProfitLoss(reportData, format);
          break;
        case "trial-balance": {
          const trialBalanceColumns = [
            { key: "accountCode", header: "Account Code", width: "w-32" },
            { key: "accountName", header: "Account Name", width: "w-48" },
            { key: "accountType", header: "Type", width: "w-32" },
            {
              key: "debits",
              header: "Debits",
              cell: (item: any) => {
                // All accounts: positive balance goes to debit
                const value = item.balance >= 0 ? item.balance : 0;
                return value > 0 ? `₦${Number(value).toLocaleString()}` : "-";
              },
              width: "w-32",
            },
            {
              key: "credits",
              header: "Credits",
              cell: (item: any) => {
                // All accounts: negative balance goes to credit
                const value = item.balance < 0 ? Math.abs(item.balance) : 0;
                return value > 0 ? `₦${Number(value).toLocaleString()}` : "-";
              },
              width: "w-32",
            },
          ];

          ReportExporter.exportGenericReport(
            reportData,
            trialBalanceColumns,
            "Trial Balance",
            format,
          );
          break;
        }
        case "cashAccount-balances": {
          const cashAccountBalancesColumns = [
            { key: "SerialNo", header: "Serial No", width: "w-32" },
            { key: "AccountName", header: "Account Name", width: "w-32" },
            { key: "OpeningBalance", header: "Opening Balance", width: "w-32" },
            { key: "TotalInflow", header: "Total Inflow", width: "w-32" },
            { key: "TotalOutflow", header: "Total Outflow", width: "w-32" },
            { key: "ClosingBalance", header: "Closing Balance", width: "w-32" },
            // { key: 'GrandTotalInflow', header: 'Grand TotalInflow' },
            // { key: 'GrandTotalOutflow', header: 'Grand TotaOutflow' },
            // { key: 'GrandTotalClosing', header: 'Grand TotalClosing' },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            cashAccountBalancesColumns,
            "CashAccount Balances",
            format,
          );
          break;
        }
        case "general-ledger": {
          const glColumns = [
            { key: "date", header: "Date" },
            { key: "journalNo", header: "Journal No" },
            { key: "accountCode", header: "Account Code" },
            { key: "accountName", header: "Account Name" },
            { key: "memo", header: "Description" },
            { key: "debit", header: "Debit" },
            { key: "credit", header: "Credit" },
          ];
          console.log("Export Data", reportData);
          ReportExporter.exportGenericReport(
            reportData.lines || [],
            glColumns,
            "General Ledger",
            format,
          );
          break;
        }
        case "cash-flow": {
          const cashFlowData = [
            ...(reportData.operatingActivities?.map((item: any) => ({
              ...item,
              category: "Operating",
            })) || []),
            ...(reportData.investingActivities?.map((item: any) => ({
              ...item,
              category: "Investing",
            })) || []),
            ...(reportData.financingActivities?.map((item: any) => ({
              ...item,
              category: "Financing",
            })) || []),
          ];
          const cashFlowColumns = [
            { key: "category", header: "Category" },
            { key: "description", header: "Description" },
            { key: "amount", header: "Amount" },
            { key: "date", header: "Date" },
          ];
          ReportExporter.exportGenericReport(
            cashFlowData,
            cashFlowColumns,
            "Cash Flow Statement",
            format,
          );
          break;
        }
        case "inventory-valuation": {
          const invColumns = [
            { key: "sku", header: "SKU" },
            { key: "name", header: "Item Name" },
            { key: "type", header: "Type" },
            { key: "qty", header: "Quantity" },
            { key: "unitCost", header: "Unit Cost" },
            { key: "totalValue", header: "Total Value" },
          ];
          ReportExporter.exportGenericReport(
            reportData.valuation || [],
            invColumns,
            "Inventory Valuation",
            format,
          );
          break;
        }
        case "inventory-aging": {
          const agingColumns = [
            { key: "item.sku", header: "Item SKU" },
            { key: "item.name", header: "Item Name" },
            { key: "warehouse.name", header: "Warehouse" },
            { key: "totalQty", header: "Total Qty" },
            { key: "aging0to30", header: "0-30 Days" },
            { key: "aging31to60", header: "31-60 Days" },
            { key: "aging61to90", header: "61-90 Days" },
            { key: "agingOver90", header: "Over 90 Days" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            agingColumns,
            "Inventory Aging",
            format,
          );
          break;
        }
        case "stock-card": {
          const stockColumns = [
            { key: "date", header: "Date" },
            { key: "refType", header: "Reference Type" },
            { key: "direction", header: "Direction" },
            { key: "qty", header: "Quantity" },
            { key: "unitCost", header: "Unit Cost" },
            { key: "runningQty", header: "Running Qty" },
            { key: "user", header: "User" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            stockColumns,
            "Stock Card",
            format,
          );
          break;
        }
        case "customer-ledger": {
          const customerLedgerColumns = [
            { key: "openingBalance", header: "Opening Balance" },
            { key: "type", header: "Account Type" },
            { key: "account_code", header: "Account Code" },
            { key: "account_name", header: "Account Name" },
            { key: "transaction_type", header: "Transaction Type" },
            { key: "reference", header: "Reference" },
            { key: "date", header: "Date" },
            { key: "debit", header: "Debit" },
            { key: "credit", header: "Credit" },
            { key: "balance", header: "Balance" },
            { key: "descripption", header: "Description" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            customerLedgerColumns,
            "Customer Ledger",
            format,
          );
          break;
        }
        case "vendor-ledger": {
          const vendorLedgerColumns = [
            { key: "openingBalance", header: "Opening Balance" },
            { key: "type", header: "Account Type" },
            { key: "account_code", header: "Account Code" },
            { key: "account_name", header: "Account Name" },
            { key: "transaction_type", header: "Transaction Type" },
            { key: "reference", header: "Reference" },
            { key: "date", header: "Date" },
            { key: "debit", header: "Debit" },
            { key: "credit", header: "Credit" },
            { key: "balance", header: "Balance" },
            { key: "descripption", header: "Description" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            vendorLedgerColumns,
            "Vendor Ledger",
            format,
          );
          break;
        }
        case "wip-summary": {
          const wipColumns = [
            { key: "orderNo", header: "Production Order" },
            { key: "item.sku", header: "Item SKU" },
            { key: "item.name", header: "Item Name" },
            { key: "issues", header: "Material Issues" },
            { key: "labor", header: "Labor Cost" },
            { key: "overhead", header: "Overhead" },
            { key: "balance", header: "WIP Balance" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            wipColumns,
            "WIP Summary",
            format,
          );
          break;
        }
        case "production-variance": {
          const varianceColumns = [
            { key: "orderNo", header: "Order No" },
            { key: "item.sku", header: "Item SKU" },
            { key: "item.name", header: "Item Name" },
            { key: "qtyProduced", header: "Qty Produced" },
            { key: "actualMaterialCost", header: "Actual Material Cost" },
            { key: "materialVariance", header: "Material Variance" },
            { key: "totalVariance", header: "Total Variance" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            varianceColumns,
            "Production Variance",
            format,
          );
          break;
        }
        case "production-summary": {
          const prodSummaryColumns = [
            { key: "no", header: "Serial No" },
            { key: "name", header: "Item Name" },
            { key: "CumProduction", header: "Cummlative Production" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            prodSummaryColumns,
            "Production Summary",
            format,
          );
          break;
        }
        case "production-report": {
          const prodReportColumns = [
            { key: "no", header: "Serial No" },
            { key: "productionDate", header: "Production Date" },
            { key: "name", header: "Item Name" },
            { key: "qtyProduced", header: "Qty Produced" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            prodReportColumns,
            "Production Report",
            format,
          );
          break;
        }
        case "vendor-balances": {
          const vendorBalancesColumns = [
            { key: "vendor_code", header: "Vendor Code" },
            { key: "vendor_name", header: "Vendor Name" },
            { key: "total_purchases", header: "Total Purchases" },
            { key: "total_payments", header: "Total Payments" },
            { key: "outstanding_balance", header: "Outstanding Balance" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            vendorBalancesColumns,
            "Vendor Balances",
            format,
          );
          break;
        }
        case "customer-balances": {
          const CustomerBalancesColumns = [
            { key: "customer_code", header: "Customer Code" },
            { key: "customer_name", header: "Customer Name" },
            { key: "total_sales", header: "Total Sales" },
            { key: "total_receipts", header: "Total Receipts" },
            { key: "outstanding_balance", header: "Outstanding Balance" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            CustomerBalancesColumns,
            "Customer Balances",
            format,
          );
          break;
        }
        case "material-usage": {
          const materialUsageColumns = [
            { key: "no", header: "Serial No" },
            { key: "postedDate", header: "Production Date" },
            { key: "name", header: "Item Name" },
            { key: "reftype", header: "Usage Purpose" },
            { key: "qty", header: "Qty Produced" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            materialUsageColumns,
            "Production Summary",
            format,
          );
          break;
        }
        case "sales-by-item": {
          const salesItemColumns = [
            { key: "item.sku", header: "Item SKU" },
            { key: "item.name", header: "Item Name" },
            { key: "totalQty", header: "Total Qty Sold" },
            { key: "totalValue", header: "Total Value" },
            { key: "orderCount", header: "Order Count" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            salesItemColumns,
            "Sales by Item",
            format,
          );
          break;
        }
        case "pos-sales": {
          const POSsalesColumns = [
            { key: "TransactionDate", header: "Transaction Date" },
            { key: "SaleNo", header: "Sales No" },
            { key: "WarehouseName", header: "Warehouse Name" },
            { key: "CashAccountName", header: "CashAccount Name" },
            { key: "SalesRep", header: "Sales Rep" },
            { key: "TotalAmount", header: "Total Amount" },
            { key: "AmountPaid", header: "Amount Paid" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            POSsalesColumns,
            "POS Sales Details",
            format,
          );
          break;
        }
        case "sales-by-customer": {
          const salesCustomerColumns = [
            { key: "customer.code", header: "Customer Code" },
            { key: "customer.name", header: "Customer Name" },
            { key: "totalValue", header: "Total Sales" },
            { key: "orderCount", header: "Order Count" },
            { key: "avgOrderValue", header: "Avg Order Value" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            salesCustomerColumns,
            "Sales by Customer",
            format,
          );
          break;
        }
        case "purchases-by-vendor": {
          const purchaseVendorColumns = [
            { key: "vendor.code", header: "Vendor Code" },
            { key: "vendor.name", header: "Vendor Name" },
            { key: "totalValue", header: "Total Purchases" },
            { key: "orderCount", header: "Order Count" },
            { key: "avgOrderValue", header: "Avg Order Value" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            purchaseVendorColumns,
            "Purchases by Vendor",
            format,
          );
          break;
        }
        case "ar-aging":
        case "ap-aging": {
          const agingType = selectedReport === "ar-aging" ? "AR" : "AP";
          const entityKey = agingType === "AR" ? "customer" : "vendor";
          const arApColumns = [
            {
              key: `${entityKey}.code`,
              header: `${agingType === "AR" ? "Customer" : "Vendor"} Code`,
            },
            {
              key: `${entityKey}.name`,
              header: `${agingType === "AR" ? "Customer" : "Vendor"} Name`,
            },
            { key: "orderNo", header: "Order No" },
            { key: "orderDate", header: "Order Date" },
            { key: "outstandingAmount", header: "Outstanding Amount" },
            { key: "daysPastDue", header: "Days Past Due" },
            { key: "agingBucket", header: "Aging Bucket" },
          ];
          ReportExporter.exportGenericReport(
            reportData,
            arApColumns,
            `${agingType} Aging`,
            format,
          );
          break;
        }
        default:
          throw new Error("Export not implemented for this report type");
      }

      toast.success(`Report exported as ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export report as ${format.toUpperCase()}`);
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    const report = reports.find((r) => r.id === selectedReport);
    if (!report) return null;

    switch (selectedReport) {
      case "balance-sheet":
        return <BalanceSheetReport data={reportData} />;
      case "profit-loss":
        return <ProfitLossReport data={reportData} />;
      case "trial-balance":
        return <TrialBalanceReport data={reportData} />;
      case "general-ledger":
        return <GeneralLedgerReport data={reportData} />;
      case "cash-flow":
        return <CashFlowReport data={reportData} />;
      case "inventory-valuation":
        return <InventoryValuationReport data={reportData} />;
      case "inventory-aging":
        return <InventoryAgingReport data={reportData} />;
      case "stock-card":
        return <StockCardReport data={reportData} />;
      case "customer-ledger":
        return <CustomerLedger data={reportData} />;
      case "vendor-ledger":
        return <VendorLedger data={reportData} />;
      case "wip-summary":
        return <WipSummaryReport data={reportData} />;
      case "production-variance":
        return <ProductionVarianceReport data={reportData} />;
      case "sales-by-item":
        return <SalesByItemReport data={reportData} />;
      case "sales-by-customer":
        return <SalesByCustomerReport data={reportData} />;
      case "pos-sales":
        return <POSSalesReport data={reportData} />;
      case "purchases-by-vendor":
        return <PurchasesByVendorReport data={reportData} />;
      case "production-summary":
        return <ProductionSummary data={reportData} />;
      case "production-report":
        return <ProductionReport data={reportData} />;
      case "material-usage":
        return <MaterialUsage data={reportData} />;
      case "vendor-balances":
        return <VendorBalances data={reportData} />;
      case "cashAccount-balances":
        return <CashAccountBalances data={reportData} />;
      case "customer-balances":
        return <CustomerBalances data={reportData} />;
      case "ar-aging":
      case "ap-aging":
        return (
          <ArApAgingReport
            data={reportData}
            type={selectedReport === "ar-aging" ? "AR" : "AP"}
          />
        );
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            Report view not implemented
          </div>
        );
    }
  };

  const selectedReportConfig = reports.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">
            Generate comprehensive business reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Available Reports
              </h3>
            </div>
            <div className="p-6">
              {categories.map((category) => (
                <div key={category} className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    {category} Reports
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {reports
                      .filter((r) => r.category === category)
                      .map((report) => (
                        <div
                          key={report.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedReport === report.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setSelectedReport(report.id)}
                        >
                          <div className="flex items-start">
                            <report.icon
                              className={`h-5 w-5 mt-0.5 mr-3 ${
                                selectedReport === report.id
                                  ? "text-emerald-600"
                                  : "text-gray-400"
                              }`}
                            />
                            <div>
                              <h5
                                className={`text-sm font-medium ${
                                  selectedReport === report.id
                                    ? "text-emerald-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {report.name}
                              </h5>
                              <p
                                className={`text-xs mt-1 ${
                                  selectedReport === report.id
                                    ? "text-emerald-700"
                                    : "text-gray-500"
                                }`}
                              >
                                {report.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report Parameters & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parameters */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Report Parameters
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Date Parameters */}
              {selectedReportConfig?.requiresDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date From *
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date To *
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}

              {selectedReportConfig?.requiresAsOfDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    As of Date *
                  </label>
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>
              )}

              {/* Filter Parameters */}
              {selectedReportConfig?.supportsWarehouse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse
                  </label>
                  <select
                    value={warehouseFilter}
                    onChange={(e) => setWarehouseFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedReportConfig?.requiresItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item *
                  </label>

                  <GenericSearchSelect
                    data={mappedItems}
                    value={itemFilter}
                    onChange={setItemFilter}
                    valueKey="id"
                    searchKeys={["sku", "name"]}
                    placeholder="Search item by SKU or name..."
                    onSearchRemote={searchItemRemote}
                    displayValue={(item) =>
                      item ? `${item.sku} - ${item.name}` : ""
                    }
                    renderOption={(item) => `${item.sku} - ${item.name}`}
                  />
                </div>
              )}
              {selectedReportConfig?.supportCustomers && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customers *
                  </label>

                  <CustomerSelect
                    value={customerId}
                    onChange={setCustomerId}
                    typeFilter="retail"
                    error=""
                  />

                  {/* <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Customer</option>
                    {customers?.customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.code} - {customer.name}
                      </option>
                    ))}
                  </select> */}
                </div>
              )}
              {selectedReportConfig?.supportAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chart Of Accounts *
                  </label>
                  <ChartAccountSelect
                    accounts={accounts?.accounts || []}
                    value={accountFilter}
                    onChange={setAccountFilter}
                    // error={errors.accountId?.message}
                  />
                  {/* <select
                    value={accountFilter}
                    onChange={(e) => setAccountFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Account</option>
                    {accounts?.accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>
                         {account.name}
                      </option>
                    ))}
                  </select> */}
                </div>
              )}
              {selectedReportConfig?.supportUsers && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Users *
                  </label>
                  <select
                    value={usersFilter}
                    onChange={(e) => setUsersFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">Select User</option>
                    {allUsers?.users?.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedReportConfig?.supportVendors && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendors *
                  </label>

                  <VendorSelect
                    value={vendorFilter}
                    onChange={setVendorFilter}
                    error=""
                  />
                  {/* <select
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select Vendor</option>
                    {vendors?.vendors?.map((vendor: any) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.code} - {vendor.name}
                      </option>
                    ))}
                  </select> */}
                </div>
              )}

              <button
                onClick={handleGenerateReport}
                disabled={!selectedReport || loading}
                className="w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="h-4 w-4 mr-2" />
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Export Options
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleExportReport("pdf")}
                disabled={!reportData}
                className="w-full inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </button>

              <button
                onClick={() => handleExportReport("xlsx")}
                disabled={!reportData}
                className="w-full inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as Excel
              </button>

              <button
                onClick={() => handleExportReport("csv")}
                disabled={!reportData}
                className="w-full inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {reportData && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {selectedReportConfig?.name}
            </h3>
          </div>
          <div className="p-6">{renderReportContent()}</div>
        </div>
      )}
    </div>
  );
};

// Report Components
const BalanceSheetReport = ({ data }: { data: any }) => (
  <div id="balance-sheet-content" className="space-y-6">
    <div className="text-center">
      <h2 className="text-xl font-bold">Balance Sheet</h2>
      <p className="text-gray-600">
        As of{" "}
        {data?.asOfDate
          ? new Date(data.asOfDate).toLocaleDateString()
          : "Date not specified"}
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Assets */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Assets</h3>
        <div className="space-y-2">
          {Array.isArray(data?.assets) &&
            data.assets
              //  .filter((asset: any) => asset.accountName !== 'Cash and Bank')
              .map((asset: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{asset.accountName}</span>
                  <span>₦{asset.balance.toLocaleString()}</span>
                </div>
              ))}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Assets</span>
            <span>₦{(data?.totalAssets || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Liabilities & Equity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Liabilities & Equity</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Liabilities</h4>
            <div className="space-y-2 ml-4">
              {Array.isArray(data?.liabilities) &&
                data.liabilities.map((liability: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{liability.accountName}</span>
                    <span>₦{liability.balance.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Equity</h4>
            <div className="space-y-2 ml-4">
              {Array.isArray(data?.equity) &&
                data.equity.map((equity: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{equity.accountName}</span>
                    <span>₦{equity.balance.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Liabilities & Equity</span>
            <span>
              ₦
              {(
                (data?.totalLiabilities || 0) + (data?.totalEquity || 0)
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ProfitLossReport = ({ data }: { data: any }) => (
  <div id="profit-loss-content" className="space-y-6">
    <div className="text-center">
      <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
      <p className="text-gray-600">
        {data?.fromDate && data?.toDate
          ? `${new Date(data.fromDate).toLocaleDateString()} to ${new Date(data.toDate).toLocaleDateString()}`
          : "Period not specified"}
      </p>
    </div>

    <div className="space-y-6">
      {/* Income */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Income</h3>
        <div className="space-y-2">
          {(data?.revenues || []).map((revenue: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{revenue.accountName}</span>
              <span>₦{revenue.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Income</span>
            <span>₦{(data?.totalRevenue || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Cost of Sales */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Cost of Sales</h3>
        <div className="space-y-2">
          {(data?.costOfSales || []).map((cos: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{cos.accountName}</span>
              <span>₦{cos.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Cost Of Sales</span>
            <span>₦{(data?.totalCostOfSales || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Gross Profit*/}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div
          className={`text-xl font-bold flex justify-between ${
            (data?.grossProfit || 0) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          <span>Gross Profit</span>
          <span>₦{(data?.grossProfit || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* OtherIncome */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Other Income</h3>
        <div className="space-y-2">
          {(data?.otherIncomes || []).map((other: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{other.accountName}</span>
              <span>₦{other.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Other Income</span>
            <span>₦{(data?.totalOtherIncome || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Expenses</h3>
        <div className="space-y-2">
          {(data?.expenses || []).map((expense: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{expense.accountName}</span>
              <span>₦{expense.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Total Expenses</span>
            <span>₦{(data?.totalExpense || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Net Income */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div
          className={`text-xl font-bold flex justify-between ${
            (data?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          <span>Net Profit</span>
          <span>₦{(data?.netIncome || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

// const TrialBalanceReport = ({ data }: { data: any }) => {
//   const columns = [
//     { key: 'accountCode', header: 'Account Code', width: 'w-32' },
//     { key: 'accountName', header: 'Account Name', width: 'w-48' },
//     { key: 'accountType', header: 'Type', width: 'w-32' },
//     {
//       key: 'debits',
//       header: 'Debits',
//       cell: (item: any) => `₦${Number(item.debits).toLocaleString()}`,
//       width: 'w-32'
//     },
//     {
//       key: 'credits',
//       header: 'Credits',
//       cell: (item: any) => `₦${Number(item.credits).toLocaleString()}`,
//       width: 'w-32'
//     },
//     {
//       key: 'balance',
//       header: 'Balance',
//       cell: (item: any) => (
//         <span className={item.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
//           ₦{Math.abs(item.balance).toLocaleString()}
//         </span>
//       ),
//       width: 'w-32'
//     }
//   ];

//   // const totalDebits = (data || []).reduce((sum: number, item: any) => sum + (item.debits || 0), 0);
//   const totalDebits = (data?.reduce((sum: number, item: any) => sum + (item.debits || 0), 0)) ?? 0;
//   // const totalCredits = (data || []).reduce((sum: number, item: any) => sum + (item.credits || 0), 0);
//   const totalCredits = (data?.reduce((sum: number, item: any) => sum + (item.credits || 0), 0));

//   return (
//     <div className="space-y-4">
//       <div className="text-center">
//         <h2 className="text-xl font-bold">Trial Balance</h2>
//         <p className="text-gray-600">As of {new Date(data.asOfDate).toLocaleDateString()}</p>
//       </div>

//       <DataTable data={data || []} columns={columns} />

//       <div className="bg-gray-50 p-4 rounded-lg">
//         <div className="grid grid-cols-2 gap-4 text-center">
//           <div>
//             <div className="text-lg font-semibold">Total Debits</div>
//             <div className="text-xl text-blue-600">₦{totalDebits.toLocaleString()}</div>
//           </div>
//           <div>
//             <div className="text-lg font-semibold">Total Credits</div>
//             <div className="text-xl text-blue-600">₦{totalCredits.toLocaleString()}</div>
//           </div>
//         </div>
//         <div className="text-center mt-4">
//           <div className={`text-sm ${Math.abs(totalDebits - totalCredits) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
//             {Math.abs(totalDebits - totalCredits) < 0.01 ? 'Trial Balance is balanced' : 'Trial Balance is NOT balanced'}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

const TrialBalanceReport = ({ data }: { data: any }) => {
  const columns = [
    { key: "accountCode", header: "Account Code", width: "w-32" },
    { key: "accountName", header: "Account Name", width: "w-48" },
    { key: "accountType", header: "Type", width: "w-32" },
    {
      key: "debits",
      header: "Debits",
      cell: (item: any) => {
        // All accounts: positive balance goes to debit
        const value = item.balance >= 0 ? item.balance : 0;
        return value > 0 ? `₦${Number(value).toLocaleString()}` : "-";
      },
      width: "w-32",
    },
    {
      key: "credits",
      header: "Credits",
      cell: (item: any) => {
        // All accounts: negative balance goes to credit
        const value = item.balance < 0 ? Math.abs(item.balance) : 0;
        return value > 0 ? `₦${Number(value).toLocaleString()}` : "-";
      },
      width: "w-32",
    },
  ];

  const totalDebits =
    data?.reduce((sum: number, item: any) => {
      return sum + (item.balance >= 0 ? item.balance : 0);
    }, 0) ?? 0;

  const totalCredits =
    data?.reduce((sum: number, item: any) => {
      return sum + (item.balance < 0 ? Math.abs(item.balance) : 0);
    }, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Trial Balance</h2>
        <p className="text-gray-600">
          As of {new Date(data.asOfDate).toLocaleDateString()}
        </p>
      </div>

      <DataTable data={data || []} columns={columns} />

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold">Total Debits</div>
            <div className="text-xl text-blue-600">
              ₦{totalDebits.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold">Total Credits</div>
            <div className="text-xl text-blue-600">
              ₦{totalCredits.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <div
            className={`text-sm ${Math.abs(totalDebits - totalCredits) < 0.01 ? "text-green-600" : "text-red-600"}`}
          >
            {Math.abs(totalDebits - totalCredits) < 0.01
              ? "Trial Balance is balanced"
              : "Trial Balance is NOT balanced"}
          </div>
        </div>
      </div>
    </div>
  );
};

//Vendor Balances
const VendorBalances = ({ data }: { data: any }) => {
  const columns = [
    { key: "vendor_code", header: "Vendor Code", width: "w-32" },
    { key: "vendor_name", header: "Vendor Name", width: "w-32" },
    // {key:'total_purchases', header:'Total Purchases', cell: (item: any) => `₦${(Number(item.total_purchases) || 0).toLocaleString()}`, width: 'w-32'},
    // {key:'total_payments', header:'Total Payments', cell: (item: any) => `₦${(Number(item.total_payments) || 0).toLocaleString()}`, width: 'w-32'},
    {
      key: "outstanding_balance",
      header: "Outstanding Balances",
      cell: (item: any) =>
        `₦${(Number(item.outstanding_balance) || 0).toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Vendor Balances</h2>
        <p className="text-gray-600">Detail of Vendor Balances</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};
const CashAccountBalances = ({ data }: { data: any }) => {
  const columns = [
    { key: "SerialNo", header: "Serial No", width: "w-32" },
    { key: "AccountName", header: "Account Name", width: "w-32" },
    {
      key: "OpeningBalance",
      header: "Opening Balance",
      cell: (item: any) => {
        return item.OpeningBalance > 0
          ? `₦${Number(item.OpeningBalance).toLocaleString()}`
          : "-";
      },
      width: "w-32",
    },
    {
      key: "TotalInflow",
      header: "Total Inflow",
      cell: (item: any) => {
        return item.TotalInflow > 0
          ? `₦${Number(item.TotalInflow).toLocaleString()}`
          : "-";
      },
      width: "w-32",
    },
    {
      key: "TotalOutflow",
      header: "Total Outflow",
      cell: (item: any) => {
        return item.TotalOutflow > 0
          ? `₦${Number(item.TotalOutflow).toLocaleString()}`
          : "-";
      },
      width: "w-32",
    },
    {
      key: "ClosingBalance",
      header: "Closing Balance",
      cell: (item: any) => {
        return item.ClosingBalance > 0
          ? `₦${Number(item.ClosingBalance).toLocaleString()}`
          : "-";
      },
      width: "w-32",
    },
    // { key: 'GrandTotalInflow', header: 'Grand TotalInflow' , width: 'w-32'},
    // { key: 'GrandTotalOutflow', header: 'Grand TotaOutflow' , width: 'w-32'},
    // { key: 'GrandTotalClosing', header: 'Grand TotalClosing' , width: 'w-32'},
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Cash Account Balances</h2>
        <p className="text-gray-600">Detail of Cash Account Balances</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};
const POSSalesReport = ({ data }: { data: any }) => {
  // console.log(data)
  const columns = [
    { key: "TransactionDate", header: "Transaction Date", width: "w-32" },
    { key: "SaleNo", header: "Sale No", width: "w-32" },
    { key: "WarehouseName", header: "Warehouse Name", width: "w-32" },
    { key: "CashAccountName", header: "CashAccount Name", width: "w-32" },
    { key: "SalesRep", header: "Sales Rep", width: "w-32" },
    { key: "TotalAmount", header: "Total Amount", width: "w-32" },
    { key: "AmountPaid", header: "Amount Paid", width: "w-32" },
    // { key: 'GrandTotalClosing', header: 'Grand TotalClosing' , width: 'w-32'},
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">POS Sales Report</h2>
        <p className="text-gray-600">Detail of POS Sales for all terminals</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

//Vendor Balances
const CustomerBalances = ({ data }: { data: any }) => {
  const columns = [
    { key: "customer_code", header: "Customer Code", width: "w-32" },
    { key: "customer_name", header: "Customer Name", width: "w-32" },
    // {key:'total_sales', header:'Total Sales', cell: (item: any) => `₦${(Number(item.total_sales) || 0).toLocaleString()}`, width: 'w-32'},
    // {key:'total_receipts', header:'Total Receipts', cell: (item: any) => `₦${(Number(item.total_receipts) || 0).toLocaleString()}`, width: 'w-32'},
    {
      key: "outstanding_balance",
      header: "Outstanding Balances",
      cell: (item: any) =>
        `₦${(Number(item.outstanding_balance) || 0).toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Customer Balances</h2>
        <p className="text-gray-600">Detail of Customer Balances</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const GeneralLedgerReport = ({ data }: { data: any[] }) => {
  // 1. Compute running balance
  const dataWithBalance = data.lines.reduce((acc: any[], curr, idx) => {
    const prevBalance =
      idx > 0 ? acc[idx - 1].runningBalance : data.openingBalance;
    const runningBalance = prevBalance + (curr.debit || 0) - (curr.credit || 0);

    acc.push({ ...curr, runningBalance });
    return acc;
  }, []);

  // 2. Define columns including the new one
  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (item: any) => new Date(item.date).toLocaleDateString(),
      width: "w-24",
    },
    { key: "journalNo", header: "Journal No", width: "w-32" },
    { key: "accountCode", header: "Account", width: "w-32" },
    { key: "accountName", header: "Account Name", width: "w-48" },
    // { key: 'memo', header: 'Description', width: 'w-64' },
    {
      key: "debit",
      header: "Debit",
      cell: (item: any) =>
        item.debit > 0 ? `₦${item.debit.toLocaleString()}` : "-",
      width: "w-32",
    },
    {
      key: "credit",
      header: "Credit",
      cell: (item: any) =>
        item.credit > 0 ? `₦${item.credit.toLocaleString()}` : "-",
      width: "w-32",
    },
    { key: "refType", header: "RefType", width: "w-48" },
    {
      key: "runningBalance",
      header: "Running Balance",
      cell: (item: any) => `₦${item.runningBalance.toLocaleString()}`,
      width: "w-40",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">General Ledger</h2>
        <p className="text-gray-600">Detailed journal entries</p>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Opening Balance: </span>
        <span>₦{Number(data.openingBalance).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Receipt: </span>
        <span>₦{Number(data.totalReceipt).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Payment: </span>
        <span>₦{Number(data.totalPayment).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Closing Balance: </span>
        <span>₦{Number(data.closingBalance).toLocaleString()}</span>
      </div>

      <DataTable data={dataWithBalance} columns={columns} />
    </div>
  );
};

const ProductionSummary = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "no",
      header: "Serial No",
      width: "w-32",
    },
    { key: "name", header: "Item Name", width: "w-32" },
    { key: "CumProduction", header: "Cummalative Production", width: "w-32" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Production Summary by Item</h2>
        <p className="text-gray-600">Cummulative Production</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

//Production Report
const ProductionReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "no",
      header: "Serial No",
      width: "w-32",
    },

    { key: "ProductionDate", header: "Production Date", width: "w-32" },
    { key: "name", header: "Item Name", width: "w-32" },
    { key: "qtyProduced", header: "Qty Produced", width: "w-32" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          Production Details by Item and Date
        </h2>
        <p className="text-gray-600">Details of Production within a period</p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

//Production Report
const MaterialUsage = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "no",
      header: "Serial No",
      width: "w-32",
    },

    { key: "PostedDate", header: "Usage Date", width: "w-32" },
    { key: "name", header: "Item Name", width: "w-32" },
    { key: "refType", header: "Usage Purpose", width: "w-32" },
    { key: "qty", header: "Quantity Used", width: "w-32" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          Material Usage for Production by Date
        </h2>
        <p className="text-gray-600">
          Details of Material Usage for production within a period
        </p>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const CashFlowReport = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-xl font-bold">Cash Flow Statement</h2>
      <p className="text-gray-600">
        {data?.fromDate && data?.toDate
          ? `${new Date(data.fromDate).toLocaleDateString()} to ${new Date(data.toDate).toLocaleDateString()}`
          : "Period not specified"}
      </p>
    </div>

    <div className="space-y-6">
      {/* Operating Activities */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Operating Activities</h3>
        <div className="space-y-2">
          {(data?.operatingActivities || []).map(
            (activity: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span>{activity.description}</span>
                <span
                  className={
                    activity.amount >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  ₦{Math.abs(activity.amount).toLocaleString()}
                </span>
              </div>
            ),
          )}
          <div className="border-t pt-2 font-semibold flex justify-between">
            <span>Net Cash from Operating Activities</span>
            <span
              className={
                (data?.operatingCashFlow || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              ₦{Math.abs(data?.operatingCashFlow || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div
          className={`text-xl font-bold flex justify-between ${
            (data?.netCashFlow || 0) >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          <span>Net Cash Flow</span>
          <span>₦{(data?.netCashFlow || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

const InventoryValuationReport = ({ data }: { data: any }) => {
  const columns = [
    { key: "sku", header: "SKU", width: "w-32" },
    { key: "name", header: "Item Name", width: "w-48" },
    {
      key: "type",
      header: "Type",
      cell: (item: any) => <StatusBadge status={item.type.replace("_", " ")} />,
      width: "w-36",
    },
    {
      key: "qty",
      header: "Quantity",
      cell: (item: any) => item.qty.toLocaleString(),
      width: "w-24",
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (item: any) => `₦${item.unitCost.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "totalValue",
      header: "Total Value",
      cell: (item: any) => `₦${item.totalValue.toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Inventory Valuation Report</h2>
        <p className="text-gray-600">
          As of{" "}
          {data?.asOfDate
            ? new Date(data.asOfDate).toLocaleDateString()
            : new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="text-2xl font-bold text-blue-600">
          Total Inventory Value: ₦{(data?.totalValue || 0).toLocaleString()}
        </div>
      </div>

      <DataTable data={data?.valuation || []} columns={columns} />
    </div>
  );
};

const InventoryAgingReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "item",
      header: "Item",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.item?.sku || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.item?.name || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (item: any) => item.warehouse?.name || "N/A",
      width: "w-32",
    },
    {
      key: "totalQty",
      header: "Total Qty",
      cell: (item: any) => (item.totalQty || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "aging0to30",
      header: "0-30 Days",
      cell: (item: any) => `₦${(item.aging0to30 || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "aging31to60",
      header: "31-60 Days",
      cell: (item: any) => `₦${(item.aging31to60 || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "aging61to90",
      header: "61-90 Days",
      cell: (item: any) => `₦${(item.aging61to90 || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "agingOver90",
      header: "Over 90 Days",
      cell: (item: any) => `₦${(item.agingOver90 || 0).toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Inventory Aging Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const StockCardReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (item: any) => new Date(item.date).toLocaleDateString(),
      width: "w-24",
    },
    { key: "refType", header: "Reference", width: "w-32" },
    {
      key: "direction",
      header: "Direction",
      cell: (item: any) => (
        <StatusBadge
          status={item.direction}
          variant={item.direction === "IN" ? "success" : "warning"}
        />
      ),
      width: "w-24",
    },
    {
      key: "qty",
      header: "Quantity",
      cell: (item: any) => (item.qty || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (item: any) => `₦${(item.unitCost || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "runningQty",
      header: "Running Qty",
      cell: (item: any) => (item.runningQty || 0).toLocaleString(),
      width: "w-32",
    },
    {
      key: "user",
      header: "User",
      cell: (item: any) => item.user || "System",
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Stock Card Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};
const CustomerLedger = ({ data }: { data: any }) => {
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  // 1. Compute running balances
  const entriesWithBalance = entries.reduce((acc: any[], curr, idx) => {
    const prevBalance =
      idx > 0
        ? Number(acc[idx - 1].runningBalance)
        : Number(data.openingBalance) || 0;
    const runningBalance =
      prevBalance + Number(curr.debit || 0) - Number(curr.credit || 0);

    acc.push({ ...curr, runningBalance });
    return acc;
  }, []);

  // 2. Define columns including Running Balance
  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (item: any) => new Date(item.date).toLocaleDateString(),
      width: "w-24",
    },
    // { key: 'account_code', header: 'Account Code', width: 'w-32' },
    { key: "account_name", header: "Account Name", width: "w-32" },
    { key: "transaction_type", header: "Transaction Type", width: "w-32" },
    // { key: 'reference', header: 'Reference', width: 'w-32' },
    { key: "description", header: "Description", width: "w-32" },
    {
      key: "debit",
      header: "Debit",
      cell: (item: any) =>
        item.debit ? `₦${Number(item.debit).toLocaleString()}` : "-",
      width: "w-32",
    },
    {
      key: "credit",
      header: "Credit",
      cell: (item: any) =>
        item.credit ? `₦${Number(item.credit).toLocaleString()}` : "-",
      width: "w-32",
    },

    {
      key: "runningBalance",
      header: "Current Balance",
      cell: (item: any) => `₦${Number(item.runningBalance).toLocaleString()}`,
      width: "w-40",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Customer Ledger</h2>
      </div>

      <div className="flex justify-end">
        <span className="mx-2 font-bold">Opening Balance </span>
        <span>₦{Number(data.openingBalance).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Sales/Refunds </span>
        <span>₦{Number(data.totals.totalSales).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Payment </span>
        <span>₦{Number(data.totals.totalPayments).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Closing Balance </span>
        <span>₦{Number(data.totals.closingBalance).toLocaleString()}</span>
      </div>

      {/* Pass entriesWithBalance instead of raw entries */}
      <DataTable data={entriesWithBalance} columns={columns} />
    </div>
  );
};

const VendorLedger = ({ data }: { data: any }) => {
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  const entriesWithBalance = entries.reduce((acc: any[], curr, idx) => {
    const prevBalance =
      idx > 0
        ? Number(acc[idx - 1].runningBalance)
        : Number(data.openingBalance) || 0;
    const runningBalance =
      prevBalance + Number(curr.debit || 0) - Number(curr.credit || 0);

    acc.push({ ...curr, runningBalance });
    return acc;
  }, []);

  const columns = [
    {
      key: "entries.date",
      header: "Date",
      cell: (item: any) => new Date(item.date).toLocaleDateString(),
      width: "w-24",
    },
    // { key: 'account_code', header: 'Account Code', width: 'w-32' },
    { key: "account_name", header: "Account Name", width: "w-32" },
    { key: "transaction_type", header: "Transaction Type", width: "w-32" },
    // { key: 'reference', header: 'Reference', width: 'w-32' },
    { key: "description", header: "Decription", width: "w-32" },
    {
      key: "debit",
      header: "Debit",
      cell: (item: any) =>
        item.debit ? `₦${Number(item.debit).toLocaleString()}` : "-",
      width: "w-32",
    },
    {
      key: "credit",
      header: "Credit",
      cell: (item: any) =>
        item.credit ? `₦${Number(item.credit).toLocaleString()}` : "-",
      width: "w-32",
    },

    {
      key: "runningBalance",
      header: "Current Balance",
      cell: (item: any) => `₦${Number(item.runningBalance).toLocaleString()}`,
      width: "w-40",
    },
  ];
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Vendor Ledger</h2>
      </div>

      <div className="flex justify-end">
        <span className="mx-2 font-bold">Opening Balance </span>
        <span>₦{Number(data.openingBalance).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Purchases/Refunds </span>
        <span>₦{Number(data.totals.totalPurchases).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Total Receipts </span>
        <span> </span>
        <span>₦{Number(data.totals.totalPayments).toLocaleString()}</span>
      </div>
      <div className="flex justify-end">
        <span className="mx-2 font-bold">Closing Balance </span>
        <span>₦{Number(data.totals.closingBalance).toLocaleString()}</span>
      </div>

      <DataTable data={entriesWithBalance || []} columns={columns} />
    </div>
  );
};

const WipSummaryReport = ({ data }: { data: any }) => {
  const columns = [
    { key: "orderNo", header: "Production Order", width: "w-32" },
    {
      key: "item",
      header: "Item",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.item?.sku || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.item?.name || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "issues",
      header: "Material Issues",
      cell: (item: any) => `₦${(item.issues || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "labor",
      header: "Labor Cost",
      cell: (item: any) => `₦${(item.labor || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "overhead",
      header: "Overhead",
      cell: (item: any) => `₦${(item.overhead || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "balance",
      header: "WIP Balance",
      cell: (item: any) => (
        <span
          className={`font-semibold ${(item.balance || 0) > 0 ? "text-blue-600" : "text-gray-500"}`}
        >
          ₦{(item.balance || 0).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Work in Progress Summary</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const ProductionVarianceReport = ({ data }: { data: any }) => {
  const columns = [
    { key: "orderNo", header: "Order No", width: "w-32" },
    {
      key: "item",
      header: "Item",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.item?.sku || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.item?.name || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "qtyProduced",
      header: "Qty Produced",
      cell: (item: any) => (item.qtyProduced || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "actualMaterialCost",
      header: "Actual Material",
      cell: (item: any) =>
        `₦${(item.actualMaterialCost || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "materialVariance",
      header: "Material Variance",
      cell: (item: any) => (
        <span
          className={
            (item.materialVariance || 0) >= 0
              ? "text-red-600"
              : "text-green-600"
          }
        >
          ₦{Math.abs(item.materialVariance || 0).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "totalVariance",
      header: "Total Variance",
      cell: (item: any) => (
        <span
          className={
            (item.totalVariance || 0) >= 0 ? "text-red-600" : "text-green-600"
          }
        >
          ₦{Math.abs(item.totalVariance || 0).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Production Variance Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const SalesByItemReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "item",
      header: "Item",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.item?.sku || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.item?.name || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "totalQty",
      header: "Total Qty Sold",
      cell: (item: any) => (item.totalQty || 0).toLocaleString(),
      width: "w-32",
    },
    {
      key: "totalValue",
      header: "Total Value",
      cell: (item: any) => `₦${(item.totalValue || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "orderCount",
      header: "Order Count",
      cell: (item: any) => (item.orderCount || 0).toLocaleString(),
      width: "w-24",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Sales by Item Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const SalesByCustomerReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "customer",
      header: "Customer",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.customer?.name || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.customer?.code || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "totalValue",
      header: "Total Sales",
      cell: (item: any) => `₦${(item.totalValue || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "orderCount",
      header: "Order Count",
      cell: (item: any) => (item.orderCount || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "avgOrderValue",
      header: "Avg Order Value",
      cell: (item: any) => `₦${(item.avgOrderValue || 0).toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Sales by Customer Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const PurchasesByVendorReport = ({ data }: { data: any }) => {
  const columns = [
    {
      key: "vendor",
      header: "Vendor",
      cell: (item: any) => (
        <div>
          <div className="font-medium">{item.vendor?.name || "N/A"}</div>
          <div className="text-sm text-gray-500">
            {item.vendor?.code || "N/A"}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "totalValue",
      header: "Total Purchases",
      cell: (item: any) => `₦${(item.totalValue || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "orderCount",
      header: "Order Count",
      cell: (item: any) => (item.orderCount || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "avgOrderValue",
      header: "Avg Order Value",
      cell: (item: any) => `₦${(item.avgOrderValue || 0).toLocaleString()}`,
      width: "w-32",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Purchases by Vendor Report</h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

const ArApAgingReport = ({ data, type }: { data: any; type: "AR" | "AP" }) => {
  const columns =
    type === "AR"
      ? [
          {
            key: "customer",
            header: "Customer",
            cell: (item: any) => (
              <div>
                <div className="font-medium">
                  {item.customer?.name || "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  {item.customer?.code || "N/A"}
                </div>
              </div>
            ),
            width: "w-48",
          },
          { key: "orderNo", header: "Order No", width: "w-32" },
          {
            key: "orderDate",
            header: "Order Date",
            cell: (item: any) => new Date(item.orderDate).toLocaleDateString(),
            width: "w-32",
          },
          {
            key: "outstandingAmount",
            header: "Outstanding",
            cell: (item: any) =>
              `₦${(item.outstandingAmount || 0).toLocaleString()}`,
            width: "w-32",
          },
          {
            key: "daysPastDue",
            header: "Days Past Due",
            cell: (item: any) => item.daysPastDue || 0,
            width: "w-24",
          },
          {
            key: "agingBucket",
            header: "Aging Bucket",
            cell: (item: any) => (
              <StatusBadge status={item.agingBucket || "Current"} />
            ),
            width: "w-32",
          },
        ]
      : [
          {
            key: "vendor",
            header: "Vendor",
            cell: (item: any) => (
              <div>
                <div className="font-medium">{item.vendor?.name || "N/A"}</div>
                <div className="text-sm text-gray-500">
                  {item.vendor?.code || "N/A"}
                </div>
              </div>
            ),
            width: "w-48",
          },
          { key: "orderNo", header: "Order No", width: "w-32" },
          {
            key: "orderDate",
            header: "Order Date",
            cell: (item: any) => new Date(item.orderDate).toLocaleDateString(),
            width: "w-32",
          },
          {
            key: "outstandingAmount",
            header: "Outstanding",
            cell: (item: any) =>
              `₦${(item.outstandingAmount || 0).toLocaleString()}`,
            width: "w-32",
          },
          {
            key: "daysPastDue",
            header: "Days Past Due",
            cell: (item: any) => item.daysPastDue || 0,
            width: "w-24",
          },
          {
            key: "agingBucket",
            header: "Aging Bucket",
            cell: (item: any) => (
              <StatusBadge status={item.agingBucket || "Current"} />
            ),
            width: "w-32",
          },
        ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {type === "AR" ? "Accounts Receivable" : "Accounts Payable"} Aging
          Report
        </h2>
      </div>

      <DataTable data={data || []} columns={columns} />
    </div>
  );
};

export default Reports;
