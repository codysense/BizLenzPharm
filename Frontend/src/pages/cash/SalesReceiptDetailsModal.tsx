import React from 'react';
import { X, Receipt, User, Calendar, DollarSign } from 'lucide-react';
import { SalesReceipt } from '../../types/api';
import StatusBadge from '../../components/StatusBadge';

interface SalesReceiptDetailsModalProps {
  receipt: SalesReceipt;
  onClose: () => void;
}

const SalesReceiptDetailsModal = ({ receipt, onClose }: SalesReceiptDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Sales Receipt Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Receipt Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Receipt className="h-4 w-4 mr-2" />
                  Receipt Information
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Receipt No:</span>
                    <span className="text-sm font-medium">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Sales Order:</span>
                    <span className="text-sm font-medium">{receipt.sale.orderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Receipt Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(receipt.receiptDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount Received:</span>
                    <span className="text-sm font-medium text-green-600">
                      ₦{receipt.amountReceived.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Customer & Account
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Customer:</span>
                    <span className="text-sm font-medium">{receipt.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Customer Code:</span>
                    <span className="text-sm font-medium">{receipt.customer.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Cash Account:</span>
                    <span className="text-sm font-medium">{receipt.cashAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Account Type:</span>
                    <StatusBadge status={receipt.cashAccount.accountType} variant="info" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Order Information */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Sales Order Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Order Total:</span>
                  <div className="font-medium text-blue-900">₦{receipt.sale.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-blue-700">Order Status:</span>
                  <div><StatusBadge status={receipt.sale.status} /></div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{receipt.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-500">
                  <User className="h-4 w-4 mr-1" />
                  <span>Recorded by: {receipt.user.name}</span>
                </div>
                <div className="flex items-center text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Created: {new Date(receipt.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

export default SalesReceiptDetailsModal;