import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  DollarSign,
  Building,
  Calendar,
  Printer,
  Package,
  Trash2,
  Eye,
  Edit,
} from "lucide-react";
import { cashApi, managementApi, purchaseApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import CreateVendorPaymentModal from "./CreateVendorPaymentModal";
import StatusBadge from "../../components/StatusBadge";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import EditVendorPaymentModal from "./EditVendorPaymentModal";
import ViewVendorPaymentModal from "./ViewVendorPaymentModal";
import QRCode from "qrcode";

interface VendorPayment {
  id: string;
  paymentNo: string;
  vendorId: string;
  totalAmount: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
  status: string;

  vendor: {
    code: string;
    name: string;
  };

  cashAccount: {
    code: string;
    name: string;
    accountType: string;
  };

  preparer?: {
    name: string;
  };

  approver?: {
    name: string;
  };

  authorizer?: {
    name: string;
  };
}

const VendorPayments = () => {
  const [page, setPage] = useState(1);
  const [vendorId, setVendorId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVendorPayment, setselectedVendorPayment] =
    useState<VendorPayment | null>(null);
  const { user } = useAuthStore();

  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Accountant");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vendor-payments", { page, vendorId, statusFilter }],
    queryFn: () =>
      cashApi.getVendorPayments({
        page,
        limit: 10,
        ...(vendorId && { vendorId }),
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const { data: companyInformations } = useQuery({
    queryKey: ["company-informatio"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-payments"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });
  console.log("Vendor payments ", data);

  const handlePrintPayment = async (vendorPayment: VendorPayment) => {
    try {
      const printData = await cashApi.printVendorPayment(vendorPayment.id);

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
            
                      <h1 style="margin-top:20px;">VENDOR PAYMENT</h1>
                      <h2>${receipt.documentNo}</h2>
                    </div>
            
                    <!-- RECEIPT INFO -->
                    <div class="grid">
                      <div>
                        <h3>Customer</h3>
                        <p><strong>${printData.payment.vendor.name}</strong></p>
                        <p>${printData.payment.vendor.code}</p>   
                        <p>${printData.payment.vendor.phone}</p>   
                      </div>
  
                      <div>
                  <h3>Cash Account</h3>
                  <p><strong>${printData.payment.cashAccount.name}</strong></p>
                  <p>${printData.payment.cashAccount.accountNumber}</p>   
                </div>
            
                  <div>
                    <h3>Payment Details</h3>
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

  const columns = [
    {
      key: "paymentNo",
      header: "Payment No",
      width: "w-32",
    },
    {
      key: "vendor.name",
      header: "Vendor",
      width: "w-48",
    },
    {
      key: "totalAmount",
      header: "Amount",
      cell: (p: VendorPayment) => `₦${p.totalAmount.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (p: VendorPayment) => <StatusBadge status={p.status} />,
      width: "w-32",
    },
    {
      key: "cashAccount.name",
      header: "Cash Account",
      cell: (p: VendorPayment) => (
        <div>
          <div className="font-medium">{p.cashAccount.name}</div>
          <div className="text-xs text-gray-500">
            {p.cashAccount.accountType}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "paymentDate",
      header: "Date",
      cell: (p: VendorPayment) => new Date(p.paymentDate).toLocaleDateString(),
      width: "w-32",
    },
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
    // {
    //   key: 'actions',
    //   header: 'Actions',
    //   cell: (p: VendorPayment) => (
    //     <button
    //       onClick={() => handlePrintPayment(p)}
    //       className="px-2 py-1 border rounded bg-white hover:bg-gray-50"
    //     >
    //       <Printer className="h-4 w-4" />
    //     </button>
    //   ),
    //   width: 'w-24',
    // },
  ];

  const handleEditVendorPayment = () => {
    refetch();
    setShowEditModal(false);
    setselectedVendorPayment(null);
  };
  const handleViewVendorPayment = () => {
    refetch();
    setShowDetailsModal(false);
    setselectedVendorPayment(null);
  };

  const handleApproveTransaction = async (vendorPayment: VendorPayment) => {
    try {
      await cashApi.approveVendorPayment(vendorPayment.id);
      toast.success("Vendor Payment approved successfully");
      refetch();
    } catch (error) {
      console.error("Vendor Payment approval:", error);
    }
  };
  const handleAuthorizeTransaction = async (vendorPayment: VendorPayment) => {
    try {
      await cashApi.authorizeVendorPayment(vendorPayment.id);
      toast.success("Vendor Payment authorized successfully");
      refetch();
    } catch (error) {
      console.error("Vendor Payment authorize:", error);
    }
  };
  const handlePayTransaction = async (vendorPayment: VendorPayment) => {
    try {
      await cashApi.payVendorPayment(vendorPayment.id);
      toast.success("Vendor Payment paid successfully");
      refetch();
    } catch (error) {
      console.error("Vendor Payment pay:", error);
    }
  };
  const handleDeleteVendorPayment = async (vendorPayment: VendorPayment) => {
    try {
      await cashApi.deleteVendorPayment(vendorPayment.id);
      toast.success("Vendor Payment deleted successfully");
      refetch();
    } catch (error) {
      console.error("Vendor Payment Delete:", error);
    }
  };

  const actions = (vendorPayment: VendorPayment) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setselectedVendorPayment(vendorPayment);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {["PREPARED", "AUTHORIZED", "APPROVED"].includes(vendorPayment.status) &&
        canPerformActions && (
          <button
            onClick={() => {
              setselectedVendorPayment(vendorPayment);
              setShowEditModal(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit VendorPayment"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      {["PREPARED"].includes(vendorPayment.status) && canPerformActions && (
        <button
          onClick={() => handleDeleteVendorPayment(vendorPayment)}
          className="text-red-600 hover:text-red-900"
          title="Delete VendorPayment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {["PAID"].includes(vendorPayment.status) && (
        <button
          onClick={() => handlePrintPayment(vendorPayment)}
          className="text-purple-600 hover:text-purple-900"
          title="Print Invoice"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      {vendorPayment.status === "PREPARED" && canPerformActions && (
        <button
          onClick={() => {
            handleApproveTransaction(vendorPayment);
          }}
          className="text-green-600 hover:text-green-900"
          title="Approve"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
      {vendorPayment.status === "APPROVED" && canPerformActions && (
        <button
          onClick={() => handleAuthorizeTransaction(vendorPayment)}
          className="text-purple-600 hover:text-purple-900"
          title="Authorize"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
      {vendorPayment.status === "AUTHORIZED" && canPerformActions && (
        <button
          onClick={() => handlePayTransaction(vendorPayment)}
          className="text-purple-600 hover:text-purple-900"
          title="Pay"
        >
          <DollarSign className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Vendor Payments</h1>
          <p className="text-gray-600">Manage and track supplier payments</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 inline-block mr-1" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Vendor</label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All Vendors</option>
            {vendors?.vendors?.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.code} - {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">All</option>
            <option value="Preapred">Prepared</option>
            <option value="APPROVED">Approved</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="PAID">Paid</option>
            {/* <option value="PARTIALLY_PAID">Partially Paid</option> */}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {["PREPARED", "APPROVED", "AUTHORIZED", "PAID"].map((status) => {
          const count =
            data?.data.filter((p: data) => p.status === status).length || 0;
          const total =
            data?.data
              .filter((p: data) => p.status === status)
              .reduce(
                (sum: number, p: VendorPayment) => sum + Number(p.totalAmount),
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
                      <dd className="text-2xl font-bold text-black/80">
                        {count} payments
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

      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded shadow">
          <Building className="h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="text-2xl font-semibold">{data?.totalItems || 0}</p>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <DollarSign className="h-6 w-6 text-red-400" />
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl text-red-600">
            ₦{data?.data?.reduce((sum: number, p: any) => sum + p.amountPaid, 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <Calendar className="h-6 w-6 text-blue-400" />
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-semibold">
            {data?.data?.filter(
              (p: any) =>
                new Date(p.paymentDate).toDateString() === new Date().toDateString()
            ).length || 0}
          </p>
        </div>
      </div> */}

      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        actions={actions}
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {showCreateModal && (
        <CreateVendorPaymentModal
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && (
        <EditVendorPaymentModal
          payment={selectedVendorPayment}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditVendorPayment}
        />
      )}
      {showDetailsModal && (
        <ViewVendorPaymentModal
          payment={selectedVendorPayment}
          onClose={() => setShowDetailsModal(false)}
          onSuccess={handleViewVendorPayment}
        />
      )}
    </div>
  );
};

export default VendorPayments;
