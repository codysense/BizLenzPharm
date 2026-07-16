import React from "react";
import { X, ArrowRight } from "lucide-react";

interface DetailTransferModalProps {
  transfer: any;
  onClose: () => void;
}

const DetailTransferModal: React.FC<DetailTransferModalProps> = ({
  transfer,
  onClose,
}) => {
  if (!transfer) return null;

  const totalItems = transfer.items?.length || 0;

  const totalQty =
    transfer.items?.reduce(
      (sum: number, item: any) => sum + Number(item.qty || 0),
      0,
    ) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL CONTAINER */}
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Transfer Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ref: {transfer.refNo || transfer.id}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-6">
            {/* TRANSFER DIRECTION CARD */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-blue-100">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                    Transfer Route
                  </p>
                  <p className="text-sm text-blue-900 font-medium">
                    {transfer.fromWarehouse?.name} →{" "}
                    {transfer.toWarehouse?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* ITEMS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Items Transferred
                </h4>
              </div>

              <div className="space-y-3">
                {transfer.items?.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* ITEM */}
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500">Item</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {item.item?.sku} - {item.item?.name}
                        </p>
                      </div>

                      {/* QUANTITY */}
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
                          {item.qty} {item.item?.uom || "units"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SUMMARY */}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-3">
                Summary
              </h4>

              <div className="space-y-2 text-sm text-green-900">
                <div className="flex justify-between">
                  <span>Total Items</span>
                  <span className="font-semibold">{totalItems}</span>
                </div>

                <div className="flex justify-between">
                  <span>Total Quantity</span>
                  <span className="font-semibold">{totalQty}</span>
                </div>

                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="font-medium">
                    {new Date(transfer.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
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

export default DetailTransferModal;
