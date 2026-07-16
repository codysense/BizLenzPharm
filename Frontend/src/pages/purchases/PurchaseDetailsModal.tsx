import React from "react";
import { X, Package, Building, Calendar, User } from "lucide-react";
import { Purchase } from "../../types/api";
import StatusBadge from "../../components/StatusBadge";

interface PurchaseDetailsModalProps {
  purchase: Purchase;
  onClose: () => void;
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

const PurchaseDetailsModal = ({
  purchase,
  onClose,
}: PurchaseDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        {/* Modal */}
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Purchase Order Details
                </h3>
                <p className="text-sm text-blue-100 mt-1">{purchase.orderNo}</p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Order Info */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Order Information
                </h4>

                <div className="space-y-3 text-sm">
                  <InfoRow label="Order No" value={purchase.orderNo} />
                  <InfoRow
                    label="Order Date"
                    value={new Date(purchase.orderDate).toLocaleDateString()}
                  />
                  <InfoRow
                    label="Status"
                    value={<StatusBadge status={purchase.status} />}
                  />
                  <InfoRow
                    label="Total Amount"
                    value={`₦${purchase.totalAmount.toLocaleString()}`}
                  />
                </div>
              </div>

              {/* Vendor Info */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Vendor Information
                </h4>

                <div className="space-y-3 text-sm">
                  <InfoRow label="Code" value={purchase.vendor.code} />
                  <InfoRow label="Name" value={purchase.vendor.name} />
                </div>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="rounded-2xl border border-gray-100 bg-yellow-50 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Notes
                </h4>
                <p className="text-sm text-gray-700">{purchase.notes}</p>
              </div>
            )}

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Purchase Items
                </h4>

                <span className="text-xs text-gray-500">
                  {purchase.purchaseLines.length} items
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Item", "Qty", "Unit Price", "Total"].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {purchase.purchaseLines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50 transition">
                        {/* Item */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {line.item?.sku || "SKU N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {line.item?.name || line.assetName || "Unnamed"}
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {line.qty} {line.item?.uom}
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 text-sm text-gray-700">
                          ₦{line.unitPrice.toLocaleString()}
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₦{line.lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetailsModal;
