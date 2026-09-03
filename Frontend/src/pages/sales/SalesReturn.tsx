import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { salesApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { SalesReturn } from "../../types/api";
import ConfirmSalesReturnModal from "./ConfirmSalesReturnModal";
import SalesReturnDetailsModal from "./SalesReturnDetailsModal";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const SalesReturns = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(
    null,
  );
  const { user } = useAuthStore();

  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sales-returns", { page, status: statusFilter }],
    queryFn: () =>
      salesApi.getSalesReturns({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const columns = [
    { key: "returnNo", header: "Return No", width: "w-32" },
    {
      key: "sale.orderNo",
      header: "Original Sale",
      cell: (r: SalesReturn) => r.sale.orderNo,
      width: "w-32",
    },
    {
      key: "customer.name",
      header: "Customer",
      cell: (r: SalesReturn) => r.customer.name,
      width: "w-48",
    },
    {
      key: "returnDate",
      header: "Return Date",
      cell: (r: SalesReturn) => new Date(r.returnDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "totalAmount",
      header: "Total",
      cell: (r: SalesReturn) => `₦${Number(r.totalAmount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (r: SalesReturn) => <StatusBadge status={r.status} />,
      width: "w-32",
    },
  ];

  const handleCancel = async (r: SalesReturn) => {
    if (!confirm(`Cancel return ${r.returnNo}?`)) return;
    try {
      await salesApi.cancelSalesReturn(r.id);
      toast.success("Return cancelled");
      refetch();
    } catch (error) {
      console.error("Cancel return error:", error);
    }
  };

  const actions = (r: SalesReturn) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedReturn(r);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
      {r.status === "DRAFT" && canPerformActions && (
        <>
          <button
            onClick={() => {
              setSelectedReturn(r);
              setShowConfirmModal(true);
            }}
            className="text-green-600 hover:text-green-900"
            title="Confirm"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleCancel(r)}
            className="text-red-600 hover:text-red-900"
            title="Cancel"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Returns</h1>
          <p className="text-gray-600">
            Returns are created from a sale's details page
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        data={data?.salesReturns || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {showConfirmModal && selectedReturn && (
        <ConfirmSalesReturnModal
          salesReturn={selectedReturn}
          onClose={() => {
            setShowConfirmModal(false);
            setSelectedReturn(null);
          }}
          onSuccess={() => {
            refetch();
            setShowConfirmModal(false);
            setSelectedReturn(null);
          }}
        />
      )}

      {showDetailsModal && selectedReturn && (
        <SalesReturnDetailsModal
          salesReturn={selectedReturn}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReturn(null);
          }}
        />
      )}
    </div>
  );
};

export default SalesReturns;
