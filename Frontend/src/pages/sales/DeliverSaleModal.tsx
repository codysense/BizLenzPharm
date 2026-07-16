import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesApi, inventoryApi } from "../../lib/api";
import { Sale } from "../../types/api";
import toast from "react-hot-toast";

const deliverSaleSchema = z.object({
  deliveryLines: z
    .array(
      z.object({
        saleLineId: z.string().min(1, "Sale line is required"),
        qtyDelivered: z.number().positive("Quantity must be positive"),
        warehouseId: z.string().min(1, "Warehouse is required"),
      }),
    )
    .min(1, "At least one delivery line is required"),
});

type DeliverSaleFormData = z.infer<typeof deliverSaleSchema>;

interface DeliverSaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

const DeliverSaleModal = ({
  sale,
  onClose,
  onSuccess,
}: DeliverSaleModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeliverSaleFormData>({
    resolver: zodResolver(deliverSaleSchema),
    defaultValues: {
      deliveryLines: sale.saleLines.map((line) => ({
        saleLineId: line.id,
        qtyDelivered: line.qty,
        warehouseId: "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "deliveryLines",
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-delivery"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedLines = watch("deliveryLines");

  const onSubmit = async (data: DeliverSaleFormData) => {
    try {
      await salesApi.deliverSale(sale.id, data);
      toast.success("Sale delivered successfully");
      onSuccess();
    } catch (error) {
      console.error("Deliver sale error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 ">
      {/* Backdrop - behind modal */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Modal wrapper */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-0">
        <div className="w-full max-w-6xl rounded-3xl bg-white border border-gray-100 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Deliver Sales Order
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Order: {sale.orderNo}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto p-6 space-y-6"
          >
            {/* Sales Summary */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-semibold text-gray-900">
                    {sale.customer.name}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(sale.orderDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-blue-600 text-lg">
                    ₦{sale.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Global Warehouse Assignment */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
              <h4 className="font-semibold text-gray-900 mb-3">
                Apply Warehouse to All Items
              </h4>

              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                onChange={(e) => {
                  const selected = e.target.value;

                  fields.forEach((_, index) => {
                    setValue(`deliveryLines.${index}.warehouseId`, selected);
                  });
                }}
              >
                <option value="">Select warehouse</option>
                {warehouses?.warehouses?.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery Lines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Details
              </h4>

              {errors.deliveryLines && (
                <p className="mb-4 text-sm text-red-500">
                  {errors.deliveryLines.message}
                </p>
              )}

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const saleLine = sale.saleLines[index];
                  if (!saleLine) return null;

                  return (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                        {/* Item */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Item
                          </label>

                          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                            <p className="font-semibold text-gray-900">
                              {saleLine.item.sku}
                            </p>
                            <p className="text-sm text-gray-600">
                              {saleLine.item.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Ordered: {saleLine.qty} {saleLine.item.uom}
                            </p>
                          </div>

                          <input
                            type="hidden"
                            {...register(`deliveryLines.${index}.saleLineId`)}
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Qty to Deliver *
                          </label>

                          <input
                            {...register(
                              `deliveryLines.${index}.qtyDelivered`,
                              {
                                valueAsNumber: true,
                              },
                            )}
                            type="number"
                            step="0.001"
                            max={saleLine.qty}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3
                          focus:bg-white focus:ring-2 focus:ring-blue-500
                          focus:border-blue-500 outline-none transition"
                          />

                          {errors.deliveryLines?.[index]?.qtyDelivered && (
                            <p className="mt-2 text-sm text-red-500">
                              {
                                errors.deliveryLines[index]?.qtyDelivered
                                  ?.message
                              }
                            </p>
                          )}
                        </div>

                        {/* Warehouse */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Warehouse *
                          </label>

                          <select
                            {...register(`deliveryLines.${index}.warehouseId`)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3
                          focus:bg-white focus:ring-2 focus:ring-blue-500
                          focus:border-blue-500 outline-none transition"
                          >
                            <option value="">Select warehouse</option>
                            {warehouses?.warehouses?.map((warehouse) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.code} - {warehouse.name}
                              </option>
                            ))}
                          </select>

                          {errors.deliveryLines?.[index]?.warehouseId && (
                            <p className="mt-2 text-sm text-red-500">
                              {
                                errors.deliveryLines[index]?.warehouseId
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
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Delivering..." : "Deliver Items"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="fixed inset-0 z-50">
  //     {/* Backdrop - behind modal */}
  //     <div className="absolute inset-0 bg-black/40 z-0" />

  //     {/* Modal wrapper */}
  //     <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
  //       <div className="w-full max-w-6xl rounded-3xl bg-white border border-gray-100 shadow-2xl overflow-hidden">
  //         {/* Header */}
  //         <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
  //           <div className="flex items-start justify-between">
  //             <div>
  //               <h3 className="text-xl font-semibold tracking-tight">
  //                 Deliver Sales Order
  //               </h3>
  //               <p className="text-sm text-blue-100 mt-1">
  //                 Order: {sale.orderNo}
  //               </p>
  //             </div>

  //             <button
  //               type="button"
  //               onClick={onClose}
  //               className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
  //             >
  //               <X className="h-5 w-5 text-white" />
  //             </button>
  //           </div>
  //         </div>

  //         {/* Scrollable body */}
  //         <form
  //           onSubmit={handleSubmit(onSubmit)}
  //           className="max-h-[85vh] overflow-y-auto p-6 space-y-6"
  //         >
  //           {/* your existing form content stays here */}
  //         </form>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default DeliverSaleModal;
