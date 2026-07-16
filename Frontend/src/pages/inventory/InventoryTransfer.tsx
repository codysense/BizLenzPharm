import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ArrowRight,
  Package,
  Building,
  Edit,
  Printer,
  Eye,
} from "lucide-react";
import { inventoryApi, managementApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import CreateTransferModal from "./CreateTransferModal";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import DetailTransferModal from "./DetailTransferModal";

interface TransferItem {
  id: string;
  qty: string;
  unitCost: string;
  item: {
    sku: string;
    name: string;
    uom: string;
  };
}

interface InventoryTransfer {
  id: string;
  refId: string;
  createdAt: string;
  createdBy: {
    name: string;
  };
  fromWarehouse: {
    code: string;
    name: string;
  };
  toWarehouse: {
    code: string;
    name: string;
  };
  items: TransferItem[];
}

const getTotalQty = (items: TransferItem[]) =>
  items.reduce((sum, i) => sum + Number(i.qty), 0);

const getItemSummary = (items: TransferItem[]) =>
  items.map((i) => i.item.name).join(", ");

const InventoryTransfer = () => {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuthStore();

  // Check if user can create transfers (Inventory Manager or GM only)
  const canCreateTransfer =
    user?.roles.includes("Inventory Manager") ||
    user?.roles.includes("Assistant Inventory Manager") ||
    user?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-transfers", { page }],
    queryFn: () =>
      inventoryApi.getInventoryTransfers({
        page,
        limit: 10,
      }),
  });

  console.log("Fetched inventory transfers:", data);

  const [showViewTransferModal, setShowViewTransferModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] =
    useState<InventoryTransfer | null>(null);

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-transfer"],
    queryFn: () => managementApi.getCompanySettings(),
  });
  //   const { data: printInventoryTransfer } = useQuery({
  //   queryKey: ['print-inventory-transfer'],
  //   queryFn: () => inventoryApi.printInventoryTransfer(),
  //   enabled: false, // Disable automatic query execution
  // });

  // console.log(companyInformations);

  // console.log('Loading:', isLoading);

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      cell: (t: InventoryTransfer) =>
        new Date(t.createdAt).toLocaleDateString(),
      width: "w-24",
    },
    {
      key: "refId",
      header: "Ref No",
      width: "w-36",
    },
    {
      key: "items",
      header: "Items",
      cell: (t: InventoryTransfer) => (
        <span className="text-sm">{t.items.length} item(s)</span>
      ),
      width: "w-24",
    },
    {
      key: "itemsSummary",
      header: "Item Summary",
      cell: (t: InventoryTransfer) => (
        <span className="text-sm truncate block max-w-xs">
          {getItemSummary(t.items)}
        </span>
      ),
      width: "w-64",
    },
    {
      key: "quantity",
      header: "Total Qty",
      cell: (t: InventoryTransfer) => (
        <span className="font-medium">
          {getTotalQty(t.items).toLocaleString()}
        </span>
      ),
      width: "w-24",
    },
    {
      key: "fromWarehouse",
      header: "From",
      cell: (t: InventoryTransfer) => (
        <div className="flex items-center">
          <Building className="h-4 w-4 text-gray-400 mr-2" />
          {t.fromWarehouse.name}
        </div>
      ),
      width: "w-32",
    },
    {
      key: "toWarehouse",
      header: "To",
      cell: (t: InventoryTransfer) => (
        <div className="flex items-center">
          <ArrowRight className="h-4 w-4 text-blue-500 mr-2" />
          <Building className="h-4 w-4 text-gray-400 mr-2" />
          {t.toWarehouse.name}
        </div>
      ),
      width: "w-32",
    },
    {
      key: "createdBy",
      header: "Posted By",
      cell: (t: InventoryTransfer) => (
        <span className="text-sm">{t.createdBy?.name || "System"}</span>
      ),
      width: "w-40",
    },
  ];

  const handleCreateTransfer = () => {
    refetch();
    setShowCreateModal(false);
  };

  const actions = (inventoryTransfer: InventoryTransfer) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handlePrintTransfer(inventoryTransfer)}
        className="text-blue-600 hover:text-blue-900"
        title="Print Transfer"
      >
        <Printer className="h-4 w-4" />
      </button>

      <button
        onClick={() => {
          setSelectedTransfer(inventoryTransfer);
          setShowViewTransferModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Transfer"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );

  const handlePrintTransfer = async (transfer: InventoryTransfer) => {
    try {
      const printData = await inventoryApi.printInventoryTransfer(
        transfer.refId,
      );

      const company = companyInformations;
      const note = printData.printData;

      console.log("Print Data:", note);

      // Generate QR Code using transfer document number
      const qrData = await QRCode.toDataURL(`Transfer:${note.documentNo}`);

      // Open print window
      const printWindow = window.open("", "_blank", "width=900,height=1000");

      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }

      printWindow.document.write(`
      <html>
      <head>
        <title>${note.title} - ${note.documentNo}</title>

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

          h1, h2, h3 {
            margin: 5px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
          }

          th {
            background: #f3f4f6;
            text-align: left;
          }

          .grid {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
          }

          .qr-section {
            margin-top: 30px;
            text-align: right;
          }

          .signature-section {
            margin-top: 60px;
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

          <h1 style="margin-top:20px;">${note.title}</h1>
          <h2>${note.documentNo}</h2>
        </div>

        <!-- TRANSFER INFO -->
        <div class="grid">
          <div>
            <h3>From Warehouse</h3>
            <p><strong>${note.fromWarehouse.code}</strong></p>
            <p>${note.fromWarehouse.name}</p>
          </div>

          <div>
            <h3>To Warehouse</h3>
            <p><strong>${note.toWarehouse.code}</strong></p>
            <p>${note.toWarehouse.name}</p>
          </div>

          <div>
            <h3>Transfer Details</h3>
            <p><strong>Date:</strong> ${new Date(note.date).toLocaleDateString()}</p>
            <p><strong>Posted By:</strong> ${note.postedBy?.name || "System"}</p>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right;">Qty</th>
            
            </tr>
          </thead>

          <tbody>
            ${note.items
              .map(
                (line: any) => `
              <tr>
                <td>
                  <strong>${line.sku}</strong><br/>
                  ${line.name}
                </td>
                <td style="text-align:right;">
                  ${Number(line.qty).toLocaleString()} ${line.uom}
                </td>
               
              </tr>
            `,
              )
              .join("")}
          </tbody>

          <tfoot>
            <tr style="background-color:#f3f4f6;">
              <td style="text-align:right; font-weight:bold;">Totals</td>
              <td style="text-align:right; font-weight:bold;">
                ${note.totals.totalQty.toLocaleString()}
              </td>
              
            </tr>
          </tfoot>
        </table>

        <!-- QR CODE -->
        <div class="qr-section">
          <img src="${qrData}" width="120"/>
          <p style="font-size:12px; color:#6b7280;">Scan for verification</p>
        </div>

        <!-- SIGNATURES -->
        <div class="signature-section">
          <div class="signature-box">
            <strong>Issued By</strong>
            <div class="signature-line"></div>
          </div>

          <div class="signature-box">
            <strong>Received By</strong>
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

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } catch (error) {
      console.error("Print transfer error:", error);
      toast.error("Failed to print inventory transfer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Stock Transfers</h1>
          <p className="text-gray-600">Transfer stock between warehouses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Transfer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Transfers
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.pagination?.total || 0}
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
                <Package className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Transfers
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.transfers?.filter(
                      (t: InventoryTransfer) =>
                        new Date(t.createdAt).toDateString() ===
                        new Date().toDateString(),
                    ).length || 0}
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
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Items Moved
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.transfers
                      ?.reduce(
                        (sum: number, t: InventoryTransfer) =>
                          sum + getTotalQty(t.items),
                        0,
                      )
                      .toLocaleString() || "0"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.transfers || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTransferModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateTransfer}
        />
      )}

      {/* View Transfer Modal */}
      {showViewTransferModal && selectedTransfer && (
        <DetailTransferModal
          transfer={selectedTransfer}
          onClose={() => setShowViewTransferModal(false)}
        />
      )}

      {/* Access Denied for Transfer Creation */}
      {showCreateModal && !canCreateTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="text-center">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Access Restricted
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Only CFO and General Manager can create inventory transfers.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTransfer;
