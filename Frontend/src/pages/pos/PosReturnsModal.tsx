import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, RotateCcw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { posApi } from "../../lib/api";
import { PosSession, PosSale } from "../../types/api";
import toast from "react-hot-toast";

const posReturnSchema = z.object({
  originalSaleId: z.string().cuid(),
  sessionId: z.string().cuid(),
  reason: z
    .enum([
      "DEFECTIVE",
      "WRONG_ITEM",
      "CUSTOMER_CHANGE_MIND",
      "DAMAGED",
      "OTHER",
    ])
    .refine((val) => val !== undefined, {
      message: "Return reason is required",
    }),

  returnLines: z
    .array(
      z.object({
        originalLineId: z.string().cuid(),
        itemId: z.string().cuid(),
        qtyReturned: z.number().int().nonnegative(),
        //unitPrice: z.number().positive(),
      }),
    )
    .min(1),
});

type PosReturnFormData = z.infer<typeof posReturnSchema>;

interface PosReturnsModalProps {
  session: PosSession;
  onClose: () => void;
  onReturnComplete: () => void;
}

const PosReturnsModal = ({
  session,
  onClose,
  onReturnComplete,
}: PosReturnsModalProps) => {
  const [selectedSale, setSelectedSale] = useState<PosSale | null>(null);
  const [saleSearch, setSaleSearch] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PosReturnFormData>({
    resolver: zodResolver(posReturnSchema),
    defaultValues: {
      sessionId: session.id,
      returnLines: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "returnLines",
  });

  /*  SINGLE SOURCE OF TRUTH — SERVER FILTERING */
  const { data, isLoading } = useQuery({
    queryKey: ["search-pos-sales-for-return", saleSearch],
    queryFn: () =>
      posApi.getSales({
        status: "COMPLETED",
        limit: 50,
        ...(saleSearch && { search: saleSearch }),
      }),
    // enabled: saleSearch.length > 2,
  });

  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Return form errors:", errors);
    }
  }, [errors]);

  const sales: PosSale[] = data?.sales || [];

  console.log("Sales search results:", sales);

  const handleSaleSelect = (sale: PosSale) => {
    setSelectedSale(sale);

    reset({
      originalSaleId: sale.id,
      sessionId: session.id,
      reason: undefined,
      returnLines: sale.saleLines.map((line) => ({
        originalLineId: line.id,
        itemId: line.itemId,
        qtyReturned: 0,
        unitPrice: Number(line.unitPrice),
      })),
    });
  };

  const calculateReturnTotal = () =>
    watch("returnLines")?.reduce(
      (sum, line) =>
        sum + (line.qtyReturned || 0) * Number(line.unitPrice || 0),
      0,
    ) || 0;

  const onSubmit = async (formData: PosReturnFormData) => {
    try {
      const validLines = formData.returnLines
        .filter((l) => l.qtyReturned > 0)
        .map((line) => {
          const originalLine = selectedSale!.saleLines.find(
            (sl) => sl.id === line.originalLineId,
          );

          return {
            ...line,
            unitPrice: Number(originalLine!.unitPrice), // inject safely here
          };
        });

      if (!validLines.length) {
        toast.error("Please specify quantities to return");
        return;
      }

      await posApi.createReturn({
        ...formData,
        returnLines: validLines,
      });

      toast.success("Return processed successfully");
      onReturnComplete();
    } catch (error) {
      console.error("POS return ", error);
    }
  };

  // const onSubmit = async (formData: PosReturnFormData) => {
  //   try {
  //     const validLines = formData.returnLines.filter((l) => l.qtyReturned > 0);

  //     if (!validLines.length) {
  //       toast.error("Please specify quantities to return");
  //       return;
  //     }

  //     await posApi.createReturn({
  //       ...formData,
  //       returnLines: validLines,
  //     });

  //     toast.success("Return processed successfully");
  //     onReturnComplete();
  //   } catch (error) {
  //     console.error("POS return ", error);
  //   }
  // };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-red-600">
                Return Processing
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">
                Process Return
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Session: {session.sessionNo}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            {!selectedSale ? (
              <>
                {/* Search Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Sale
                  </label>

                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />

                    <input
                      type="text"
                      placeholder="Search by sale number or customer..."
                      value={saleSearch}
                      onChange={(e) => setSaleSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="border border-gray-100 rounded-3xl overflow-hidden">
                  {isLoading ? (
                    <div className="p-10 text-center text-gray-500">
                      Searching sales...
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="p-10 text-center">
                      <RotateCcw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No matching sales found</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-gray-600">
                              Sale No
                            </th>
                            <th className="px-4 py-3 text-left text-gray-600">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-gray-600">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-gray-600">
                              Total
                            </th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>

                        <tbody>
                          {sales.map((sale) => (
                            <tr
                              key={sale.id}
                              className="border-t bg-white hover:bg-gray-500 hover:text-white text-gray-700 hover:transition cursor-pointer"
                            >
                              <td className="px-4 py-3 font-medium">
                                {sale.saleNo}
                              </td>

                              <td className="px-4 py-3">
                                {sale.customer?.name || "Walk-in"}
                              </td>

                              <td className="px-4 py-3">
                                {new Date(sale.createdAt).toLocaleDateString()}
                              </td>

                              <td className="px-4 py-3 font-medium">
                                ₦{sale.totalAmount.toLocaleString()}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleSaleSelect(sale)}
                                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                                >
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Selected Sale Card */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Sale: {selectedSale.saleNo}
                      </h3>

                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSale.customer?.name || "Walk-in"} • ₦
                        {selectedSale.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="text-red-600 text-sm font-medium"
                    >
                      Change Sale
                    </button>
                  </div>
                </div>

                {/* Return Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Reason
                  </label>

                  <select
                    {...register("reason")}
                    className="w-full border text-gray-700 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select reason</option>
                    <option value="DEFECTIVE">Defective</option>
                    <option value="WRONG_ITEM">Wrong Item</option>
                    <option value="CUSTOMER_CHANGE_MIND">
                      Customer Changed Mind
                    </option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="OTHER">Other</option>
                  </select>

                  {errors.reason && (
                    <p className="text-sm text-red-600 mt-2">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                {/* Return Items */}
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const originalLine = selectedSale.saleLines.find(
                      (l) => l.id === field.originalLineId,
                    );

                    if (!originalLine) return null;

                    return (
                      <div
                        key={field.id}
                        className="border border-gray-100 rounded-2xl p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {originalLine.item.name}
                            </h4>

                            <p className="text-sm text-gray-500">
                              Original Qty: {originalLine.qty}
                            </p>
                          </div>

                          <div>
                            <input
                              type="number"
                              min="0"
                              max={originalLine.qty}
                              {...register(`returnLines.${index}.qtyReturned`, {
                                valueAsNumber: true,
                                validate: (value) => {
                                  if (value > originalLine.qty) {
                                    return `Cannot return more than ${originalLine.qty}`;
                                  }
                                  return true;
                                },
                              })}
                              className="w-28 border text-gray-700 border-gray-200 rounded-xl px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />

                            {errors.returnLines?.[index]?.qtyReturned && (
                              <p className="text-sm text-red-600 mt-2">
                                {
                                  errors.returnLines[index]?.qtyReturned
                                    ?.message
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Refund Summary */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Refund</span>

                    <span className="text-2xl font-bold text-red-600">
                      ₦{calculateReturnTotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || calculateReturnTotal() === 0}
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4 inline mr-2" />
                    {isSubmitting ? "Processing..." : "Process Return"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 flex justify-center items-center p-4">
  //     <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl p-6">
  //       {/* Header */}
  //       <div className="flex justify-between items-center mb-4">
  //         <h3 className="text-lg font-medium">
  //           Process Return - {session.sessionNo}
  //         </h3>
  //         <button onClick={onClose}>
  //           <X className="h-6 w-6 text-gray-500" />
  //         </button>
  //       </div>

  //       {!selectedSale ? (
  //         <>
  //           {/* Search */}
  //           <div className="relative mb-4">
  //             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
  //             <input
  //               type="text"
  //               placeholder="Search by sale number or customer..."
  //               value={saleSearch}
  //               onChange={(e) => setSaleSearch(e.target.value)}
  //               className="pl-9 pr-3 py-2 border rounded-md w-full focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm "
  //             />
  //           </div>

  //           {/* Results */}
  //           <div className="max-h-96 overflow-y-auto border rounded-md">
  //             {isLoading ? (
  //               <div className="p-4 text-center text-sm">Searching...</div>
  //             ) : sales.length === 0 ? (
  //               <div className="p-4 text-center text-sm text-gray-500">
  //                 No matching sales found
  //               </div>
  //             ) : (
  //               <table className="min-w-full text-sm">
  //                 <thead className="bg-gray-50">
  //                   <tr>
  //                     <th className="px-4 py-2 text-left text-blue-600">
  //                       Sale No
  //                     </th>
  //                     <th className="px-4 py-2 text-left text-blue-600">
  //                       Customer
  //                     </th>
  //                     <th className="px-4 py-2 text-left text-blue-600">
  //                       Date
  //                     </th>
  //                     <th className="px-4 py-2 text-left text-blue-600">
  //                       Total
  //                     </th>
  //                     <th className="px-4 py-2"></th>
  //                   </tr>
  //                 </thead>
  //                 <tbody>
  //                   {sales.map((sale) => (
  //                     <tr key={sale.id} className="hover:bg-gray-50">
  //                       <td className="px-4 py-2">{sale.saleNo}</td>
  //                       <td className="px-4 py-2">
  //                         {sale.customer?.name || "Walk-in"}
  //                       </td>
  //                       <td className="px-4 py-2">
  //                         {new Date(sale.createdAt).toLocaleDateString()}
  //                       </td>
  //                       <td className="px-4 py-2">
  //                         ₦{sale.totalAmount.toLocaleString()}
  //                       </td>
  //                       <td className="px-4 py-2 text-right">
  //                         <button
  //                           onClick={() => handleSaleSelect(sale)}
  //                           className="text-blue-600 hover:text-blue-800"
  //                         >
  //                           Select
  //                         </button>
  //                       </td>
  //                     </tr>
  //                   ))}
  //                 </tbody>
  //               </table>
  //             )}
  //           </div>
  //         </>
  //       ) : (
  //         /* Return Form */
  //         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  //           <div className="bg-blue-50 p-4 rounded-md">
  //             <div className="flex justify-between">
  //               <div>
  //                 <div className="font-medium">Sale: {selectedSale.saleNo}</div>
  //                 <div className="text-sm text-gray-600">
  //                   {selectedSale.customer?.name || "Walk-in"} | ₦
  //                   {selectedSale.totalAmount.toLocaleString()}
  //                 </div>
  //               </div>
  //               <button
  //                 type="button"
  //                 onClick={() => setSelectedSale(null)}
  //                 className="text-blue-600 text-sm"
  //               >
  //                 Change Sale
  //               </button>
  //             </div>
  //           </div>

  //           <select
  //             {...register("reason")}
  //             className="border rounded-md px-3 py-2 w-full text-sm"
  //           >
  //             <option value="">Select reason</option>
  //             <option value="DEFECTIVE">Defective</option>
  //             <option value="WRONG_ITEM">Wrong Item</option>
  //             <option value="CUSTOMER_CHANGE_MIND">
  //               Customer Changed Mind
  //             </option>
  //             <option value="DAMAGED">Damaged</option>
  //             <option value="OTHER">Other</option>
  //           </select>

  //           {errors.reason && (
  //             <p className="text-sm text-red-600 mt-1">
  //               {errors.reason.message}
  //             </p>
  //           )}

  //           {fields.map((field, index) => {
  //             const originalLine = selectedSale.saleLines.find(
  //               (l) => l.id === field.originalLineId,
  //             );
  //             if (!originalLine) return null;

  //             return (
  //               <div key={field.id} className="border p-4 rounded-md">
  //                 <div className="flex justify-between text-sm">
  //                   <div>
  //                     {originalLine.item.name} <br />
  //                     <span className="text-gray-500 text-xs">
  //                       Original: {originalLine.qty}
  //                     </span>
  //                   </div>
  //                   <input
  //                     type="number"
  //                     min="0"
  //                     max={originalLine.qty}
  //                     {...register(`returnLines.${index}.qtyReturned`, {
  //                       valueAsNumber: true,
  //                       validate: (value) => {
  //                         if (value > originalLine.qty) {
  //                           return `Cannot return more than ${originalLine.qty}`;
  //                         }
  //                         return true;
  //                       },
  //                     })}
  //                     className="border px-2 py-1 rounded w-24"
  //                   />
  //                   {errors.returnLines?.[index]?.qtyReturned && (
  //                     <p className="text-sm text-red-600 mt-1">
  //                       {errors.returnLines[index]?.qtyReturned?.message}
  //                     </p>
  //                   )}
  //                 </div>
  //               </div>
  //             );
  //           })}

  //           <div className="flex justify-between font-bold text-lg">
  //             <span>Total Refund:</span>
  //             <span className="text-red-600">
  //               ₦{calculateReturnTotal().toLocaleString()}
  //             </span>
  //           </div>

  //           <div className="flex justify-end gap-3">
  //             <button
  //               type="button"
  //               onClick={onClose}
  //               className="border px-4 py-2 rounded"
  //             >
  //               Cancel
  //             </button>
  //             <button
  //               type="submit"
  //               disabled={isSubmitting || calculateReturnTotal() === 0}
  //               className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
  //             >
  //               <RotateCcw className="h-4 w-4 inline mr-2" />
  //               Process Return
  //             </button>
  //           </div>
  //         </form>
  //       )}
  //     </div>
  //   </div>
  // );
};

export default PosReturnsModal;

// import React, { useState } from "react";
// import { useForm, useFieldArray } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { X, RotateCcw, Search } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import { posApi } from "../../lib/api";
// import { PosSession, PosSale } from "../../types/api";
// import toast from "react-hot-toast";

// const posReturnSchema = z.object({

//   originalSaleId: z.string().cuid(),
//   sessionId: z.string().cuid(),

//   reason: z.enum([
//     "DEFECTIVE",
//     "WRONG_ITEM",
//     "CUSTOMER_CHANGE_MIND",
//     "DAMAGED",
//     "OTHER",
//   ]),

//   returnLines: z
//     .array(
//       z.object({
//         originalLineId: z.string().cuid(),
//         itemId: z.string().cuid(),
//         qtyReturned: z.number().int().positive(),
//         unitPrice: z.number().positive(),
//       }),
//     )
//     .min(1),
// });

// type PosReturnFormData = z.infer<typeof posReturnSchema>;

// interface PosReturnsModalProps {
//   session: PosSession;
//   onClose: () => void;
//   onReturnComplete: () => void;
// }

// const PosReturnsModal = ({
//   session,
//   onClose,
//   onReturnComplete,
// }: PosReturnsModalProps) => {
//   const [selectedSale, setSelectedSale] = useState<PosSale | null>(null);
//   const [saleSearch, setSaleSearch] = useState("");
//   const [serverSales, setServerSales] = useState<PosSale[]>([]);

//   const {
//     register,
//     control,
//     handleSubmit,
//     watch,
//     reset,
//     formState: { errors, isSubmitting },
//   } = useForm<PosReturnFormData>({
//     resolver: zodResolver(posReturnSchema),
//     defaultValues: {
//       sessionId: session.id,
//       returnLines: [],
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "returnLines",
//   });

//   const { data: recentSales } = useQuery({
//     queryKey: ["recent-pos-sales"],
//     queryFn: () =>
//       posApi.getSales({
//         limit: 100,
//         dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
//           .toISOString()
//           .split("T")[0], // Last 7 days
//       }),
//   });

//   const handleSaleSelect = (sale: PosSale) => {
//     setSelectedSale(sale);

//     reset({
//       originalSaleId: sale.id,
//       sessionId: session.id,
//       reason: undefined,
//       returnLines: sale.saleLines.map((line) => ({
//         originalLineId: line.id,
//         itemId: line.itemId,
//         qtyReturned: 0,
//         unitPrice: line.unitPrice,
//       })),
//     });
//   };

//   const onSubmit = async (data: PosReturnFormData) => {
//     const validReturnLines = data.returnLines.filter((l) => l.qtyReturned > 0);

//     if (validReturnLines.length === 0) {
//       toast.error("Please specify quantities to return");
//       return;
//     }

//     await posApi.createReturn({
//       ...data,
//       returnLines: validReturnLines,
//     });

//     toast.success("Return processed successfully");
//     onReturnComplete();
//   };

//   const { data: serverSale } = useQuery({
//     queryKey: ["sale-by-number", saleSearch],
//     queryFn: async () => {
//       const res = await posApi.getSalesBySalesNo(saleSearch);
//       return res.data;
//     },
//     enabled: saleSearch.length > 8, // avoid firing too early
//     retry: false,
//   });

//   const localFiltered =
//     recentSales?.sales?.filter(
//       (sale: PosSale) =>
//         sale.status === "COMPLETED" &&
//         (sale.saleNo.toLowerCase() === saleSearch.toLowerCase() ||
//           sale.customer?.name
//             ?.toLowerCase()
//             .includes(saleSearch.toLowerCase())),
//     ) || [];

//   const serverFiltered =
//     serverSale && serverSale.status === "COMPLETED" ? [serverSale] : [];

//   // Merge and remove duplicates
//   const filteredSales = [
//     ...localFiltered,
//     ...serverFiltered.filter(
//       (serverSale) =>
//         !localFiltered.some((local) => local.id === serverSale.id),
//     ),
//   ];

//   const calculateReturnTotal = () => {
//     return (
//       watch("returnLines")?.reduce((sum, line) => {
//         return sum + (line.qtyReturned || 0) * (line.unitPrice || 0);
//       }, 0) || 0
//     );
//   };

//   React.useEffect(() => {
//     console.log("Form errors:", errors);
//   }, [errors]);

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//         <div
//           className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
//           onClick={onClose}
//         />

//         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
//           <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg leading-6 font-medium text-gray-900">
//                 Process Return - {session.sessionNo}
//               </h3>
//               <button
//                 onClick={onClose}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X className="h-6 w-6" />
//               </button>
//             </div>

//             {!selectedSale ? (
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Search Recent Sales
//                   </label>
//                   <div className="relative">
//                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                       <Search className="h-5 w-5 text-gray-400" />
//                     </div>
//                     <input
//                       type="text"
//                       placeholder="Search by sale number or customer name..."
//                       value={saleSearch}
//                       onChange={(e) => setSaleSearch(e.target.value)}
//                       className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     />
//                   </div>
//                 </div>

//                 <div className="max-h-96 overflow-y-auto">
//                   <table className="min-w-full divide-y divide-gray-200">
//                     <thead className="bg-gray-50">
//                       <tr>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Sale No
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Customer
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Date
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Total
//                         </th>
//                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Action
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody className="bg-white divide-y divide-gray-200">
//                       {filteredSales.map((sale: PosSale) => (
//                         <tr key={sale.id} className="hover:bg-gray-50">
//                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                             {sale.saleNo}
//                           </td>
//                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                             {sale.customer?.name || "Walk-in Customer"}
//                           </td>
//                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                             {new Date(sale.createdAt).toLocaleDateString()}
//                           </td>
//                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                             ₦{sale.totalAmount.toLocaleString()}
//                           </td>
//                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                             <button
//                               onClick={() => handleSaleSelect(sale)}
//                               className="text-blue-600 hover:text-blue-900"
//                             >
//                               Select for Return
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             ) : (
//               <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//                 {/* Selected Sale Info */}
//                 <div className="bg-blue-50 p-4 rounded-lg">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <h4 className="font-medium text-blue-900">
//                         Return for Sale: {selectedSale.saleNo}
//                       </h4>
//                       <p className="text-sm text-blue-700">
//                         Customer: {selectedSale.customer?.name || "Walk-in"} |
//                         Date:{" "}
//                         {new Date(selectedSale.createdAt).toLocaleDateString()}{" "}
//                         | Total: ₦{selectedSale.totalAmount.toLocaleString()}
//                       </p>
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => setSelectedSale(null)}
//                       className="text-blue-600 hover:text-blue-800 text-sm"
//                     >
//                       Change Sale
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Return Reason *
//                   </label>
//                   <select
//                     {...register("reason")}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="">Select reason</option>
//                     <option value="DEFECTIVE">Defective Product</option>
//                     <option value="WRONG_ITEM">Wrong Item</option>
//                     <option value="CUSTOMER_CHANGE_MIND">
//                       Customer Changed Mind
//                     </option>
//                     <option value="DAMAGED">Damaged in Transit</option>
//                     <option value="OTHER">Other</option>
//                   </select>
//                   {errors.reason && (
//                     <p className="mt-1 text-sm text-red-600">
//                       {errors.reason.message}
//                     </p>
//                   )}
//                 </div>

//                 {/* Return Lines */}
//                 <div>
//                   <h4 className="text-md font-medium text-gray-900 mb-4">
//                     Items to Return
//                   </h4>
//                   <div className="space-y-4">
//                     {fields.map((field, index) => {
//                       const originalLine = selectedSale.saleLines.find(
//                         (l) => l.id === field.originalLineId,
//                       );

//                       if (!originalLine) return null;

//                       return (
//                         <div
//                           key={field.id}
//                           className="bg-gray-50 p-4 rounded-lg"
//                         >
//                           <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
//                             <div className="sm:col-span-2">
//                               <label className="block text-sm font-medium text-gray-700">
//                                 Item
//                               </label>
//                               <div className="mt-1 p-2 bg-white border border-gray-300 rounded-md text-sm">
//                                 <div className="font-medium">
//                                   {originalLine.item.sku}
//                                 </div>
//                                 <div className="text-gray-500">
//                                   {originalLine.item.name}
//                                 </div>
//                                 <div className="text-xs text-gray-400">
//                                   Original: {originalLine.qty} @ ₦
//                                   {originalLine.unitPrice.toLocaleString()}
//                                 </div>
//                               </div>
//                               <input
//                                 type="hidden"
//                                 {...register(
//                                   `returnLines.${index}.originalLineId`,
//                                 )}
//                               />
//                               <input
//                                 type="hidden"
//                                 {...register(`returnLines.${index}.itemId`)}
//                               />
//                               <input
//                                 type="hidden"
//                                 {...register(`returnLines.${index}.unitPrice`, {
//                                   valueAsNumber: true,
//                                 })}
//                               />
//                             </div>

//                             <div>
//                               <label className="block text-sm font-medium text-gray-700">
//                                 Qty to Return
//                               </label>
//                               <input
//                                 {...register(
//                                   `returnLines.${index}.qtyReturned`,
//                                   {
//                                     valueAsNumber: true,
//                                   },
//                                 )}
//                                 type="number"
//                                 step="1"
//                                 min="0"
//                                 max={originalLine.qty}
//                                 className="mt-1 block w-full py-2 px-3  border border-gray-300 rounded-md text-sm text-gray-900  focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                               />
//                             </div>

//                             <div>
//                               <label className="block text-sm font-medium text-gray-700">
//                                 Return Value
//                               </label>
//                               <div className="mt-1 block w-full py-2 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-900">
//                                 ₦
//                                 {(
//                                   (watch(`returnLines.${index}.qtyReturned`) ||
//                                     0) * originalLine.unitPrice
//                                 ).toLocaleString()}
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>

//                 {/* Return Total */}
//                 <div className="bg-red-50 p-4 rounded-lg">
//                   <div className="flex justify-between items-center">
//                     <span className="text-lg font-medium text-gray-900">
//                       Total Refund:
//                     </span>
//                     <span className="text-2xl font-bold text-red-600">
//                       ₦{calculateReturnTotal().toLocaleString()}
//                     </span>
//                   </div>
//                 </div>

//                 <div className="flex justify-end space-x-3 pt-4 border-t">
//                   <button
//                     type="button"
//                     onClick={onClose}
//                     className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     type="submit"
//                     disabled={isSubmitting || calculateReturnTotal() === 0}
//                     className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     <RotateCcw className="h-4 w-4 mr-2" />
//                     {isSubmitting ? "Processing..." : "Process Return"}
//                   </button>
//                 </div>
//               </form>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PosReturnsModal;
