import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adjustmentApi, managementApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";
import { ItemSelect } from "../../components/ItemSelect";

const createAdjustmentSchema = z.object({
  adjustmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  notes: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  accountId: z.string().min(1, "Account is required"),
  adjustmentLines: z
    .array(
      z.object({
        itemId: z.string().cuid("Item is required"),
        quantity: z.number().positive("Quantity must be positive"),
        adjustmentType: z.enum(["SURPLUS", "DEFICIT"]),
      }),
    )
    .min(1, "At least one adjustment entry is required"),
});

type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;

interface CreateAdjustmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAdjustmentModal = ({
  onClose,
  onSuccess,
}: CreateAdjustmentModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdjustmentFormData>({
    resolver: zodResolver(createAdjustmentSchema),
    defaultValues: {
      adjustmentDate: new Date().toISOString().split("T")[0],
      accountId: "",
      adjustmentLines: [{ itemId: "", quantity: 0, adjustmentType: "SURPLUS" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "adjustmentLines",
  });

  // const watchedQty = watch("adjustmentLines".quantity)

  const watchedLines = watch("adjustmentLines");
  const [itemDetailsMap, setItemDetailsMap] = useState<
    Record<string, { itemName: string; uom: string }>
  >({});

  const { data: chartAccounts } = useQuery<{
    accounts: Array<{ id: string; code: string; name: string }>;
  }>({
    queryKey: ["chartAccounts-for-Adjustment"],
    queryFn: async () => {
      const response = await managementApi.getChartOfAccounts();
      return response as {
        accounts: Array<{ id: string; code: string; name: string }>;
      };
    },
  });

  const { data: warehouses } = useQuery<{
    warehouses: Array<{ id: string; code: string; name: string }>;
  }>({
    queryKey: ["warehouses-for-Adjustments"],
    queryFn: async () => {
      const response = await inventoryApi.getWarehouses();
      return response as {
        warehouses: Array<{ id: string; code: string; name: string }>;
      };
    },
  });

  // const { surplusItems, deficitItems } = useMemo(() => {
  //   const surplus: Array<{ itemName: string; qty: number; uom: string }> = [];
  //   const deficit: Array<{ itemName: string; qty: number; uom: string }> = [];

  //   if (!watchedLines) {
  //     return { surplusItems: surplus, deficitItems: deficit };
  //   }

  //   watchedLines.forEach((line) => {
  //     if (!line.itemId || !line.quantity || Number(line.quantity) <= 0) return;

  //     const matchedItem = itemDetailsMap[line.itemId];
  //     const itemName = matchedItem?.itemName || "Selected Item";
  //     const uom = matchedItem?.uom || "QTY";

  //     const details = {
  //       itemName,
  //       qty: Number(line.quantity),
  //       uom,
  //     };

  //     if (line.adjustmentType === "SURPLUS") {
  //       surplus.push(details);
  //     } else if (line.adjustmentType === "DEFICIT") {
  //       deficit.push(details);
  //     }
  //   });

  //   return { surplusItems: surplus, deficitItems: deficit };
  // }, [itemDetailsMap, watchedLines]);

  // useEffect(() => {
  //   if (!watchedLines?.length) return;

  //   const pendingLines = watchedLines.filter(
  //     (line) =>
  //       Boolean(line.itemId) &&
  //       Number(line.quantity) > 0 &&
  //       !itemDetailsMap[line.itemId],
  //   );

  //   if (!pendingLines.length) return;

  //   let isCancelled = false;

  //   const fetchMissingItemDetails = async () => {
  //     for (const line of pendingLines) {
  //       if (!line.itemId || Number(line.quantity) <= 0 || isCancelled) break;

  //       try {
  //         const selectedItem = (await inventoryApi.getItemById(line.itemId)) as
  //           | { name?: string; uom?: string }
  //           | undefined;

  //         if (!isCancelled) {
  //           setItemDetailsMap((prev) => ({
  //             ...prev,
  //             [line.itemId]: {
  //               itemName: selectedItem?.name || "Selected Item",
  //               uom: selectedItem?.uom || "QTY",
  //             },
  //           }));
  //         }
  //       } catch (error) {
  //         console.error("Failed to load adjustment item details", error);

  //         if (!isCancelled) {
  //           setItemDetailsMap((prev) => ({
  //             ...prev,
  //             [line.itemId]: {
  //               itemName: "Selected Item",
  //               uom: "QTY",
  //             },
  //           }));
  //         }
  //       }
  //     }
  //   };

  //   fetchMissingItemDetails();

  //   return () => {
  //     isCancelled = true;
  //   };
  // }, [itemDetailsMap, watchedLines]);

  const onSubmit = async (data: CreateAdjustmentFormData) => {
    try {
      await adjustmentApi.adjustStock(data);
      toast.success("Stock Adjustment created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create Stock Adjustment error:", error);
      toast.error("Failed to post stock adjustment");
    }
  };

  // Pre-fill chart of account (8100 - Inventory Adjustment Expense Account)
  useEffect(() => {
    const accounts = chartAccounts?.accounts ?? [];
    if (!accounts.length) return;

    const inventoryAdjustment = accounts.find(
      (acct) => String(acct.code) === "8100",
    );

    if (!inventoryAdjustment) return;

    const currentValue = getValues("accountId");
    if (!currentValue) {
      setValue("accountId", String(inventoryAdjustment.id), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [chartAccounts?.accounts, getValues, setValue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h3 className="text-white text-lg font-bold">
              Create Stock Adjustment
            </h3>
            <p className="text-blue-100 text-xs mt-1">
              Adjust item stock levels and record ledger impacts
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[80vh] overflow-y-auto space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Top Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-5">
              {/* Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Date *
                </label>
                <input
                  {...register("adjustmentDate")}
                  type="date"
                  className="mt-1.5 w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {errors.adjustmentDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.adjustmentDate.message}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Note *
                </label>
                <input
                  {...register("notes")}
                  placeholder="Reason for adjustment"
                  className="mt-1.5 w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                {errors.notes && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.notes.message}
                  </p>
                )}
              </div>

              {/* Account */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Account *
                </label>
                <div className="mt-1.5">
                  <ChartAccountSelect
                    accounts={chartAccounts?.accounts ?? []}
                    value={watch("accountId")}
                    onChange={(val) =>
                      setValue("accountId", val, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    error={errors.accountId?.message}
                  />
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Warehouse *
                </label>
                <select
                  {...register("warehouseId")}
                  className="mt-1.5 w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  <option value="">Select warehouse</option>
                  {(warehouses?.warehouses ?? []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.warehouseId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Adjustment Lines Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-gray-900">
                Adjustment Entries
              </h4>

              <button
                type="button"
                onClick={() =>
                  append({ itemId: "", quantity: 0, adjustmentType: "SURPLUS" })
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </button>
            </div>

            {/* Lines List */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50/50 border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-300 transition"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                    {/* Item */}
                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        Item *
                      </label>
                      <ItemSelect
                        value={watch(`adjustmentLines.${index}.itemId`)}
                        onChange={(val) =>
                          setValue(`adjustmentLines.${index}.itemId`, val, {
                            shouldValidate: true,
                          })
                        }
                        error={errors.adjustmentLines?.[index]?.itemId?.message}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        Qty *
                      </label>
                      <input
                        {...register(`adjustmentLines.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {errors.adjustmentLines?.[index]?.quantity && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.adjustmentLines[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        Type *
                      </label>
                      <select
                        {...register(`adjustmentLines.${index}.adjustmentType`)}
                        className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="SURPLUS">SURPLUS (Add to Stock)</option>
                        <option value="DEFICIT">
                          DEFICIT (Remove from Stock)
                        </option>
                      </select>
                    </div>

                    {/* Remove */}
                    <div className="flex justify-end sm:justify-start">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {errors.adjustmentLines?.message && (
                <p className="text-red-500 text-sm">
                  {errors.adjustmentLines.message}
                </p>
              )}
            </div>

            {/* TWO-COLUMN ACCOUNTING & STOCK IMPLICATION PANEL */}
            {/* {(surplusItems.length > 0 || deficitItems.length > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Real-time Ledger & Inventory Implications
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <div className="p-1 bg-emerald-100 rounded-lg">
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      </div>
                      Surplus (Increases Stock Asset)
                    </div>
                    {surplusItems.length > 0 ? (
                      <ul className="space-y-2 text-xs text-emerald-950 font-medium">
                        {surplusItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex flex-col xl:flex-row xl:justify-between border-b border-emerald-100/50 pb-1.5 last:border-0 last:pb-0 gap-1"
                          >
                            <span>
                              ➕ <strong>{item.itemName}</strong>: add{" "}
                              {item.qty} {item.uom}
                            </span>
                            <span className="text-emerald-700 text-[10px] xl:text-xs">
                              [Debit: Inventory Asset / Credit: Adj. Account]
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No surplus adjustments configured.
                      </p>
                    )}
                  </div>

                  //{/* DEFICIT COLUMN 
                  <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <div className="p-1 bg-amber-100 rounded-lg">
                        <ArrowDownRight className="w-4 h-4 text-amber-600" />
                      </div>
                      Deficit (Reduces Stock Asset)
                    </div>
                    {deficitItems.length > 0 ? (
                      <ul className="space-y-2 text-xs text-amber-950 font-medium">
                        {deficitItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex flex-col xl:flex-row xl:justify-between border-b border-amber-100/50 pb-1.5 last:border-0 last:pb-0 gap-1"
                          >
                            <span>
                              ➖ <strong>{item.itemName}</strong>: remove{" "}
                              {item.qty} {item.uom}
                            </span>
                            <span className="text-amber-700 text-[10px] xl:text-xs font-semibold">
                              [Debit: Adj. Account / Credit: Inventory Asset]
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No deficit adjustments configured.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )} */}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border rounded-xl text-gray-700 hover:bg-gray-100 font-semibold text-sm transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm disabled:opacity-50 transition"
              >
                {isSubmitting ? "Posting..." : "Post Adjustment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAdjustmentModal;

// import React, { useEffect } from "react";
// import { useForm, useFieldArray } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { X, Plus, Trash2 } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import { adjustmentApi, managementApi, inventoryApi } from "../../lib/api";
// import toast from "react-hot-toast";
// import { ChartAccountSelect } from "../../components/ChartAccountSelect";
// import { ItemSelect } from "../../components/ItemSelect";

// const createAdjustmentSchema = z.object({
//   adjustmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
//     message: "Invalid date format",
//   }),
//   notes: z.string().optional(),
//   warehouseId: z.string(),
//   accountId: z.string(),
//   adjustmentLines: z.array(
//     z.object({
//       itemId: z.string().cuid(),
//       quantity: z.number(),
//       adjustmentType: z.enum(["SURPLUS", "DEFICIT"]),
//     }),
//   ),
// });

// type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;

// interface CreateAdjustmentModalProps {
//   onClose: () => void;
//   onSuccess: () => void;
// }

// const CreateAdjustmentModal = ({
//   onClose,
//   onSuccess,
// }: CreateAdjustmentModalProps) => {
//   const {
//     register,
//     control,
//     handleSubmit,
//     watch,
//     setValue,
//     getValues,
//     // reset,
//     formState: { errors, isSubmitting },
//   } = useForm<CreateAdjustmentFormData>({
//     resolver: zodResolver(createAdjustmentSchema),
//     defaultValues: {
//       adjustmentDate: new Date().toISOString().split("T")[0],
//       accountId: "",
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "adjustmentLines",
//   });

//   const watchedLines = watch("adjustmentLines");

//   const { data: chartAccounts } = useQuery({
//     queryKey: ["chartAccounts-for-Adjustment"],
//     queryFn: () => managementApi.getChartOfAccounts(),
//   });

//   const inventoryAdjustment = chartAccounts?.account?.find(
//     (acct: any) => String(acct.code) === "8100",
//   );

//   //   const { data: items } = useQuery({
//   //     queryKey: ['items-for-Adjustments'],
//   //     queryFn: () => inventoryApi.getItems({  limit: 100 })
//   //   });

//   //   console.log(items)
//   const { data: warehouses } = useQuery({
//     queryKey: ["warehouses-for-Adjustments"],
//     queryFn: () => inventoryApi.getWarehouses(),
//   });

//   const selectedWarehouseId = watch("warehouseId");

//   const { data: items, refetch } = useQuery({
//     queryKey: ["items-for-Adjustments", selectedWarehouseId],
//     queryFn: () =>
//       inventoryApi.getItems({
//         limit: 100,
//         warehouseId: selectedWarehouseId,
//         includeStock: true,
//       }),
//     enabled: !!selectedWarehouseId, // don’t run until warehouse chosen
//   });

//   //   const calculateDebitTotal = () => {
//   //     return watchedLines.reduce((sum, line) => {
//   //       return sum + (line.debit || 0) ;
//   //     }, 0);
//   //   };
//   //   const calculateCreditTotal = () => {
//   //     return watchedLines.reduce((sum, line) => {
//   //       return sum + (line.credit || 0) ;
//   //     }, 0);
//   //   };

//   const onSubmit = async (data: CreateAdjustmentFormData) => {
//     try {
//       await adjustmentApi.adjustStock(data);
//       toast.success("Stock Adjustment created successfully");
//       onSuccess();
//     } catch (error) {
//       console.error("Create Stock Adjustment error:", error);
//     }
//   };

//   // Pre fill chart of account
//   useEffect(() => {
//     if (!chartAccounts?.accounts?.length) return;

//     const inventoryAdjustment = chartAccounts.accounts.find(
//       (acct: any) => String(acct.code) === "8100",
//     );

//     if (!inventoryAdjustment) return;

//     const currentValue = getValues("accountId");

//     if (!currentValue) {
//       setValue("accountId", String(inventoryAdjustment.id), {
//         shouldValidate: true,
//         shouldDirty: true,
//       });
//     }
//   }, [chartAccounts?.accounts, getValues, setValue]);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//       {/* Clickable overlay (closes modal) */}
//       <div className="absolute inset-0" onClick={onClose} />

//       {/* Modal Container */}
//       <div className="relative w-full max-w-6xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
//         {/* Header */}
//         <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
//           <h3 className="text-white text-lg font-semibold">
//             Create Adjustment
//           </h3>

//           <button onClick={onClose} className="text-white/80 hover:text-white">
//             <X className="h-6 w-6" />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//             {/* Top Fields */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Date */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">
//                   Date *
//                 </label>
//                 <input
//                   {...register("adjustmentDate")}
//                   type="date"
//                   className="mt-1 w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//                 {errors.adjustmentDate && (
//                   <p className="text-red-500 text-sm">
//                     {errors.adjustmentDate.message}
//                   </p>
//                 )}
//               </div>

//               {/* Note */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">
//                   Note *
//                 </label>
//                 <input
//                   {...register("notes")}
//                   className="mt-1 w-full border rounded-md px-3 py-2"
//                 />
//                 {errors.notes && (
//                   <p className="text-red-500 text-sm">{errors.notes.message}</p>
//                 )}
//               </div>

//               {/* Account */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">
//                   Account *
//                 </label>
//                 <ChartAccountSelect
//                   accounts={chartAccounts?.accounts || []}
//                   value={watch("accountId")}
//                   onChange={(val) =>
//                     setValue("accountId", val, { shouldDirty: true })
//                   }
//                   error={errors.accountId?.message}
//                 />
//               </div>

//               {/* Warehouse */}
//               <div>
//                 <label className="text-sm font-medium text-gray-700">
//                   Warehouse *
//                 </label>
//                 <select
//                   {...register("warehouseId")}
//                   className="mt-1 w-full border rounded-md px-3 py-2"
//                 >
//                   <option value="">Select warehouse</option>
//                   {warehouses?.warehouses?.map((w) => (
//                     <option key={w.id} value={w.id}>
//                       {w.code} - {w.name}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.warehouseId && (
//                   <p className="text-red-500 text-sm">
//                     {errors.warehouseId.message}
//                   </p>
//                 )}
//               </div>
//             </div>

//             {/* Adjustment Lines Header */}
//             <div className="flex items-center justify-between">
//               <h4 className="text-md font-semibold text-gray-900">
//                 Adjustment Entries
//               </h4>

//               <button
//                 type="button"
//                 onClick={() =>
//                   append({ itemId: "", quantity: 0, adjustmentType: "SURPLUS" })
//                 }
//                 className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
//               >
//                 <Plus className="h-4 w-4" />
//                 Add Entry
//               </button>
//             </div>

//             {/* Lines */}
//             <div className="space-y-4">
//               {fields.map((field, index) => (
//                 <div
//                   key={field.id}
//                   className="bg-gray-50 border rounded-lg p-4"
//                 >
//                   <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
//                     {/* Item */}
//                     <div className="sm:col-span-2">
//                       <label className="text-sm font-medium text-gray-700">
//                         Item *
//                       </label>
//                       <ItemSelect
//                         items={items?.items || []}
//                         value={watch(`adjustmentLines.${index}.itemId`)}
//                         onChange={(val) =>
//                           setValue(`adjustmentLines.${index}.itemId`, val)
//                         }
//                         error={errors.adjustmentLines?.[index]?.itemId?.message}
//                       />
//                     </div>

//                     {/* Quantity */}
//                     <div>
//                       <label className="text-sm font-medium text-gray-700">
//                         Qty *
//                       </label>
//                       <input
//                         {...register(`adjustmentLines.${index}.quantity`, {
//                           valueAsNumber: true,
//                         })}
//                         type="number"
//                         className="mt-1 w-full border rounded-md px-3 py-2"
//                       />
//                       {errors.adjustmentLines?.[index]?.quantity && (
//                         <p className="text-red-500 text-sm">
//                           {errors.adjustmentLines[index]?.quantity?.message}
//                         </p>
//                       )}
//                     </div>

//                     {/* Type */}
//                     <div>
//                       <label className="text-sm font-medium text-gray-700">
//                         Type *
//                       </label>
//                       <select
//                         {...register(`adjustmentLines.${index}.adjustmentType`)}
//                         className="mt-1 w-full border rounded-md px-3 py-2"
//                       >
//                         <option value="SURPLUS">SURPLUS</option>
//                         <option value="DEFICIT">DEFICIT</option>
//                       </select>
//                     </div>

//                     {/* Remove */}
//                     <div className="flex items-end">
//                       {fields.length > 1 && (
//                         <button
//                           type="button"
//                           onClick={() => remove(index)}
//                           className="text-red-500 hover:text-red-700"
//                         >
//                           <Trash2 className="h-5 w-5" />
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Actions */}
//             <div className="flex justify-end gap-3 pt-4 border-t">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
//               >
//                 Cancel
//               </button>

//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//               >
//                 {isSubmitting ? "Posting..." : "Post Adjustment"}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateAdjustmentModal;
