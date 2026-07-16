import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Package,
  FileText,
  Edit,
  Trash2,
  Printer,
} from "lucide-react";
import { managementApi, purchaseApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Purchase } from "../../types/api";
import CreatePurchaseModal from "./CreatePurchaseModal";
import EditPurchaseModal from "./EditPurchaseModal";
import PurchaseDetailsModal from "./PurchaseDetailsModal";
import ReceivePurchaseModal from "./ReceivePurchaseModal";
import { useAuthStore } from "../../store/authStore";
import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import QRCode from "qrcode";

const PurchaseOrders = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const { user } = useAuthStore();

  // Check if user can perform actions (CFO or GM only)
  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Inventory Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchases", { page, status: statusFilter }],
    queryFn: () =>
      purchaseApi.getPurchases({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      }),
  });
  // console.log("Purchases data:", data);

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const columns = [
    {
      key: "orderNo",
      header: "Order No",
      width: "w-32",
    },
    {
      key: "vendor.name",
      header: "Vendor",
      width: "w-48",
    },
    {
      key: "orderDate",
      header: "Order Date",
      cell: (purchase: Purchase) =>
        new Date(purchase.orderDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      cell: (purchase: Purchase) =>
        `₦${Number(purchase.totalAmount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "balanceAmount",
      header: "Balance Amount",
      cell: (purchase: Purchase) =>
        `₦${Number(purchase.balanceAmount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (purchase: Purchase) => <StatusBadge status={purchase.status} />,
      width: "w-32",
    },
    {
      key: "purchaseLines",
      header: "Items",
      cell: (purchase: Purchase) => (
        <div className="text-sm text-gray-600">
          {purchase.purchaseLines.length} item
          {purchase.purchaseLines.length !== 1 ? "s" : ""}
        </div>
      ),
      width: "w-24",
    },
  ];

  const handleCreatePurchase = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditPurchase = () => {
    refetch();
    setShowEditModal(false);
    setSelectedPurchase(null);
  };

  const handleReceiveSuccess = () => {
    refetch();
    setShowReceiveModal(false);
    setSelectedPurchase(null);
  };

  const handleInvoicePurchase = async (purchase: Purchase) => {
    try {
      await purchaseApi.invoicePurchase(purchase.id);
      toast.success("Purchase order invoiced successfully");
      refetch();
    } catch (error) {
      toast.error("Invoice purchase error:", error);
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (
      confirm(
        `Are you sure you want to delete purchase order ${purchase.orderNo}?`,
      )
    ) {
      try {
        await purchaseApi.deletePurchase(purchase.id);
        toast.success("Purchase order deleted successfully");
        refetch();
      } catch (error) {
        console.error("Delete purchase error:", error);
      }
    }
  };

  const handlePrintPurchaseOrder = async (purchase: Purchase) => {
    try {
      const printData = await purchaseApi.printPurchaseOrder(purchase.id);

      const company = companyInformations;
      const orderInfo = printData.printData;

      // Generate QR Code with document number
      const qrData = await QRCode.toDataURL(
        `PurchaseOrder:${orderInfo.documentNo}`,
      );

      // Logo from backend or fallback image
      // const logoUrl = company.logoUrl || "/logo.png";

      // Open browser print window
      const printWindow = window.open("", "_blank", "width=900,height=1000");

      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }

      printWindow.document.write(`
      <html>
      <head>
        <title>Purchase Order - ${orderInfo.documentNo}</title>

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

          <h1 style="margin-top:20px;">PURCHASE ORDER</h1>
          <h2>${orderInfo.documentNo}</h2>
        </div>

        <!-- VENDOR / ORDER INFO -->
        <div class="grid">
          <div>
            <h3>Vendor</h3>
            <p><strong>${orderInfo.vendor.name}</strong></p>
            <p>${orderInfo.vendor.code}</p>
            ${orderInfo.vendor.address ? `<p>${orderInfo.vendor.address}</p>` : ""}
          </div>

          <div>
            <h3>Order Details</h3>
            <p><strong>Date:</strong> ${new Date(orderInfo.date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${purchase.status}</p>
          </div>
        </div>

        <!-- PURCHASE ORDER TABLE -->
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
            ${orderInfo.lines
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
              <td style="text-align:right; font-weight:bold;">₦${Number(orderInfo.total).toLocaleString()}</td>
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

      // Auto print when fully loaded
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Print purchase order error:", error);
    }
  };

  // const handlePrintPurchaseOrder = async (purchase: Purchase) => {
  //   try {
  //     const printData = await purchaseApi.printPurchaseOrder(purchase.id);

  //     // Create a temporary div for PDF generation
  //     const printContent = document.createElement('div');
  //     printContent.id = 'purchase-order-print';
  //     printContent.innerHTML = `
  //       <div style="padding: 20px; font-family: Arial, sans-serif;">
  //         <div style="text-align: center; margin-bottom: 30px;">
  //           <h1 style="color: #1f2937; margin-bottom: 10px;">PURCHASE ORDER</h1>
  //           <h2 style="color: #6b7280;">${printData.printData.documentNo}</h2>
  //         </div>

  //         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Vendor:</h3>
  //             <p><strong>${printData.printData.vendor.name}</strong></p>
  //             <p>${printData.printData.vendor.code}</p>
  //             ${printData.printData.vendor.address ? `<p>${printData.printData.vendor.address}</p>` : ''}
  //           </div>
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Order Details:</h3>
  //             <p><strong>Date:</strong> ${new Date(printData.printData.date).toLocaleDateString()}</p>
  //             <p><strong>Status:</strong> ${purchase.status}</p>
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
  //           Generated on ${new Date().toLocaleString()} | Bizlens Accounting Software-08033124491
  //         </div>
  //       </div>
  //     `;

  //     document.body.appendChild(printContent);

  //     await ReportExporter.exportToPDF(
  //       'purchase-order-print',
  //       `purchase-order-${purchase.orderNo}.pdf`,
  //       `Purchase Order - ${purchase.orderNo}`
  //     );

  //     document.body.removeChild(printContent);
  //     toast.success('Purchase order exported successfully');
  //   } catch (error) {
  //     console.error('Print purchase order error:', error);
  //   }
  // };

  const actions = (purchase: Purchase) => {
    const isAssetPO = purchase.orderType === "ASSET";
    const isInventoryPO = purchase.orderType === "INVENTORY";

    return (
      <div className="flex space-x-2">
        {/* View – only for inventory POs */}
        {isInventoryPO ||
          (isAssetPO && (
            <button
              onClick={() => {
                setSelectedPurchase(purchase);
                setShowDetailsModal(true);
              }}
              className="text-blue-600 hover:text-blue-900"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          ))}

        {/* =================  DELETE FOR ASSET PO & INVENTORY ================= */}
        {canPerformActions &&
          ["DRAFT", "ORDERED"].includes(purchase.status) && (
            <button
              onClick={() => handleDeletePurchase(purchase)}
              className="text-red-600 hover:text-red-900"
              title="Delete Purchase"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

        {/* ================= INVENTORY PO ================= */}
        {isInventoryPO && (
          <>
            {/* Edit */}
            {["DRAFT", "ORDERED"].includes(purchase.status) &&
              canPerformActions && (
                <button
                  onClick={() => {
                    setSelectedPurchase(purchase);
                    setShowEditModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900"
                  title="Edit Purchase"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

            {/* Delete */}
            {/* {["DRAFT", "ORDERED"].includes(purchase.status) &&
              canPerformActions && (
                <button
                  onClick={() => handleDeletePurchase(purchase)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Purchase"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )} */}

            {/* Print */}
            {!["DRAFT"].includes(purchase.status) && (
              <button
                onClick={() => handlePrintPurchaseOrder(purchase)}
                className="text-purple-600 hover:text-purple-900"
                title="Print Purchase Order"
              >
                <Printer className="h-4 w-4" />
              </button>
            )}

            {/* Receive */}
            {purchase.status === "ORDERED" && canPerformActions && (
              <button
                onClick={() => {
                  setSelectedPurchase(purchase);
                  setShowReceiveModal(true);
                }}
                className="text-green-600 hover:text-green-900"
                title="Receive"
              >
                <Package className="h-4 w-4" />
              </button>
            )}

            {/* Invoice */}
            {purchase.status === "RECEIVED" && canPerformActions && (
              <button
                onClick={() => handleInvoicePurchase(purchase)}
                className="text-purple-600 hover:text-purple-900"
                title="Invoice"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Purchase Orders</h1>
          <p className="text-gray-600">Manage purchase orders and receipts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
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
              <option value="ORDERED">Ordered</option>
              <option value="RECEIVED">Received</option>
              <option value="INVOICED">Invoiced</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
        {["ORDERED", "RECEIVED", "INVOICED", "PARTIALLY_PAID", "PAID"].map(
          (status) => {
            const count =
              data?.purchases?.filter((p: Purchase) => p.status === status)
                .length || 0;
            const total =
              data?.purchases
                ?.filter((p: Purchase) => p.status === status)
                .reduce(
                  (sum: number, p: Purchase) => sum + Number(p.totalAmount),
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
          },
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.purchases || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePurchaseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreatePurchase}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPurchase && (
        <EditPurchaseModal
          purchase={selectedPurchase}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPurchase(null);
          }}
          onSuccess={handleEditPurchase}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPurchase && (
        <PurchaseDetailsModal
          purchase={selectedPurchase}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPurchase(null);
          }}
        />
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedPurchase && (
        <ReceivePurchaseModal
          purchase={selectedPurchase}
          onClose={() => {
            setShowReceiveModal(false);
            setSelectedPurchase(null);
          }}
          onSuccess={handleReceiveSuccess}
        />
      )}
    </div>
  );
};

export default PurchaseOrders;
