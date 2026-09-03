import React from "react";
import {
  X,
  FileText,
  Truck,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { PurchaseReturn } from "../../types/api";

interface PurchaseReturnDetailsModalProps {
  purchaseReturn: PurchaseReturn;
  onClose: () => void;
}

const PurchaseReturnDetailsModal = ({
  purchaseReturn,
  onClose,
}: PurchaseReturnDetailsModalProps) => {
  const settlementLabels: Record<string, string> = {
    REFUND_CASH: "Refund Received to Cash/Bank",
    SUPPLIER_CREDIT: "Supplier Credit",
  };

  const variance = Number(purchaseReturn.costVariance);
  const isFavorable = variance >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Purchase Return {purchaseReturn.returnNo}
                </h3>
                <div className="mt-1">
                  <StatusBadge status={purchaseReturn.status} />
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Original Purchase
                </div>
                <div className="font-medium text-gray-900">
                  {purchaseReturn.purchase?.orderNo}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Truck className="h-4 w-4 mr-2" />
                  Vendor
                </div>
                <div className="font-medium text-gray-900">
                  {purchaseReturn.vendor?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {purchaseReturn.vendor?.code}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Return Date
                </div>
                <div className="font-medium text-gray-900">
                  {new Date(purchaseReturn.returnDate).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Prepared By
                </div>
                <div className="font-medium text-gray-900">
                  {purchaseReturn.preparer?.name || "N/A"}
                </div>
              </div>
            </div>

            {purchaseReturn.reason && (
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Reason
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                  {purchaseReturn.reason}
                </div>
              </div>
            )}

            {/* Line items */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Returned Items
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Price (AP)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Cost (Avg)
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchaseReturn.purchaseReturnLines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-medium text-gray-900">
                            {line.item?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {line.item?.sku}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {Number(line.qty).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          ₦{Number(line.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-500">
                          {purchaseReturn.status === "CONFIRMED"
                            ? `₦${Number(line.unitCost).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                          ₦{Number(line.lineTotal).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals + variance */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-1 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  ₦{Number(purchaseReturn.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">
                  ₦{Number(purchaseReturn.tax).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-blue-200">
                <span className="text-gray-900">
                  Total Reduced from Payable
                </span>
                <span className="text-blue-600">
                  ₦{Number(purchaseReturn.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>

            {purchaseReturn.status === "CONFIRMED" && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 mb-6">
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Inventory & Cost Variance
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Inventory Value Removed</span>
                  <span className="text-gray-900">
                    ₦{Number(purchaseReturn.inventoryValue).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">
                    Cost Variance (posted to 5900)
                  </span>
                  <span
                    className={`flex items-center font-medium ${
                      isFavorable ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isFavorable ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    ₦{Math.abs(variance).toLocaleString()}{" "}
                    {isFavorable ? "(favorable)" : "(unfavorable)"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 pt-1">
                  Variance arises when the vendor's original price differs from
                  the current weighted-average cost of this item at the time of
                  return.
                </p>
              </div>
            )}

            {/* Status timeline */}
            <div className="text-sm text-gray-500 space-y-1">
              {purchaseReturn.status === "CONFIRMED" && (
                <>
                  <div>
                    Confirmed by{" "}
                    {(purchaseReturn as any).confirmer?.name || "N/A"} on{" "}
                    {purchaseReturn.confirmedAt &&
                      new Date(purchaseReturn.confirmedAt).toLocaleString()}
                  </div>
                  {purchaseReturn.settlementMethod && (
                    <div>
                      Settlement:{" "}
                      {settlementLabels[purchaseReturn.settlementMethod]}
                    </div>
                  )}
                </>
              )}
              {purchaseReturn.status === "CANCELLED" && (
                <div>
                  Cancelled by{" "}
                  {(purchaseReturn as any).canceller?.name || "N/A"} on{" "}
                  {purchaseReturn.cancelledAt &&
                    new Date(purchaseReturn.cancelledAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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

export default PurchaseReturnDetailsModal;
