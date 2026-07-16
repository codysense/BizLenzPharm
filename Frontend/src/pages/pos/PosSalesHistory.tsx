import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Printer,
  RotateCcw,
  Calendar,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import { managementApi, posApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { PosSale } from "../../types/api";
// import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import DetailPOSSaleModal from "./DetailPOSSaleModal";
import { useAuthStore } from "../../store/authStore";

const PosSalesHistory = () => {
  const [page, setPage] = useState(1);
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<string>("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PosSale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [
      "pos-sales-history",
      {
        page,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        customerId: customerFilter,
        paymentMethod,
        userId: selectedCashier,
        status: "COMPLETED",
      },
    ],
    queryFn: () =>
      posApi.getSales({
        page,
        limit: 20,
        status: "COMPLETED",
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
        ...(selectedCashier && { userId: selectedCashier }),
        ...(paymentMethod && { paymentMethod: paymentMethod }),
      }),
  });

  const { user } = useAuthStore();

  //Filter sales to only those created by the user if they don't have permission to view all sales
  const canviewall =
    user?.roles?.includes("General Manager") ||
    user?.roles?.includes("Senior Accountant") ||
    user?.roles.includes("Manager");
  if (data && !canviewall) {
    data.sales = data.sales.filter(
      (sale: any) => sale.user?.name === user?.name,
    );
  }

  // console.log("Sales history data:", data);

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  useEffect(() => {
    if (data?.sales && cashiers.length === 0) {
      const unique = Object.values(
        data.sales.reduce((acc: any, sale: any) => {
          acc[sale.userId] = sale.user;
          return acc;
        }, {}),
      );
      setCashiers(unique);
    }
  }, [data?.sales]);

  const columns = [
    {
      key: "saleNo",
      header: "Sale No",
      width: "w-32",
    },
    {
      key: "customer.name",
      header: "Customer",
      cell: (sale: PosSale) => sale.customer?.name || "Walk-in Customer",
      width: "w-48",
    },
    {
      key: "createdAt",
      header: "Date & Time",
      cell: (sale: PosSale) => new Date(sale.createdAt).toLocaleString(),
      width: "w-40",
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      cell: (sale: PosSale) => `₦${sale.totalAmount.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "payments",
      header: "Payment",
      cell: (sale: PosSale) => (
        <div className="flex gap-1 flex-wrap">
          {sale.payments.map((p, i) => (
            <StatusBadge key={i} status={p.method} variant="info" />
          ))}
        </div>
      ),
      width: "w-32",
    },

    {
      key: "status",
      header: "Status",
      cell: (sale: PosSale) => <StatusBadge status={sale.status} />,
      width: "w-24",
    },
    {
      key: "saleLines",
      header: "Items",
      cell: (sale: PosSale) => `${sale.saleLines.length} items`,
      width: "w-20",
    },
    {
      key: "user.name",
      header: "Cashier",
      width: "w-32",
    },
  ];

  const handlePrintReceipt = async (sale: PosSale) => {
    try {
      const printData = await posApi.printReceipt(sale.id);
      const printerWidth = localStorage.getItem("printerWidth") || "80"; // default to 80mm
      const paperWidth = `${printerWidth}mm`;

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) throw new Error("Unable to open print window");

      const receiptHTML = `
      <html>
        <head>
          <title>Receipt - ${printData.documentNo}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }

            body {
              font-family: Arial, sans-serif;
              width: ${paperWidth};
              padding: 5mm;
              margin: 0;
            }

            h1, h2 {
              margin: 5px 0;
              font-size: 14px;
              text-align: center;
            }

            table {
              width: 100%;
              font-size: 11px;
              border-collapse: collapse;
              margin-bottom: 10px;
            }

            th, td {
              padding: 2px;
            }

            th {
              border-bottom: 1px solid #000;
              text-align: left;
            }

            td {
              text-align: right;
            }

            td:first-child {
              text-align: left;
            }

            .totals {
              border-top: 1px solid #000;
              padding-top: 5px;
              font-size: 12px;
            }

            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div>
            <h1>${companyInformations.name} </h1>
            <h2>${companyInformations.address}</h2>
            <h2>${companyInformations.phone}</h2>
          </div>
          <div style="text-align: center; margin-bottom: 15px;">
            <h1>SALES RECEIPT</h1>
            <h2>${printData.documentNo}</h2>
            <p>${new Date(printData.date).toLocaleString()}</p>
          </div>

          ${
            printData.customer
              ? `
            <div style="margin-bottom: 10px; font-size: 12px;">
              <strong>Customer:</strong> ${printData.customer.name}<br>
              <strong>Code:</strong> ${printData.customer.code}
            </div>
          `
              : ""
          }

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${printData.items
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>₦${item.unitPrice.toLocaleString()}</td>
                  <td>₦${item.lineTotal.toLocaleString()}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span> <span>₦${printData.totals.subtotal.toLocaleString()}</span>
            </div>
            ${
              printData.totals.discountAmount > 0
                ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span> <span>-₦${printData.totals.discountAmount.toLocaleString()}</span>
              </div>
            `
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Total:</span> <span>₦${printData.totals.totalAmount.toLocaleString()}</span>
            </div>
             ${
               printData.payments
                 ?.map(
                   (payment: any) => `
              <div style="display: flex; justify-content: space-between;">
                <span>Paid (${payment.method}):</span>
                <span>₦${payment.amount.toLocaleString()}</span>
              </div>
            `,
                 )
                 .join("") || ""
             }
            <div style="display: flex; justify-content: space-between;">
              <span>Change:</span>
              <span>₦${printData.totals.changeAmount.toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            Cashier: ${printData.cashier.name}<br>
            Thank you for your business!<br>
            Bizlens Accounting Software-08033124491
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `;

      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (error) {
      console.error("Print receipt error:", error);
    }
  };

  const handleViewDetails = (sale: PosSale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const actions = (sale: PosSale) => (
    <div className="flex space-x-2">
      {sale.status === "COMPLETED" && (
        <button
          onClick={() => handlePrintReceipt(sale)}
          className="text-blue-600 hover:text-blue-900"
          title="Print Receipt"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      {/* Include view button */}
      {sale.status === "COMPLETED" && (
        <button
          onClick={() => handleViewDetails(sale)}
          className="text-blue-600 hover:text-blue-900"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // Calculate summary stats
  const totalSales = data?.sales?.length || 0;

  console.log("Sales Payments: ", data?.sales);
  const totalRevenue =
    data?.sales?.reduce(
      (sum: number, sale: PosSale) => sum + Number(sale.totalAmount),
      0,
    ) || 0;
  const cashSales =
    data?.sales?.filter((sale: PosSale) => sale?.payments?.method === "CASH")
      .length || 0;
  const cardSales =
    data?.sales?.filter((sale: PosSale) => sale.payments?.method === "CARD")
      .length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Sales Analytics</p>

            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              POS Sales History
            </h1>

            <p className="text-gray-500 mt-2">
              View and manage all point-of-sale transactions and performance.
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50">
            <ShoppingCart className="h-7 w-7 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {/* Cashier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cashier
            </label>

            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cashiers</option>

              {cashiers.map((cashier: any) => (
                <option key={cashier.id} value={cashier.id}>
                  {cashier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                {totalSales}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50">
              <ShoppingCart className="h-6 w-6 text-gray-700" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                ₦{Number(totalRevenue).toLocaleString()}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-green-50">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Cash Sales */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Cash Sales</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                {cashSales}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Card Sales */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Card Sales</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                {cardSales}
              </h3>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
          <p className="text-sm text-gray-500 mt-1">All POS sales records</p>
        </div>

        <div className="p-4">
          <DataTable
            data={data?.sales || []}
            columns={columns}
            loading={isLoading}
            pagination={data?.pagination}
            onPageChange={setPage}
            actions={actions}
          />
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedSale && (
        <DetailPOSSaleModal
          sale={selectedSale}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );

  // return (
  //   <div className="space-y-6">
  //     {/* Header */}
  //     <div className="flex justify-between items-center">
  //       <div>
  //         <h1 className="text-2xl font-bold text-gray-900">
  //           POS Sales History
  //         </h1>
  //         <p className="text-gray-600">
  //           View and manage point of sales transactions
  //         </p>
  //       </div>
  //     </div>

  //     {/* Filters */}
  //     <div className="bg-white p-4 rounded-lg shadow">
  //       <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
  //         <div>
  //           <label className="block text-sm font-medium text-gray-700 mb-1">
  //             Date From
  //           </label>
  //           <input
  //             type="date"
  //             value={dateFromFilter}
  //             onChange={(e) => setDateFromFilter(e.target.value)}
  //             className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //           />
  //         </div>

  //         <div>
  //           <label className="block text-sm font-medium text-gray-700 mb-1">
  //             Date To
  //           </label>
  //           <input
  //             type="date"
  //             value={dateToFilter}
  //             onChange={(e) => setDateToFilter(e.target.value)}
  //             className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //           />
  //         </div>
  //         <div>
  //           <label className="block text-sm font-medium text-gray-700 mb-1">
  //             Payment Method
  //           </label>
  //           <select
  //             value={paymentMethod}
  //             onChange={(e) => setPaymentMethod(e.target.value)}
  //             className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //           >
  //             <option value="">All</option>
  //             <option value="CASH">Cash</option>
  //             <option value="CARD">Card</option>
  //             <option value="TRANSFER">Transfer</option>
  //           </select>
  //         </div>
  //         <div>
  //           <label className="block text-sm font-medium text-gray-700 mb-1">
  //             Cashier
  //           </label>

  //           <select
  //             className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
  //             value={selectedCashier}
  //             onChange={(e) => setSelectedCashier(e.target.value)}
  //           >
  //             <option value="">All</option>

  //             {cashiers.map((cashier: any) => (
  //               <option key={cashier.id} value={cashier.id}>
  //                 {cashier.name}
  //               </option>
  //             ))}
  //           </select>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Stats */}
  //     <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0">
  //               <ShoppingCart className="h-6 w-6 text-gray-400" />
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Total Sales
  //                 </dt>
  //                 <dd className="text-2xl font-semibold text-gray-900">
  //                   {totalSales}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0">
  //               <DollarSign className="h-6 w-6 text-green-400" />
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Total Revenue
  //                 </dt>
  //                 <dd className="text-2xl font-semibold text-gray-900">
  //                   ₦{Number(totalRevenue).toLocaleString()}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0">
  //               <DollarSign className="h-6 w-6 text-blue-400" />
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Cash Sales
  //                 </dt>
  //                 <dd className="text-2xl font-semibold text-gray-900">
  //                   {cashSales}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <div className="bg-white overflow-hidden shadow rounded-lg">
  //         <div className="p-5">
  //           <div className="flex items-center">
  //             <div className="flex-shrink-0">
  //               <Calendar className="h-6 w-6 text-purple-400" />
  //             </div>
  //             <div className="ml-5 w-0 flex-1">
  //               <dl>
  //                 <dt className="text-sm font-medium text-gray-500 truncate">
  //                   Card Sales
  //                 </dt>
  //                 <dd className="text-2xl font-semibold text-gray-900">
  //                   {cardSales}
  //                 </dd>
  //               </dl>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Data Table */}
  //     <DataTable
  //       data={data?.sales || []}
  //       columns={columns}
  //       loading={isLoading}
  //       pagination={data?.pagination}
  //       onPageChange={setPage}
  //       actions={actions}
  //     />

  //     {/* Details Modal */}
  //     {showDetailsModal && selectedSale && (
  //       <DetailPOSSaleModal
  //         sale={selectedSale}
  //         onClose={() => {
  //           setShowDetailsModal(false);
  //           setSelectedSale(null);
  //         }}
  //       />
  //     )}
  //   </div>
  // );
};

export default PosSalesHistory;
