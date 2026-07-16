import React from "react";
import { X, Calendar, User, Building } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";

interface MemoDetailsModalProps {
  memo: any;
  onClose: () => void;
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}

const Row = ({ label, value }: RowProps) => (
  <div className="flex items-center justify-between text-sm text-gray-600">
    <span className="font-medium text-gray-700">{label}</span>
    <span>{value}</span>
  </div>
);

const MemoDetailsModal = ({ memo, onClose }: MemoDetailsModalProps) => {
  if (!memo) return null;

  const getCategory = () => {
    if (memo.saleId) return "Sales Return";
    if (memo.purchaseId) return "Purchase Return";
    if (memo.customerId) return "Customer Adjustment";
    if (memo.vendorId) return "Vendor Adjustment";
    return "General";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Overlay (click to close) */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Memo Details</h3>
            <p className="text-xs text-blue-100">{memo.memoNo}</p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Memo Info */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Memo Information
              </h4>

              <div className="space-y-2 text-sm">
                <Row
                  label="Date"
                  value={new Date(memo.date).toLocaleDateString()}
                />
                <Row label="Module" value={memo.module} />
                <Row label="Type" value={memo.memoType} />
                <Row
                  label="Amount"
                  value={`₦${Number(memo.amount).toLocaleString()}`}
                />
                <Row label="Category" value={getCategory()} />
              </div>
            </div>

            {/* Party Info */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Party Information
              </h4>

              <div className="space-y-2 text-sm">
                {memo.customer ? (
                  <>
                    <Row label="Customer" value={memo.customer.name} />
                    <Row label="Code" value={memo.customer.code} />
                    <Row label="Phone" value={memo.customer.phone} />
                  </>
                ) : memo.vendor ? (
                  <>
                    <Row label="Vendor" value={memo.vendor.name} />
                    <Row label="Code" value={memo.vendor.code} />
                    <Row label="Phone" value={memo.vendor.phone} />
                  </>
                ) : (
                  <p className="text-gray-500">No linked party</p>
                )}
              </div>
            </div>
          </div>

          {/* Linked Documents */}
          {(memo.sale || memo.purchase) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Linked Document
              </h4>

              <div className="text-sm space-y-2">
                {memo.sale && (
                  <Row label="Sales Order" value={memo.sale.orderNo} />
                )}
                {memo.purchase && (
                  <Row label="Purchase Order" value={memo.purchase.orderNo} />
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {memo.description && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-600">{memo.description}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoDetailsModal;
