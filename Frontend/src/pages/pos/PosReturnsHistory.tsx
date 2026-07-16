import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, RotateCcw, Calendar, DollarSign } from "lucide-react";
import { posApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";

const PosReturnsHistory = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["pos-returns-history", { page }],
    queryFn: () => posApi.getReturns({ page, limit: 20 }),
  });

  console.log(data);
  const columns = [
    {
      key: "returnNo",
      header: "Return No",
      width: "w-32",
    },
    // {
    //   key: 'returnLines.item.name',
    //   header: 'Item Name',
    //   width: 'w-32'
    // },

    {
      Key: "itemsSummary",
      header: "Items",
      cell: (returnRecord: any) => returnRecord.itemsSummary,
      width: "w-32",
    },

    {
      key: "customer.name",
      header: "Customer",
      cell: (returnRecord: any) =>
        returnRecord.customer?.name || "Walk-in Customer",
      width: "w-48",
    },
    {
      key: "createdAt",
      header: "Return Date",
      cell: (returnRecord: any) =>
        new Date(returnRecord.createdAt).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "refundAmount",
      header: "Return Amount",
      cell: (returnRecord: any) =>
        `₦${returnRecord.refundAmount.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "reason",
      header: "Reason",
      cell: (returnRecord: any) => (
        <StatusBadge status={returnRecord.reason} variant="warning" />
      ),
      width: "w-32",
    },
    {
      key: "createdBy.name",
      header: "Processed By",
      width: "w-32",
    },
  ];

  const totalRefund = (data?.data ?? []).reduce(
    (sum, ret) => sum + Number(ret.refundAmount ?? 0),
    0,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today

  const totalRefundToday = (data?.data ?? [])
    .filter((ret) => new Date(ret.createdAt) >= today)
    .reduce((sum, ret) => sum + Number(ret.refundAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-600 mb-1">
              Returns Management
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              POS Returns History
            </h1>

            <p className="text-gray-500 mt-2">
              Track processed returns, refunds and daily return activity.
            </p>
          </div>

          <div className="hidden md:flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50">
            <RotateCcw className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Total Returns */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Returns</p>

              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                {data?.pagination?.total || 0}
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50">
              <RotateCcw className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Total Refunds */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Refunds</p>

              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                ₦ {Number(totalRefund).toLocaleString()}
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-red-50">
              <DollarSign className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Today's Returns */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Today's Returns</p>

              <h3 className="text-3xl font-bold text-gray-900 mt-3">
                ₦ {Number(totalRefundToday).toLocaleString()}
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {/* Empty State */}
      {(!data || data?.data?.length === 0) && (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-10">
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mb-5">
              <RotateCcw className="h-10 w-10 text-red-500" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
              No Returns Yet
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Returns history will appear here after refunds are processed.
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Process returns from the POS terminal to generate activity.
            </p>
          </div>
        </div>
      )}

      {/* Table Section */}
      {data?.data?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Return Transactions
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Review all processed return transactions.
            </p>
          </div>

          <div className="p-4">
            <DataTable
              data={data?.data || []}
              columns={columns}
              loading={isLoading}
              pagination={data?.pagination}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PosReturnsHistory;
