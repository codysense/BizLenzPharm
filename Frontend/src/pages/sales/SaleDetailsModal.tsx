import React from "react";
import { X, Truck, Building, Calendar, User } from "lucide-react";
import { Sale } from "../../types/api";
import StatusBadge from "../../components/StatusBadge";

interface SaleDetailsModalProps {
  sale: Sale;
  onClose: () => void;
}

const SaleDetailsModal = ({ sale, onClose }: SaleDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay (click ONLY here closes modal) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold">Sales Order Details</h3>
            <p className="text-xs text-blue-100">#{sale.orderNo}</p>
          </div>

          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Order Information
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">
                    {new Date(sale.orderDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={sale.status} />
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-blue-600">
                    ₦{sale.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Customer Info
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Code</span>
                  <span className="font-medium">{sale.customer.code}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{sale.customer.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Items</h4>

            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Item</th>
                    <th className="text-left p-3">Qty</th>
                    <th className="text-left p-3">Price</th>
                    <th className="text-left p-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {sale.saleLines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{line.item.sku}</div>
                        <div className="text-xs text-gray-500">
                          {line.item.name}
                        </div>
                      </td>

                      <td className="p-3">
                        {line.qty} {line.item.uom}
                      </td>

                      <td className="p-3">
                        ₦{line.unitPrice.toLocaleString()}
                      </td>

                      <td className="p-3 font-medium">
                        ₦{line.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;
