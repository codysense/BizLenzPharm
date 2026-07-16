import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  DollarSign,
  Building,
  Calendar,
  Printer,
} from "lucide-react";
import { cashApi, purchaseApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";

// import { ReportExporter } from '../../lib/api';
import { toast } from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";
import CreateVendorRefundModal from "./CreateVendorRefundModal";

interface VendorRefund {
  id: string;
  refundNo: string;
  vendorId: string;
  amount: number;
  refundDate: string;
  reference?: string;
  notes?: string;
  vendor: {
    code: string;
    name: string;
  };
  cashAccount: {
    code: string;
    name: string;
    accountType: string;
  };
  purchase?: {
    orderNo: string;
    totalAmount: number;
  };
  user: {
    name: string;
  };
  //   transactionNo: string;
  //   amount: number;
  //   transactionDate: string;
}

const VendorRefunds = () => {
  const [page, setPage] = useState(1);
  const [vendorFilter, setVendorFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vendor-refunds", { page, vendorId: vendorFilter }],
    queryFn: () =>
      cashApi.getVendorRefunds({
        page,
        limit: 10,
        // transactionType: 'PAYMENT',
        ...(vendorFilter && { vendorId: vendorFilter }),
      }),
  });
  console.log(data);

  //   const { data: vendors } = useQuery({
  //     queryKey: ['vendors-for-payments'],
  //     queryFn: () => purchaseApi.getVendors({ limit: 100 })
  //   });

  const handlePrintPayment = async (payment: VendorRefund) => {
    try {
      // Create payment voucher content
      const voucherContent = document.createElement("div");
      voucherContent.id = "vendor-payment-print";
      voucherContent.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin-bottom: 10px;">PAYMENT VOUCHER</h1>
            <h2 style="color: #6b7280;">${payment.refundNo}</h2>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Vendor Details:</h3>
            <p><strong>Name:</strong> ${payment.vendor?.name || "N/A"}</p>
            <p><strong>Code:</strong> ${payment.vendor?.code || "N/A"}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Payment Details:</h3>
            <p><strong>Amount Paid:</strong> ₦${payment.amount.toLocaleString()}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.refundDate).toLocaleDateString()}</p>
            <p><strong>Cash Account:</strong> ${payment.cashAccount.name}</p>
            ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ""}
          </div>
          
          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            Paid by: ${payment.user.name}<br>
            Generated on ${new Date().toLocaleString()}<br>
            Bizlens Accounting Software-08033124491
          </div>
        </div>
      `;

      document.body.appendChild(voucherContent);

      await ReportExporter.exportToPDF(
        "vendor-payment-print",
        `vendor-payment-${payment.refundNo}.pdf`,
        `Vendor Payment Voucher - ${payment.refundNo}`,
      );

      document.body.removeChild(voucherContent);
      toast.success("Payment voucher printed successfully");
    } catch (error) {
      console.error("Print payment voucher error:", error);
    }
  };

  const columns = [
    {
      key: "refundNo",
      header: "Refund No",
      width: "w-32",
    },
    {
      key: "vendorName",
      header: "Vendor",
      width: "w-48",
    },
    {
      key: "amount",
      header: "Amount Refund",
      cell: (payment: VendorRefund) =>
        `₦${Number(payment.amount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "cashAccount",
      header: "Cash Account",
      cell: (payment: VendorRefund) => (
        <div>
          <div className="font-medium">{payment.cashAccount.name}</div>
          <div className="text-xs text-gray-500">
            {payment.cashAccount.accountType}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "reference",
      header: "Reference",
      cell: (payment: VendorRefund) => payment.reference || "-",
      width: "w-32",
    },
    {
      key: "refundDate",
      header: "Refund Date",
      cell: (payment: VendorRefund) =>
        new Date(payment.refundDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "userName",
      header: "Received By",
      width: "w-32",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (payment: VendorRefund) => (
        <button
          onClick={() => handlePrintPayment(payment)}
          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Print Payment Voucher"
        >
          <Printer className="h-4 w-4" />
        </button>
      ),
      width: "w-24",
    },
  ];

  const handleCreatePayment = () => {
    refetch();
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Refund</h1>
          <p className="text-gray-600">Record vendor refund</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Refund
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <VendorSelect value={vendorFilter} onChange={setVendorFilter} />
            {/* <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Vendors</option>
              {vendors?.vendors?.map((vendor: any) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.code} - {vendor.name}
                </option>
              ))}
            </select> */}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Payments
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
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
                <DollarSign className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-2xl font-bold text-red-600">
                    ₦
                    {data?.data
                      ?.reduce(
                        (sum: number, p: any) => sum + Number(p.amount),
                        0,
                      )
                      .toLocaleString() || "0"}
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
                    Today's Refunds
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {data?.data?.filter(
                      (p: any) =>
                        new Date(p.refundDate).toDateString() ===
                        new Date().toDateString(),
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {showCreateModal && (
        <CreateVendorRefundModal
          onSuccess={handleCreatePayment}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default VendorRefunds;
