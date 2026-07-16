import React from "react";
import { X, User, ShoppingCart } from "lucide-react";
import { posApi } from "../../lib/api";
import { useQuery } from "@tanstack/react-query";

interface DetailPOSSaleModalProps {
  sale: any;
  onClose: () => void;
}

const DetailPOSSaleModal: React.FC<DetailPOSSaleModalProps> = ({
  sale,
  onClose,
}) => {
  const { data: paymentsData } = useQuery({
    queryKey: ["posSalePayments", sale.id],
    queryFn: () => posApi.getPOSsalePayments(sale.id),
  });

  // console.log("Payments Data:", paymentsData);
  // console.log("Sale Data in Modal:", sale.id, sale.saleNo);

  if (!sale) return null;

  const subtotal =
    sale.saleLines?.reduce(
      (sum: number, line: any) => sum + line.qty * line.unitPrice,
      0,
    ) || 0;

  const discountAmount =
    sale.saleLines?.reduce((sum: number, line: any) => {
      const lineTotal = line.qty * Number(line.unitPrice || 0);
      const discount = (lineTotal * Number(line.discountPercent || 0)) / 100;
      return sum + discount;
    }, 0) || 0;

  const totalAmount = subtotal - discountAmount;

  const totalPaid =
    sale.payments?.reduce(
      (sum: number, pay: any) => sum + Number(pay.amount || 0),
      0,
    ) || 0;

  const changeAmount = totalPaid - totalAmount;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl">
          {/* HEADER */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-medium">
                Sale Details
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                {sale?.saleNo || "—"}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* CUSTOMER */}
            {sale?.customer ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-100">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>

                  <div>
                    <p className="text-sm text-amber-600">Customer</p>
                    <p className="text-gray-900 font-semibold mt-1">
                      {sale.customer.name}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ITEMS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Purchased Items
              </h3>

              {sale?.saleLines?.length ? (
                <div className="space-y-4">
                  {sale.saleLines.map((line: any, index: number) => {
                    const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
                    const discount =
                      (lineTotal * (line.discountPercent || 0)) / 100;

                    return (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-gray-500 text-xs">Product</p>
                            <p className="text-gray-900 font-medium mt-1">
                              {line.item?.name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs">Qty</p>
                            <p className="text-gray-900 mt-1">
                              {line.qty || 0}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs">Unit Price</p>
                            <p className="text-gray-900 mt-1">
                              ₦{(line.unitPrice || 0).toLocaleString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs">Discount</p>
                            <p className="text-red-500 mt-1">
                              {line.discountPercent || 0}%
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs">Total</p>
                            <p className="text-emerald-600 font-semibold mt-1">
                              ₦{(lineTotal - discount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No items found</p>
              )}
            </div>

            {/* PAYMENTS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Payment Breakdown
              </h3>

              {paymentsData?.length ? (
                <div className="space-y-4">
                  {paymentsData.map((payment: any, index: number) => (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-gray-500 text-xs">Method</p>
                          <p className="text-gray-900 mt-1">
                            {payment.method || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">Account</p>
                          <p className="text-gray-900 mt-1">
                            {payment.cashAccount?.name || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs">Amount</p>
                          <p className="text-emerald-600 font-semibold mt-1">
                            ₦{(payment.amount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No payments found</p>
              )}
            </div>

            {/* SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ORDER SUMMARY */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-5">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Discount</span>
                      <span>-₦{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT SUMMARY */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-emerald-700 mb-5">
                  Payment Summary
                </h3>

                <div className="space-y-3 text-sm text-emerald-800">
                  <div className="flex justify-between">
                    <span>Total Paid</span>
                    <span className="font-semibold">
                      ₦{totalPaid.toLocaleString()}
                    </span>
                  </div>

                  {changeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span className="font-semibold">
                        ₦{changeAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="fixed inset-0 z-50 overflow-y-auto">
  //     <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
  //       <div
  //         className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
  //         onClick={onClose}
  //       />

  //       <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
  //         <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
  //           {/* Header */}
  //           <div className="flex items-center justify-between mb-4">
  //             <h3 className="text-lg leading-6 font-medium text-gray-900">
  //               POS Sale Details - {sale.saleNo}
  //             </h3>
  //             <button
  //               onClick={onClose}
  //               className="text-gray-400 hover:text-gray-600"
  //             >
  //               <X className="h-6 w-6" />
  //             </button>
  //           </div>

  //           {/* Customer */}
  //           {sale.customer && (
  //             <div className="bg-yellow-50 p-4 rounded-lg mb-6">
  //               <div className="flex items-center">
  //                 <User className="h-5 w-5 text-yellow-500 mr-2" />
  //                 <div>
  //                   <div className="font-medium text-yellow-900">Customer</div>
  //                   <div className="text-sm text-yellow-700">
  //                     {sale.customer.name}
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>
  //           )}

  //           {/* Items */}
  //           <div className="mb-6">
  //             <h4 className="text-md font-medium text-gray-900 mb-4">Items</h4>

  //             <div className="space-y-4">
  //               {sale.saleLines?.map((line: any, index: number) => {
  //                 const lineTotal = line.qty * line.unitPrice;
  //                 const discount =
  //                   (lineTotal * (line.discountPercent || 0)) / 100;

  //                 return (
  //                   <div key={index} className="bg-gray-50 p-4 rounded-lg">
  //                     <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 text-sm">
  //                       <div className="sm:col-span-2">
  //                         <div className="font-medium text-gray-900">
  //                           {line.item?.name}
  //                         </div>
  //                       </div>

  //                       <div>
  //                         <div className="text-gray-500">Qty</div>
  //                         <div>{line.qty}</div>
  //                       </div>

  //                       <div>
  //                         <div className="text-gray-500">Price</div>
  //                         <div>₦{line.unitPrice.toLocaleString()}</div>
  //                       </div>

  //                       <div>
  //                         <div className="text-gray-500">Discount %</div>
  //                         <div>{line.discountPercent || 0}%</div>
  //                       </div>

  //                       <div>
  //                         <div className="text-gray-500">Line Total</div>
  //                         <div className="font-medium">
  //                           ₦{(lineTotal - discount).toLocaleString()}
  //                         </div>
  //                       </div>
  //                     </div>
  //                   </div>
  //                 );
  //               })}
  //             </div>
  //           </div>

  //           {/* Payments (Multiple Supported) */}
  //           <div className="bg-green-50 p-4 rounded-lg mb-6">
  //             <h4 className="text-md font-medium text-green-900 mb-3">
  //               Payments
  //             </h4>

  //             <div className="space-y-3">
  //               {paymentsData?.map((payment: any, index: number) => (
  //                 <div
  //                   key={index}
  //                   className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-md text-sm"
  //                 >
  //                   <div>
  //                     <div className="text-gray-500">Method</div>
  //                     <div className="font-medium">{payment.method}</div>
  //                   </div>

  //                   <div>
  //                     <div className="text-gray-500">Account</div>
  //                     <div>
  //                       {/* {payment.cashAccount?.code} -{" "} */}
  //                       {payment.cashAccount?.name}
  //                     </div>
  //                   </div>

  //                   <div>
  //                     <div className="text-gray-500">Amount</div>
  //                     <div className="font-medium text-green-700">
  //                       ₦{payment.amount.toLocaleString()}
  //                     </div>
  //                   </div>
  //                 </div>
  //               ))}
  //             </div>
  //           </div>

  //           {/* Summary */}
  //           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
  //             <div className="bg-blue-50 p-4 rounded-lg">
  //               <h4 className="text-md font-medium text-blue-900 mb-3">
  //                 Order Summary
  //               </h4>

  //               <div className="space-y-2 text-sm">
  //                 <div className="flex justify-between">
  //                   <span>Subtotal:</span>
  //                   <span>₦{subtotal.toLocaleString()}</span>
  //                 </div>

  //                 {discountAmount > 0 && (
  //                   <div className="flex justify-between text-red-600">
  //                     <span>Discount:</span>
  //                     <span>-₦{discountAmount.toLocaleString()}</span>
  //                   </div>
  //                 )}

  //                 <div className="flex justify-between font-bold text-lg border-t pt-2">
  //                   <span>Total:</span>
  //                   <span>₦{totalAmount.toLocaleString()}</span>
  //                 </div>
  //               </div>
  //             </div>

  //             <div className="bg-green-50 p-4 rounded-lg">
  //               <h4 className="text-md font-medium text-green-900 mb-3">
  //                 Payment Summary
  //               </h4>

  //               <div className="space-y-2 text-sm">
  //                 <div className="flex justify-between">
  //                   <span>Total Paid:</span>
  //                   <span>₦{totalPaid.toLocaleString()}</span>
  //                 </div>

  //                 {changeAmount > 0 && (
  //                   <div className="flex justify-between font-bold text-yellow-700">
  //                     <span>Change Given:</span>
  //                     <span>₦{changeAmount.toLocaleString()}</span>
  //                   </div>
  //                 )}
  //               </div>
  //             </div>
  //           </div>

  //           {/* Footer */}
  //           <div className="flex justify-end pt-6 border-t mt-6">
  //             <button
  //               onClick={onClose}
  //               className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //             >
  //               Close
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default DetailPOSSaleModal;
