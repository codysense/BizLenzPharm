import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Eye, DollarSign, Users, Calendar, Printer } from "lucide-react";
import { cashApi, salesApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import CreateCustomerRefundModal from "./CreateCustomerRefundModal";
// import { ReportExporter } from '../../lib/reportExporter';
import { toast } from "react-hot-toast";
import { CustomerSelect } from "../../components/CustomerSelect";
// import { CustomerSelect } from '../../components/CustomerSelect';

interface CustomerRefund {
  id: string;
  refundNo: string;
  customerId: string;
  amountRefunded: number;
  createdAt: string;
  reference?: string;
  notes?: string;
  customer: {
    code: string;
    name: string;
  };
  cashAccount: {
    code: string;
    name: string;
    accountType: string;
  };
  sale?: {
    orderNo: string;
    totalAmount: number;
  };
  user: {
    name: string;
  };
}

const CustomerRefunds = () => {
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customer-refunds", { page, customerId: customerFilter }],
    queryFn: () =>
      cashApi.getCustomerRefunds({
        page,
        limit: 10,
        //transactionType: 'RECEIPT',
        ...(customerFilter && { customerId: customerFilter }),
      }),
  });
  // const { data:trn } = useQuery({
  //   queryKey: ['customer-payments', { page, customerId: customerFilter }],
  //   queryFn: () => cashApi.getCashTransactions({
  //     page,
  //     limit: 10,
  //     transactionType: 'RECEIPT',
  //   ...(customerFilter && { customerId: customerFilter })
  //   })
  // });

  // console.log(trn)

  //   const { data: customers } = useQuery({
  //     queryKey: ['customers-for-refunds'],
  //     queryFn: () => salesApi.getCustomers({ limit: 100 })
  //   });

  const handlePrintPayment = async (payment: CustomerRefund) => {
    try {
      // Create payment receipt content
      const receiptContent = document.createElement("div");
      receiptContent.id = "customer-payment-print";
      receiptContent.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin-bottom: 10px;">PAYMENT RECEIPT</h1>
            <h2 style="color: #6b7280;">${payment.refundNo}</h2>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Customer Details:</h3>
            <p><strong>Name:</strong> ${payment.customer.name}</p>
            <p><strong>Code:</strong> ${payment.customer.code}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Payment Details:</h3>
            <p><strong>Amount Received:</strong> ₦${payment.amountRefunded.toLocaleString()}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
            <p><strong>Cash Account:</strong> ${payment.cashAccount.name}</p>
            ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ""}
          </div>
          
          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            Received by: ${payment.user.name}<br>
            Generated on ${new Date().toLocaleString()}<br>
            ProfitPilot ERP System
          </div>
        </div>
      `;

      document.body.appendChild(receiptContent);

      await ReportExporter.exportToPDF(
        "customer-payment-print",
        `customer-payment-${payment.refundNo}.pdf`,
        `Customer Payment Receipt - ${payment.refundNo}`,
      );

      document.body.removeChild(receiptContent);
      toast.success("Payment refund printed successfully");
    } catch (error) {
      console.error("Print payment refund error:", error);
    }
  };

  const columns = [
    {
      key: "refundNo",
      header: "Refund No",
      width: "w-32",
    },
    {
      key: "customer.name",
      header: "Customer",
      // cell:(payment: CustomerPayment) => payment.customer.name,
      width: "w-48",
    },
    {
      key: "amountRefunded",
      header: "Amount Received",
      cell: (payment: CustomerRefund) =>
        `₦${Number(payment.amountRefunded).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "cashAccount.name",
      header: "Cash Account",
      cell: (payment: CustomerRefund) => (
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
      cell: (payment: CustomerRefund) => payment.reference || "-",
      width: "w-32",
    },
    {
      key: "receiptDate",
      header: "Receipt Date",
      cell: (payment: CustomerRefund) =>
        new Date(payment.createdAt).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "user.name",
      header: "Received By",
      width: "w-32",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (payment: CustomerRefund) => (
        <button
          onClick={() => handlePrintPayment(payment)}
          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          title="Print Refund Receipt"
        >
          <Printer className="h-4 w-4" />
        </button>
      ),
      width: "w-24",
    },
  ];

  const handleCreateRefund = () => {
    refetch();
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Customer Refunds</h1>
          <p className="text-gray-600">Record customer refund</p>
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
              Customer
            </label>
            <CustomerSelect
              value={customerFilter}
              onChange={setCustomerFilter}
              typeFilter="retail"
              error=""
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Refunds
                  </dt>
                  <dd className="text-2xl font-bold text-black">
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
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    ₦
                    {data?.refunds
                      ?.reduce(
                        (sum: number, p: any) => sum + Number(p.amountRefunded),
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
                    {data?.refunds?.filter(
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
        data={data?.refunds || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {showCreateModal && (
        <CreateCustomerRefundModal
          onSuccess={handleCreateRefund}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default CustomerRefunds;
