import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Truck,
  FileText,
  Edit,
  Trash2,
  Printer,
} from "lucide-react";
import { managementApi, salesApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Sale } from "../../types/api";
import CreateSaleModal from "./CreateSaleModal";
import EditSaleModal from "./EditSaleModal";
import SaleDetailsModal from "./SaleDetailsModal";
import DeliverSaleModal from "./DeliverSaleModal";
import { useAuthStore } from "../../store/authStore";
import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import QRCode from "qrcode";

const SalesOrders = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const { user } = useAuthStore();

  // Check if user can perform actions (Accountant or GM only)
  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Manager") ||
    user?.roles.includes("Auditor") ||
    user?.roles.includes("Accountant");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sales", { page, status: statusFilter }],
    queryFn: () =>
      salesApi.getSales({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  // console.log("Fetched sales data:", data);

  //if user is not accountant or gm, filter sales to only those created by the user
  if (data && !canPerformActions) {
    data.sales = data.sales.filter(
      (sale: Sale) => sale.preparer?.name === user?.name,
    );
  }

  const columns = [
    {
      key: "orderNo",
      header: "Order No",
      width: "w-32",
    },
    {
      key: "customer.name",
      header: "Customer",
      cell: (sale: Sale) => (
        <div>
          <div className="font-medium">{sale.customer.name}</div>
          {sale.customer.outstandingBalance > 0 && (
            <div className="text-xs text-red-600">
              Owes: ₦{sale.customer.outstandingBalance.toLocaleString()}
            </div>
          )}
        </div>
      ),
      width: "w-48",
    },
    {
      key: "orderDate",
      header: "Order Date",
      cell: (sale: Sale) => new Date(sale.orderDate).toLocaleDateString(),
      width: "w-32",
    },

    {
      key: "totalAmount",
      header: "Total Amount",
      cell: (sale: Sale) => `₦${sale.totalAmount.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "preparer.name",
      header: "Prepared By",
      cell: (sale: Sale) => sale.preparer?.name || "N/A",
      width: "w-32",
    },

    {
      key: "status",
      header: "Status",
      cell: (sale: Sale) => <StatusBadge status={sale.status} />,
      width: "w-32",
    },
    {
      key: "saleLines",
      header: "Items",
      cell: (sale: Sale) => (
        <div className="text-sm text-gray-600">
          {sale.saleLines.length} item{sale.saleLines.length !== 1 ? "s" : ""}
        </div>
      ),
      width: "w-24",
    },
  ];

  const handleCreateSale = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditSale = () => {
    refetch();
    setShowEditModal(false);
    setSelectedSale(null);
  };

  const handleDeliverSuccess = () => {
    refetch();
    setShowDeliverModal(false);
    setSelectedSale(null);
  };

  const handleInvoiceSale = async (sale: Sale) => {
    try {
      await salesApi.invoiceSale(sale.id);
      toast.success("Sales order invoiced successfully");
      refetch();
    } catch (error) {
      console.error("Invoice sale error:", error);
    }
  };

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const handleDeleteSale = async (sale: Sale) => {
    if (
      confirm(`Are you sure you want to delete sales order ${sale.orderNo}?`)
    ) {
      try {
        await salesApi.deleteSale(sale.id);
        toast.success("Sales order deleted successfully");
        refetch();
      } catch (error) {
        console.error("Delete sale error:", error);
      }
    }
  };

  const handlePrintInvoice = async (sale: Sale) => {
    try {
      const printData = await salesApi.printSaleInvoice(sale.id);

      const company = companyInformations;
      const invoice = printData.printData;

      // Generate QR Code using invoice document number
      const qrData = await QRCode.toDataURL(`Invoice:${invoice.documentNo}`);

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
        <title>Invoice - ${invoice.documentNo}</title>

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

          <h1 style="margin-top:20px;">SALES INVOICE</h1>
          <h2>${invoice.documentNo}</h2>
        </div>

        <!-- CUSTOMER / INVOICE INFO -->
        <div class="grid">
          <div>
            <h3>Bill To</h3>
            <p><strong>${invoice.customer.name}</strong></p>
            <p>${invoice.customer.code}</p>
            ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ""}
          </div>

          <div>
            <h3>Invoice Details</h3>
            <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${sale.status}</p>
          </div>
        </div>

        <!-- INVOICE TABLE -->
        <table style="margin-top: 30px;">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lines
              .map(
                (line: any) => `
              <tr>
                <td>
                  <strong>${line.item.sku}</strong><br>
                  ${line.item.name}
                </td>
                <td style="text-align:right;">${line.qty} ${line.item.uom}</td>
                <td style="text-align:right;">₦${Number(line.unitPrice).toLocaleString()}</td>
                <td style="text-align:right;">₦${Number(line.lineTotal).toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>

          <tfoot>
            <tr style="background-color:#f3f4f6;">
              <td colspan="3" style="text-align:right; font-weight:bold;">Total Amount:</td>
              <td style="text-align:right; font-weight:bold;">₦${Number(invoice.total).toLocaleString()}</td>
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
      console.error("Print invoice error:", error);
    }
  };

  // const handlePrintInvoice = async (sale: Sale) => {
  //   try {
  //     const printData = await salesApi.printSaleInvoice(sale.id);

  //     // Create a temporary div for PDF generation
  //     const printContent = document.createElement('div');
  //     printContent.id = 'sales-invoice-print';
  //     printContent.innerHTML = `
  //       <div style="padding: 20px; font-family: Arial, sans-serif;">
  //         <div style="text-align: center; margin-bottom: 30px;">
  //           <h1 style="color: #1f2937; margin-bottom: 10px;">SALES INVOICE</h1>
  //           <h2 style="color: #6b7280;">${printData.printData.documentNo}</h2>
  //         </div>

  //         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Bill To:</h3>
  //             <p><strong>${printData.printData.customer.name}</strong></p>
  //             <p>${printData.printData.customer.code}</p>
  //             ${printData.printData.customer.address ? `<p>${printData.printData.customer.address}</p>` : ''}
  //           </div>
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Invoice Details:</h3>
  //             <p><strong>Date:</strong> ${new Date(printData.printData.date).toLocaleDateString()}</p>
  //             <p><strong>Status:</strong> ${sale.status}</p>
  //           </div>
  //         </div>

  //         <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
  //           <thead>
  //             <tr style="background-color: #f9fafb;">
  //               <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Item</th>
  //               <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Qty</th>
  //               <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Unit Price</th>
  //               <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Total</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             ${printData.printData.lines.map((line: any) => `
  //               <tr>
  //                 <td style="border: 1px solid #e5e7eb; padding: 12px;">
  //                   <strong>${line.item.sku}</strong><br>
  //                   ${line.item.name}
  //                 </td>
  //                 <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${line.qty} ${line.item.uom}</td>
  //                 <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">₦${line.unitPrice.toLocaleString()}</td>
  //                 <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">₦${line.lineTotal.toLocaleString()}</td>
  //               </tr>
  //             `).join('')}
  //           </tbody>
  //           <tfoot>
  //             <tr style="background-color: #f3f4f6;">
  //               <td colspan="3" style="border: 1px solid #e5e7eb; padding: 12px; text-align: right; font-weight: bold;">Total Amount:</td>
  //               <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right; font-weight: bold;">₦${printData.printData.total.toLocaleString()}</td>
  //             </tr>
  //           </tfoot>
  //         </table>

  //         <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
  //           Generated on ${new Date().toLocaleString()} | ProfitPilot ERP System
  //         </div>
  //       </div>
  //     `;

  //     document.body.appendChild(printContent);

  //     await ReportExporter.exportToPDF(
  //       'sales-invoice-print',
  //       `sales-invoice-${sale.orderNo}.pdf`,
  //       `Sales Invoice - ${sale.orderNo}`
  //     );

  //     document.body.removeChild(printContent);
  //     toast.success('Invoice exported successfully');
  //   } catch (error) {
  //     console.error('Print invoice error:', error);
  //   }
  // };

  const actions = (sale: Sale) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedSale(sale);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {["DRAFT", "CONFIRMED"].includes(sale.status) && canPerformActions && (
        <button
          onClick={() => {
            setSelectedSale(sale);
            setShowEditModal(true);
          }}
          className="text-blue-600 hover:text-blue-900"
          title="Edit Sale"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}
      {["DRAFT", "CONFIRMED"].includes(sale.status) && canPerformActions && (
        <button
          onClick={() => handleDeleteSale(sale)}
          className="text-red-600 hover:text-red-900"
          title="Delete Sale"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {["INVOICED", "PAID"].includes(sale.status) && (
        <button
          onClick={() => handlePrintInvoice(sale)}
          className="text-purple-600 hover:text-purple-900"
          title="Print Invoice"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      {sale.status === "CONFIRMED" && canPerformActions && (
        <button
          onClick={() => {
            setSelectedSale(sale);
            setShowDeliverModal(true);
          }}
          className="text-green-600 hover:text-green-900"
          title="Deliver"
        >
          <Truck className="h-4 w-4" />
        </button>
      )}
      {sale.status === "DELIVERED" && canPerformActions && (
        <button
          onClick={() => handleInvoiceSale(sale)}
          className="text-purple-600 hover:text-purple-900"
          title="Invoice"
        >
          <FileText className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Sales Orders</h1>
          <p className="text-gray-600">Manage sales orders and deliveries</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Sales Order
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DELIVERED">Delivered</option>
              <option value="INVOICED">Invoiced</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {["CONFIRMED", "DELIVERED", "INVOICED", "PAID"].map((status) => {
          const count =
            data?.sales?.filter((s: Sale) => s.status === status).length || 0;
          const total =
            data?.sales
              ?.filter((s: Sale) => s.status === status)
              .reduce(
                (sum: number, s: Sale) => sum + Number(s.totalAmount),
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
                    <Truck className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {status}
                      </dt>
                      <dd className="text-xl font-bold text-black/80">
                        {count} orders
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
        data={data?.sales || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSaleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSale}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSale && (
        <EditSaleModal
          sale={selectedSale}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSale(null);
          }}
          onSuccess={handleEditSale}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedSale(null);
          }}
        />
      )}

      {/* Deliver Modal */}
      {showDeliverModal && selectedSale && (
        <DeliverSaleModal
          sale={selectedSale}
          onClose={() => {
            setShowDeliverModal(false);
            setSelectedSale(null);
          }}
          onSuccess={handleDeliverSuccess}
        />
      )}
    </div>
  );
};

export default SalesOrders;
