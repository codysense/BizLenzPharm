import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Download,
  Filter,
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Upload,
  Package,
  Eye,
  Edit,
  Printer,
  Truck,
  FileText,
  MailboxIcon,
  Trash2,
  Receipt,
} from "lucide-react";
import { cashApi, managementApi } from "../../lib/api";
import { CashTransaction } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import CreateCashTransactionModal from "./CreateCashTransactionModal";
import BankReconciliationModal from "./BankReconciliationModal";
import ImportBankStatementModal from "./ImportBankStatementModal";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import EditCashTransactionModal from "./EditCashTransactionModal";
import ViewCashTransactionModal from "./ViewCashTransactionModal";
import QRCode from "qrcode";

// interface CashTransaction {
//   id: string;
//   transactionNo: string;
//   transactionType: 'RECEIPT' | 'PAYMENT';
//   amount: number;
//   description: string;
//   reference?: string;
//   transactionDate: string;
//   runningBalance: number;
//   cashAccount: {
//     code: string;
//     name: string;
//     accountType: string;
//   };
//   glAccount: {
//     code: string;
//     name: string;
//   };
//   contraAccount?: {
//     code: string;
//     name: string;
//   };
//   user: {
//     name: string;
//   };
// }

const Cashbook = () => {
  const [page, setPage] = useState(1);
  const [cashAccountFilter, setCashAccountFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCashTransaction, setselectedCashTransaction] =
    useState<CashTransaction | null>(null);
  const { user } = useAuthStore();

  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Accountant");

  //   useEffect(() => {
  //   console.log('Current page:', page);
  // }, [page]);

  const handleEditCashTransaction = () => {
    refetch();
    setShowEditModal(false);
    setselectedCashTransaction(null);
  };
  const handleViewCashTransaction = () => {
    refetch();
    setShowDetailsModal(false);
    setselectedCashTransaction(null);
  };
  const {
    data: cashTransactions,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "cashTransactions",
      {
        page,
        cashAccountId: cashAccountFilter,
        startDate: dateFromFilter,
        endDate: dateToFilter,
        excludeRefund: true,
        //  transactionType:transactionTypeFilter
      },
    ],
    queryFn: () => {
      // console.log('Fetching page:', page);
      return cashApi.getCashTransactions({
        page,
        limit: 10,
        ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
        ...(dateFromFilter && { startDate: dateFromFilter }),
        ...(dateToFilter && { endDate: dateToFilter }),
        excludeRefund: "true",
      });
    },
  });

  // console.log(cashTransactions)

  //   const { data, isLoading, refetch } = useQuery({
  //     queryKey: ['cashTransactions', {
  //       page,
  //       cashAccountId: cashAccountFilter,
  //       dateFrom: dateFromFilter,
  //       dateTo: dateToFilter
  //     }],
  //     queryFn: () => cashApi.getCashTransactions({
  //       page,
  //       limit: 20,
  //       ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
  //       ...(dateFromFilter && { dateFrom: dateFromFilter }),
  //       ...(dateToFilter && { dateTo: dateToFilter }),
  //     })
  //   });

  // // Debug logs
  // console.log('isLoading:', isLoading);
  // // console.log('error:', error);
  // console.log('raw data:', data);
  // console.log('data type:', typeof data);
  // console.log('data.data:', data?.data);

  // // Try to access the transactions
  // const cashTransactions = data?.data || [];
  // console.log('cashTransactions:', cashTransactions);
  // console.log('cashTransactions length:', cashTransactions.length);

  // // Filter out refunds
  // const filteredTransactions = cashTransactions.filter(
  //   transaction => transaction.transactionType !== 'REFUND'
  // );
  // console.log('filtered transactions:', filteredTransactions);
  // console.log('filtered length:', filteredTransactions.length);

  // const { data, isLoading, refetch } = useQuery({
  //     queryKey: ['cashTransactions', {
  //       page,
  //       cashAccountId: cashAccountFilter,
  //       dateFrom: dateFromFilter,
  //       dateTo: dateToFilter
  //     }],
  //     queryFn: () => cashApi.getCashTransactions({
  //       page,
  //       limit: 20,
  //       ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
  //       ...(dateFromFilter && { dateFrom: dateFromFilter }),
  //       ...(dateToFilter && { dateTo: dateToFilter }),
  //     })
  // });

  // // Get the transactions array from the response
  // const filteredTransactions = data?.data || [];

  // // Filter out REFUND transactions
  // const cashTransactions = filteredTransactions.filter(
  //   transaction => transaction.transactionType !== 'REFUND'
  // );

  // const { data:cashTransactions, isLoading, refetch } = useQuery({
  //     queryKey: ['cashTransactions', {
  //       page,
  //       cashAccountId: cashAccountFilter,
  //       dateFrom: dateFromFilter,
  //       dateTo: dateToFilter,
  //       // excludeRefunds: true
  //     }],
  //     queryFn: async () => {
  //  await cashApi.getCashTransactions({
  //     page,
  //     limit: 20,
  //     ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
  //     ...(dateFromFilter && { dateFrom: dateFromFilter }),
  //     ...(dateToFilter && { dateTo: dateToFilter }),
  //   });

  // return res.data.filter(t => t.transactionType !== 'REFUND');
  //}
  //});

  // const cashTransactions = data?.data || [];
  // console.log(cashTransactions)

  // const { data: cashBookData = [] } = useQuery({
  //   queryKey: ['cashbook', {
  //     page,
  //     cashAccountId: cashAccountFilter,
  //     dateFrom: dateFromFilter,
  //     dateTo: dateToFilter
  //   }],
  //   queryFn: () => cashApi.getCashbook({

  //     page,
  //     limit: 20,
  //     ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
  //     ...(dateFromFilter && { dateFrom: dateFromFilter }),
  //     ...(dateToFilter && { dateTo: dateToFilter })
  //   })
  // });

  //const cashbookData = (cashbookDataRaw.transactions).filter(entry => entry.glAccountId);

  //  console.log(cashbookDataRaw)

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-filter"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const columns = [
    {
      key: "transactionDate",
      header: "Date",
      cell: (transaction: CashTransaction) =>
        new Date(transaction.transactionDate).toLocaleDateString(),
      width: "w-24",
    },
    {
      key: "transactionNo",
      header: "Transaction No",
      width: "w-32",
    },

    // {
    //   key: "reference",
    //   header: "Reference",
    //   cell: (transaction: CashTransaction) => transaction.reference || "-",
    //   width: "w-32",
    // },
    // {
    //   key: 'glAccount',
    //   header: 'GL Account',
    //   cell: (transaction: CashTransaction) => (
    //     <div>
    //       <div className="font-medium">{transaction.CashTransactionLine.glAccountid}</div>
    //       <div className="text-xs text-gray-500">{transaction.glAccount?.name}</div>
    //     </div>
    //   ),
    //   width: 'w-48'
    // },
    {
      key: "cashAccount",
      header: "Cash Account",
      cell: (transaction: CashTransaction) =>
        transaction.cashAccount ? (
          <div>
            <div className="font-medium">{transaction.cashAccount.code}</div>
            <div className="text-xs text-gray-500">
              {transaction.cashAccount.name}
            </div>
          </div>
        ) : (
          "-"
        ),
      width: "w-48",
    },
    {
      key: "transactionType",
      header: "Transaction Type",
      width: "w-32",
    },

    {
      key: "refType",
      header: "Reference Type",
      cell: (transaction: CashTransaction) => transaction.refType || "-",
      width: "w-32",
    },

    {
      key: "amount",
      header: "Amount",
      cell: (transaction: CashTransaction) => (
        <span
          className={
            transaction.transactionType === "RECEIPT"
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {transaction.transactionType === "RECEIPT" ? "+" : "-"}₦
          {Number(transaction.amount).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    // {
    //   key: 'runningBalance',
    //   header: 'Running Balance',
    //   cell: (transaction: CashTransaction) => (
    //     <span className={`font-medium ${transaction.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
    //       ₦{transaction.runningBalance.toLocaleString()}
    //     </span>
    //   ),
    //   width: 'w-32'
    // },
    {
      key: "preparer.name",
      header: "Prepared By",
      width: "w-32",
    },
    {
      key: "approver.name",
      header: "Approved By",
      width: "w-32",
    },
    {
      key: "authorizer.name",
      header: "Authorized By",
      width: "w-32",
    },
    {
      key: "payer.name",
      header: "Paid By",
      width: "w-32",
    },
  ];

  const clearAllFilters = () => {
    setCashAccountFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters = cashAccountFilter || dateFromFilter || dateToFilter;

  const handleExport = async () => {
    try {
      const filters = {
        ...(cashAccountFilter && { cashAccountId: cashAccountFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
      };

      await cashApi.exportCashbook(filters);
      toast.success("Cashbook exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export cashbook");
    }
  };

  const handleCreateTransaction = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleReconciliation = () => {
    refetch();
    setShowReconciliationModal(false);
  };

  const handleImport = () => {
    refetch();
    setShowImportModal(false);
  };

  const handleApproveTransaction = async (cashTransaction: CashTransaction) => {
    try {
      await cashApi.approveCashTransaction(cashTransaction.id);
      toast.success("Cash Transaction approved successfully");
      refetch();
    } catch (error) {
      console.error("Cash Transaction approval:", error);
    }
  };
  const handleAuthorizeTransaction = async (
    cashTransaction: CashTransaction,
  ) => {
    try {
      await cashApi.authorizeCashTransaction(cashTransaction.id);
      toast.success("Cash Transaction authorized successfully");
      refetch();
    } catch (error) {
      console.error("Cash Transaction authorize:", error);
    }
  };
  const handlePayTransaction = async (cashTransaction: CashTransaction) => {
    try {
      await cashApi.payCashTransaction(cashTransaction.id);
      toast.success("Cash Transaction paid successfully");
      refetch();
    } catch (error) {
      console.error("Cash Transaction pay:", error);
    }
  };
  const handleDeleteCashTransaction = async (
    cashTransaction: CashTransaction,
  ) => {
    try {
      await cashApi.deleteCashTransaction(cashTransaction.id);
      toast.success("Cash Transaction deleted successfully");
      refetch();
    } catch (error) {
      console.error("Cash Transaction Delete:", error);
    }
  };

  // Calculate summary statistics
  // const totalReceipts = cashBookData?.transactions
  //   ?.filter((t: CashTransaction) => t.transactionType === 'RECEIPT')
  //   .reduce((sum: number, t: CashTransaction) => sum + Number(t.amount), 0) || 0;

  // const totalPayments = cashBookData?.transactions
  //   ?.filter((t: CashTransaction) => t.transactionType === 'PAYMENT')
  //   .reduce((sum: number, t: CashTransaction) => sum + Number(t.amount), 0) || 0;

  // const netCashFlow = totalReceipts - totalPayments;

  const actions = (cashTransaction: CashTransaction) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setselectedCashTransaction(cashTransaction);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {["PREPARED", "AUTHORIZED", "APPROVED"].includes(
        cashTransaction.status,
      ) &&
        canPerformActions && (
          <button
            onClick={() => {
              setselectedCashTransaction(cashTransaction);
              setShowEditModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit CashTransaction"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      {["PREPARED"].includes(cashTransaction.status) && canPerformActions && (
        <button
          onClick={() => handleDeleteCashTransaction(cashTransaction)}
          className="text-red-600 hover:text-red-900"
          title="Delete CashTransaction"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {["PAID"].includes(cashTransaction.status) && (
        <button
          onClick={() => handlePrintReceipt(cashTransaction)}
          className="text-purple-600 hover:text-purple-900"
          title="Print Invoice"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      {cashTransaction.status === "PREPARED" && canPerformActions && (
        <button
          onClick={() => {
            handleApproveTransaction(cashTransaction);
          }}
          className="text-green-600 hover:text-green-900"
          title="Approve"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
      {cashTransaction.status === "APPROVED" && canPerformActions && (
        <button
          onClick={() => handleAuthorizeTransaction(cashTransaction)}
          className="text-purple-600 hover:text-purple-900"
          title="Authorize"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
      {cashTransaction.status === "AUTHORIZED" && canPerformActions && (
        <button
          onClick={() => handlePayTransaction(cashTransaction)}
          className="text-purple-600 hover:text-purple-900"
          title="Pay"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const handlePrintReceipt = async (cashTransaction: CashTransaction) => {
    try {
      const printData = await cashApi.printCashReceipt(cashTransaction.id);

      const company = companyInformations;
      const receipt = printData.printData;
      console.log(printData);

      // Generate QR Code using receipt document number
      const qrData = await QRCode.toDataURL(`Receipt:${receipt.documentNo}`);

      // Logo from backend or fallback
      //const logoUrl = company.logoUrl || "/logo.png";

      // Open browser print window
      const printWindow = window.open("", "_blank", "width=900,height=1000");

      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }

      printWindow.document.write(`
          <html>
          <head>
            <title>Receipt - ${receipt.documentNo}</title>
    
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                width: 210mm;
                margin: auto;
                color: #111827;
              }
    
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
    
              .logo {
                width: 120px;
                margin-bottom: 10px;
              }
    
              h1, h2, h3 {
                margin: 5px 0;
              }
    
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
              }
    
              th, td {
                border: 1px solid #e5e7eb;
                padding: 12px;
              }
    
              th {
                background: #f3f4f6;
              }
    
              .grid {
                display: flex;
                // grid-template-columns: 1fr 1fr;
                // gap: 30px;
                justify-content:space-between;
                margin-top: 20px;
              }
    
              .qr-section {
                margin-top: 30px;
                text-align: right;
              }
    
              .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
                font-size: 14px;
              }
    
              .signature-box {
                width: 45%;
              }
    
              .signature-line {
                border-bottom: 1px solid #000;
                margin-top: 45px;
              }
    
              @media print {
                body {
                  width: 210mm;
                  height: 297mm;
                }
              }
            </style>
          </head>
    
          <body>
    
            <!-- HEADER -->
            <div class="header">
            
              <h1>${company.name}</h1>
              <h2>${company.address}</h2>
              <h2>${company.phone}</h2>
    
              <h1 style="margin-top:20px;">CASH RECEIPT</h1>
              <h2>${receipt.documentNo}</h2>
            </div>
    
            <!-- RECEIPT INFO -->
            <div class="grid">
              <div>
                <h3>Cash Account</h3>
                <p><strong>${printData.cashTransaction.cashAccount.name}</strong></p>
                <p>${printData.cashTransaction.cashAccount.accountNumber}</p>   
              </div>
    
              <div>
                <h3>Receipt Details</h3>
                <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${receipt.status}</p>
              </div>
            </div>
    
            <!-- RECEIPT TABLE -->
            <table style="margin-top: 30px;">
              <thead>
                <tr>
                  <th>GL Account</th>
                  <th style="text-align:right;">Amount</th>
                  <th style="text-align:right;">Description</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.lines
                  .map(
                    (line: any) => `
                  <tr>
                    <td>
                      <strong>${line.glAccount.code}</strong><br>
                      ${line.glAccount.name}
                    </td>
                    <td style="text-align:right;">₦${Number(line.lineAmount).toLocaleString()}</td>
                    <td style="text-align:right;">${line.description}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
    
              <tfoot>
                <tr style="background-color:#f3f4f6;">
                  <td colspan="2" style="text-align:right; font-weight:bold;">Total Amount:</td>
                  <td style="text-align:right; font-weight:bold;">₦${Number(receipt.total).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
    
            <!-- QR CODE -->
            <div class="qr-section">
              <img src="${qrData}" width="120"/>
              <p style="font-size:12px; color:#6b7280;">Scan for verification</p>
            </div>
    
            <!-- SIGNATURE SECTION -->
            <div class="signature-section">
              <div class="signature-box">
                <strong>Prepared By:</strong>
                <div class="signature-line"></div>
              </div>
    
              <div class="signature-box">
                <strong>Approved By:</strong>
                <div class="signature-line"></div>
              </div>
            </div>
    
            <!-- FOOTER -->
            <p style="text-align:center; color:#6b7280; margin-top:40px; font-size:12px;">
              Generated on ${new Date().toLocaleString()} | Bizlens Accounting Software-08033124491
            </p>
    
          </body>
          </html>
        `);

      printWindow.document.close();

      // Auto-print when window loads
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Print receipt error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Cashbook</h1>
          <p className="text-gray-600">
            Comprehensive cash and bank management
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-5 py-3 border text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emrald-500 ${
              showFilters
                ? "border-emrald-500 text-emrald-700 bg-emrald-50"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emrald-100 text-emrald-800">
                Active
              </span>
            )}
          </button>
          {/* <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Print Cashbook
          </button> */}
          {/* <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Statement
          </button>
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reconcile
          </button> */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Filter Options
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cash Account
              </label>
              <select
                value={cashAccountFilter}
                onChange={(e) => setCashAccountFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Accounts</option>
                {cashAccounts?.accounts?.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">
                Export Options
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Receipts
                  </dt>
                  <dd className="text-2xl font-semibold text-green-600">
                    ₦{totalReceipts.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Payments
                  </dt>
                  <dd className="text-2xl font-semibold text-red-600">
                    ₦{totalPayments.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className={`h-6 w-6 ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Net Cash Flow
                  </dt>
                  <dd className={`text-2xl font-semibold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₦{netCashFlow.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Transactions
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {cashTransactions?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* Cash Account Balances */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Cash Account Balances
          </h3>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cashAccounts?.accounts?.map((account: any) => (
              <div key={account.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {account.name}
                    </div>
                    <div className="text-sm text-gray-500">{account.code}</div>
                    <div className="text-xs text-gray-400">
                      {account.accountType}
                    </div>
                    {account.bankName && (
                      <div className="text-xs text-gray-400">
                        {account.bankName}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${
                        account.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ₦{Number(account.balance).toLocaleString()}
                    </div>
                    <StatusBadge
                      status={account.isActive ? "Active" : "Inactive"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {["PREPARED", "APPROVED", "AUTHORIZED", "PAID"].map((status) => {
          const count =
            cashTransactions?.data.filter((p: data) => p.status === status)
              .length || 0;
          const total =
            cashTransactions?.data
              .filter((p: data) => p.status === status)
              .reduce(
                (sum: number, p: CashTransaction) => sum + Number(p.amount),
                0,
              ) || 0;

          return (
            <div
              key={status}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {status}
                      </dt>
                      <dd className="text-xl font-bold text-black/80">
                        {count} transactions
                      </dd>
                      <dd className="text-sm text-gray-500">
                        ₦{total.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Table */}
      <DataTable
        data={cashTransactions?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={cashTransactions?.pagination}
        onPageChange={setPage}
        //currentPage={page}
        actions={actions}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateCashTransactionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateTransaction}
        />
      )}
      {showEditModal && (
        <EditCashTransactionModal
          transaction={selectedCashTransaction}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditCashTransaction}
        />
      )}
      {showDetailsModal && (
        <ViewCashTransactionModal
          transaction={selectedCashTransaction}
          onClose={() => setShowDetailsModal(false)}
          onSuccess={handleViewCashTransaction}
        />
      )}
      {showEditModal && (
        <EditCashTransactionModal
          transaction={selectedCashTransaction}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditCashTransaction}
        />
      )}

      {showReconciliationModal && (
        <BankReconciliationModal
          onClose={() => setShowReconciliationModal(false)}
          onSuccess={handleReconciliation}
        />
      )}

      {showImportModal && (
        <ImportBankStatementModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImport}
        />
      )}
    </div>
  );
};

export default Cashbook;
