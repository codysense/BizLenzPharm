import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { purchaseApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { PurchaseReturn } from "../../types/api";
import ConfirmPurchaseReturnModal from "./ConfirmPurchaseReturnModal";
import PurchaseReturnDetailsModal from "./PurchaseReturnDetailsModal";
import { VendorSelect } from "../../components/VendorSelect";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const PurchaseReturns = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(
    null,
  );
  const { user } = useAuthStore();

  const canPerformActions =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager") ||
    user?.roles.includes("Inventory Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "purchase-returns",
      { page, status: statusFilter, vendorId: vendorFilter },
    ],
    queryFn: () =>
      purchaseApi.getPurchaseReturns({
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter }),
        ...(vendorFilter && { vendorId: vendorFilter }),
      }),
  });

  const columns = [
    { key: "returnNo", header: "Return No", width: "w-32" },
    {
      key: "purchase.orderNo",
      header: "Original PO",
      cell: (r: PurchaseReturn) => r.purchase.orderNo,
      width: "w-32",
    },
    {
      key: "vendor.name",
      header: "Vendor",
      cell: (r: PurchaseReturn) => r.vendor.name,
      width: "w-48",
    },
    {
      key: "returnDate",
      header: "Return Date",
      cell: (r: PurchaseReturn) => new Date(r.returnDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "totalAmount",
      header: "Total (AP)",
      cell: (r: PurchaseReturn) => `₦${Number(r.totalAmount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "costVariance",
      header: "Cost Variance",
      cell: (r: PurchaseReturn) =>
        r.status === "CONFIRMED" ? (
          <span
            className={
              Number(r.costVariance) >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            ₦{Number(r.costVariance).toLocaleString()}
          </span>
        ) : (
          "—"
        ),
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (r: PurchaseReturn) => <StatusBadge status={r.status} />,
      width: "w-32",
    },
  ];

  const handleCancel = async (r: PurchaseReturn) => {
    if (!confirm(`Cancel return ${r.returnNo}?`)) return;
    try {
      await purchaseApi.cancelPurchaseReturn(r.id);
      toast.success("Return cancelled");
      refetch();
    } catch (error) {
      console.error("Cancel return error:", error);
    }
  };

  const actions = (r: PurchaseReturn) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Purchase Returns</h1>
          <p className="text-gray-600">
            Returns are created from a purchase order's details page
          </p>
        </div>
      </div>

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
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <VendorSelect
              value={vendorFilter}
              onChange={(value) => setVendorFilter(value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        data={data?.purchaseReturns || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {showConfirmModal && selectedReturn && (
        <ConfirmPurchaseReturnModal
          purchaseReturn={selectedReturn}
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
        <PurchaseReturnDetailsModal
          purchaseReturn={selectedReturn}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReturn(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseReturns;
