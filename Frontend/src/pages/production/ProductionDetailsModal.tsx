import React from "react";
import { X, Factory, Package, Calendar, User } from "lucide-react";
import { ProductionOrder } from "../../types/api";
import StatusBadge from "../../components/StatusBadge";

interface ProductionDetailsModalProps {
  order: ProductionOrder;
  onClose: () => void;
}

const ProductionDetailsModal = ({
  order,
  onClose,
}: ProductionDetailsModalProps) => {
  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Premium Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Premium Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Production Order Details
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  View complete production execution breakdown
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="max-h-[85vh] overflow-y-auto p-6 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Info */}
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                  Order Information
                </h4>

                <div className="space-y-3">
                  <InfoRow label="Order No" value={order.orderNo} />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <InfoRow label="Target Qty" value={order.qtyTarget} />
                  <InfoRow label="Produced Qty" value={order.qtyProduced} />

                  {/* Premium Progress */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-500">Progress</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {(
                          (Number(order.qtyProduced) /
                            Number(order.qtyTarget)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{
                          width: `${Math.min(
                            (Number(order.qtyProduced) /
                              Number(order.qtyTarget)) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Info */}
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                  Item & Location
                </h4>

                <div className="space-y-3">
                  <InfoRow label="Item SKU" value={order.item.sku} />
                  <InfoRow label="Item Name" value={order.item.name} />
                  <InfoRow label="Warehouse" value={order.warehouse.name} />
                  <InfoRow
                    label="Started"
                    value={
                      order.startedAt
                        ? new Date(order.startedAt).toLocaleDateString()
                        : "Not started"
                    }
                  />
                  <InfoRow
                    label="Finished"
                    value={
                      order.finishedAt
                        ? new Date(order.finishedAt).toLocaleDateString()
                        : "Not finished"
                    }
                  />
                </div>
              </div>
            </div>

            {/* BOM Section */}
            {order.bom && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* BOM Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Bill of Materials
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Version {order.bom.version || "1.0"}
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {order.bom.bomLines.length} Components
                  </div>
                </div>

                {/* Premium Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                        <th className="px-6 py-4">Component</th>
                        <th className="px-6 py-4">Qty/Unit</th>
                        <th className="px-6 py-4">Required</th>
                        <th className="px-6 py-4">With Scrap</th>
                        <th className="px-6 py-4">Scrap %</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {order.bom.bomLines.map((line) => {
                        const baseQty =
                          Number(line.qtyPer) * Number(order.qtyTarget);

                        const withScrap =
                          baseQty * (1 + Number(line.scrapPercent) / 100);

                        return (
                          <tr
                            key={line.id}
                            className="hover:bg-blue-50/40 transition"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {line.componentItem.sku}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {line.componentItem.name}
                                </p>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-700">
                              {line.qtyPer} {line.componentItem.uom}
                            </td>

                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {baseQty.toFixed(3)} {line.componentItem.uom}
                            </td>

                            <td className="px-6 py-4 text-sm font-medium text-green-600">
                              {withScrap.toFixed(3)} {line.componentItem.uom}
                            </td>

                            <td className="px-6 py-4">
                              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                                {line.scrapPercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t">
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

export default ProductionDetailsModal;
