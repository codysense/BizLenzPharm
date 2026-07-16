import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Play, Package, Eye, Edit, Trash2, Printer } from "lucide-react";
import { Clock, DollarSign, CheckCircle, X, RotateCcw } from "lucide-react";
import { managementApi, productionApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { ProductionOrder } from "../../types/api";
import CreateProductionOrderModal from "./CreateProductionOrderModal";
import EditProductionOrderModal from "./EditProductionOrderModal";
import ProductionDetailsModal from "./ProductionDetailsModal";
import IssueMaterialsModal from "./IssueMaterialsModal";
import AddLaborModal from "./AddLaborModal";
import AddOverheadModal from "./AddOverheadModal";
import ReceiveFinishedGoodsModal from "./ReceiveFinishedGoodsModal";
import { useAuthStore } from "../../store/authStore";
import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import QRCode from "qrcode";

const ProductionOrders = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showIssueMaterialsModal, setShowIssueMaterialsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLaborModal, setShowAddLaborModal] = useState(false);
  const [showAddOverheadModal, setShowAddOverheadModal] = useState(false);
  const [showReceiveFGModal, setShowReceiveFGModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null,
  );
  const { user } = useAuthStore();

  // Check if user can perform actions (CFO or GM only)
  const canPerformActions =
    user?.roles.includes("Production Manager") ||
    user?.roles.includes("General Manager");

  const canReverseOrder = user?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["production-orders", { page, status: statusFilter }],
    queryFn: () =>
      productionApi.getProductionOrders({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

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
      key: "item.name",
      header: "Item",
      width: "w-48",
    },
    {
      key: "qtyTarget",
      header: "Target Qty",
      cell: (order: ProductionOrder) => `${order.qtyTarget} ${order.item.type}`,
      width: "w-32",
    },
    {
      key: "qtyProduced",
      header: "Produced",
      cell: (order: ProductionOrder) =>
        `${order.qtyProduced} ${order.item.type}`,
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (order: ProductionOrder) => <StatusBadge status={order.status} />,
      width: "w-32",
    },
    {
      key: "warehouse.name",
      header: "Warehouse",
      width: "w-32",
    },
    {
      key: "startedAt",
      header: "Started",
      cell: (order: ProductionOrder) =>
        order.startedAt ? new Date(order.startedAt).toLocaleDateString() : "-",
      width: "w-32",
    },
  ];

  const handleCreateOrder = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditOrder = () => {
    refetch();
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  const handleActionSuccess = () => {
    refetch();
    setShowIssueMaterialsModal(false);
    setShowAddLaborModal(false);
    setShowAddOverheadModal(false);
    setShowReceiveFGModal(false);
    setSelectedOrder(null);
  };

  const handleReleaseOrder = async (order: ProductionOrder) => {
    try {
      await productionApi.releaseProductionOrder(order.id);
      toast.success("Production order released successfully");
      refetch();
    } catch (error) {
      console.error("Release error:", error);
    }
  };

  const handleReverseOrder = async (order: ProductionOrder) => {
    try {
      // Confirm reversal
      if (
        !confirm(
          `Are you sure you want to reverse production order ${order.orderNo}? This will undo all transactions related to this order.`,
        )
      ) {
        return;
      }

      await productionApi.reverseProductionOrder(order.id);
      toast.success("Production order reversed successfully");
      refetch();
    } catch (error) {
      console.error("Reverse order error:", error);
    }
  };

  const handleFinishOrder = async (order: ProductionOrder) => {
    try {
      await productionApi.finishProductionOrder(order.id);
      toast.success("Production order closed successfully");
      refetch();
    } catch (error) {
      console.error("Finish order error:", error);
    }
  };

  const handleDeleteOrder = async (order: ProductionOrder) => {
    if (
      confirm(
        `Are you sure you want to delete production order ${order.orderNo}?`,
      )
    ) {
      try {
        await productionApi.deleteProductionOrder(order.id);
        toast.success("Production order deleted successfully");
        refetch();
      } catch (error) {
        console.error("Delete order error:", error);
      }
    }
  };

  const handlePrintOrder = async (order: ProductionOrder) => {
    try {
      const printData = await productionApi.printProductionOrder(order.id);

      const company = companyInformations;
      const orderInfo = printData.printData;

      // Generate QR Code (base64 image)
      const qrData = await QRCode.toDataURL(
        `ProductionOrder:${orderInfo.documentNo}`,
      );

      // If you have a logo URL from backend
      //const logoUrl = company.logoUrl || "/logo.png";

      // Create print window
      const printWindow = window.open("", "_blank", "width=900,height=1000");

      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }

      printWindow.document.write(`
      <html>
      <head>
        <title>Production Order - ${orderInfo.documentNo}</title>
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
            padding: 8px;
          }

          th {
            background: #f3f4f6;
          }

          .grid {
            display: flex;
            // grid-template-columns: 1fr 1fr;
            // gap: 50px;
            justify-content:space-between;
            margin-top: 20px;
          }

          .qr-section {
            margin-top: 20px;
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
            margin-top: 40px;
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

          <h1 style="margin-top:20px;">PRODUCTION ORDER</h1>
          <h2>${orderInfo.documentNo}</h2>
        </div>

        <!-- DETAILS -->
        <div class="grid">
          <div>
            <h3>Item Details</h3>
            <p><strong>SKU:</strong> ${orderInfo.item.sku}</p>
            <p><strong>Name:</strong> ${orderInfo.item.name}</p>
            <p><strong>Type:</strong> ${orderInfo.item.type}</p>
          </div>
          <div>
            <h3>Production Details</h3>
            <p><strong>Target Qty:</strong> ${orderInfo.qtyTarget}</p>
            <p><strong>Warehouse:</strong> ${orderInfo.warehouse.name}</p>
            <p><strong>Status:</strong> ${orderInfo.status}</p>
          </div>
        </div>

        <!-- BOM -->
        ${
          orderInfo.bom
            ? `
          <h3 style="margin-top:30px;">Bill of Materials (Version ${orderInfo.bom.version})</h3>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Qty Per Unit</th>
                <th>Total Required</th>
                <th>Scrap %</th>
              </tr>
            </thead>
            <tbody>
              ${orderInfo.bom.bomLines
                .map(
                  (line: any) => `
                <tr>
                  <td>
                    <strong>${line.componentItem.sku}</strong><br/>
                    ${line.componentItem.name}
                  </td>
                  <td style="text-align:right">${line.qtyPer} ${line.componentItem.uom}</td>
                  <td style="text-align:right">
                    ${(Number(line.qtyPer) * Number(orderInfo.qtyTarget)).toFixed(3)} 
                    ${line.componentItem.uom}
                  </td>
                  <td style="text-align:right">${line.scrapPercent}%</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `
            : ""
        }

        <!-- QR CODE -->
        <div class="qr-section">
          <img src="${qrData}" width="120"/>
          <p style="font-size:12px; color:#6b7280;">Scan for verification</p>
        </div>

        <!-- SIGNATURE -->
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

        <p style="text-align:center; color:#6b7280; margin-top:40px; font-size:12px;">
          Generated on ${new Date().toLocaleString()} | Bizlens Accounting Software-08033124491
        </p>

      </body>
      </html>
    `);

      printWindow.document.close();

      // Auto print when ready
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Print production order error:", error);
    }
  };

  // const handlePrintOrder = async (order: ProductionOrder) => {
  //   try {
  //     const printData = await productionApi.printProductionOrder(order.id);

  //     // Create a temporary div for PDF generation
  //     const printContent = document.createElement('div');
  //     printContent.id = 'production-order-print';
  //     printContent.innerHTML = `

  //       <div style="padding: 20px; font-family: Arial, sans-serif;">
  //         <div style="text-align: center; margin-bottom: 30px;">

  //           <h1 style="color: #1f2937; margin-bottom: 10px;">PRODUCTION ORDER</h1>
  //           <h2 style="color: #6b7280;">${printData.printData.documentNo}</h2>
  //         </div>

  //         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Item Details:</h3>
  //             <p><strong>SKU:</strong> ${printData.printData.item.sku}</p>
  //             <p><strong>Name:</strong> ${printData.printData.item.name}</p>
  //             <p><strong>Type:</strong> ${printData.printData.item.type}</p>
  //           </div>
  //           <div>
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Production Details:</h3>
  //             <p><strong>Target Qty:</strong> ${printData.printData.qtyTarget}</p>
  //             <p><strong>Warehouse:</strong> ${printData.printData.warehouse.name}</p>
  //             <p><strong>Status:</strong> ${printData.printData.status}</p>
  //           </div>
  //         </div>

  //         ${printData.printData.bom ? `
  //           <div style="margin-bottom: 30px;">
  //             <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">Bill of Materials (Version ${printData.printData.bom.version}):</h3>
  //             <table style="width: 100%; border-collapse: collapse;">
  //               <thead>
  //                 <tr style="background-color: #f9fafb;">
  //                   <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Component</th>
  //                   <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Qty Per Unit</th>
  //                   <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Total Required</th>
  //                   <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Scrap %</th>
  //                 </tr>
  //               </thead>
  //               <tbody>
  //                 ${printData.printData.bom.bomLines.map((line: any) => `
  //                   <tr>
  //                     <td style="border: 1px solid #e5e7eb; padding: 12px;">
  //                       <strong>${line.componentItem.sku}</strong><br>
  //                       ${line.componentItem.name}
  //                     </td>
  //                     <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${line.qtyPer} ${line.componentItem.uom}</td>
  //                     <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${(Number(line.qtyPer) * Number(printData.printData.qtyTarget)).toFixed(3)} ${line.componentItem.uom}</td>
  //                     <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">${line.scrapPercent}%</td>
  //                   </tr>
  //                 `).join('')}
  //               </tbody>
  //             </table>
  //           </div>
  //         ` : ''}

  //         <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
  //           Generated on ${new Date().toLocaleString()} | Bizlens Accounting Software-08033124491
  //         </div>
  //       </div>
  //     `;

  //     document.body.appendChild(printContent);

  //     await ReportExporter.exportToPDF(
  //       'production-order-print',
  //       `production-order-${order.orderNo}.pdf`,
  //       `Production Order - ${order.orderNo}`
  //     );

  //     document.body.removeChild(printContent);
  //     toast.success('Production order exported successfully');
  //   } catch (error) {
  //     console.error('Print production order error:', error);
  //   }
  // };

  const actions = (order: ProductionOrder) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedOrder(order);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {["PLANNED", "RELEASED"].includes(order.status) && canPerformActions && (
        <button
          onClick={() => {
            setSelectedOrder(order);
            setShowEditModal(true);
          }}
          className="text-blue-600 hover:text-blue-900"
          title="Edit Order"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}
      {["PLANNED", "RELEASED"].includes(order.status) && canPerformActions && (
        <button
          onClick={() => handleDeleteOrder(order)}
          className="text-red-600 hover:text-red-900"
          title="Delete Order"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {["RELEASED", "IN_PROGRESS", "FINISHED"].includes(order.status) && (
        <button
          onClick={() => handlePrintOrder(order)}
          className="text-purple-600 hover:text-purple-900"
          title="Print Production Order"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      {order.status === "PLANNED" && canPerformActions && (
        <button
          onClick={() => handleReleaseOrder(order)}
          className="text-green-600 hover:text-green-900"
          title="Release"
        >
          <Play className="h-4 w-4" />
        </button>
      )}
      {order.status === "RELEASED" && canPerformActions && (
        <button
          onClick={() => {
            setSelectedOrder(order);
            setShowIssueMaterialsModal(true);
          }}
          className="text-orange-600 hover:text-orange-900"
          title="Issue Materials"
        >
          <Package className="h-4 w-4" />
        </button>
      )}
      {order.status === "IN_PROGRESS" && canPerformActions && (
        <>
          <button
            onClick={() => {
              setSelectedOrder(order);
              setShowAddLaborModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Add Labor"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOrder(order);
              setShowAddOverheadModal(true);
            }}
            className="text-purple-600 hover:text-purple-900"
            title="Add Overhead"
          >
            <DollarSign className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOrder(order);
              setShowReceiveFGModal(true);
            }}
            className="text-green-600 hover:text-green-900"
            title="Receive Finished Goods"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        </>
      )}

      {["IN_PROGRESS", "FINISHED"].includes(order.status) &&
        canReverseOrder && (
          <button
            onClick={() => handleReverseOrder(order)}
            className="text-red-600 hover:text-red-900"
            title="Reverse Order"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

      {order.status === "FINISHED" && canPerformActions && (
        <button
          onClick={() => handleFinishOrder(order)}
          className="text-gray-600 hover:text-gray-900"
          title="Close Order"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">
            Production Orders
          </h1>
          <p className="text-gray-600">
            Manage manufacturing orders and operations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Production Order
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
              <option value="PLANNED">Planned</option>
              <option value="RELEASED">Released</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FINISHED">Finished</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {["PLANNED", "RELEASED", "IN_PROGRESS", "FINISHED"].map((status) => {
          const count =
            data?.orders?.filter((o: ProductionOrder) => o.status === status)
              .length || 0;
          const totalQty =
            data?.orders
              ?.filter((o: ProductionOrder) => o.status === status)
              .reduce(
                (sum: number, o: ProductionOrder) => sum + Number(o.qtyTarget),
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
                        {status.replace("_", " ")}
                      </dt>
                      <dd className="text-xl font-bold text-black/80">
                        {count} orders
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {totalQty} units
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
        data={data?.orders || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProductionOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateOrder}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <EditProductionOrderModal
          order={selectedOrder}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleEditOrder}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedOrder && (
        <ProductionDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Issue Materials Modal */}
      {showIssueMaterialsModal && selectedOrder && (
        <IssueMaterialsModal
          order={selectedOrder}
          onClose={() => {
            setShowIssueMaterialsModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Add Labor Modal */}
      {showAddLaborModal && selectedOrder && (
        <AddLaborModal
          order={selectedOrder}
          onClose={() => {
            setShowAddLaborModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Add Overhead Modal */}
      {showAddOverheadModal && selectedOrder && (
        <AddOverheadModal
          order={selectedOrder}
          onClose={() => {
            setShowAddOverheadModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Receive Finished Goods Modal */}
      {showReceiveFGModal && selectedOrder && (
        <ReceiveFinishedGoodsModal
          order={selectedOrder}
          onClose={() => {
            setShowReceiveFGModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
};

export default ProductionOrders;
