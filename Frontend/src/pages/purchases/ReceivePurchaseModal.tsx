import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { purchaseApi, inventoryApi } from "../../lib/api";
import { Purchase } from "../../types/api";
import toast from "react-hot-toast";

const receivePurchaseSchema = z.object({
  receiptLines: z
    .array(
      z.object({
        purchaseLineId: z.string().min(1, "Purchase line is required"),
        qtyReceived: z.number().positive("Quantity must be positive"),
        unitCost: z.number().positive("Unit cost must be positive"),
        warehouseId: z.string().min(1, "Warehouse is required"),
      })
    )
    .min(1, "At least one receipt line is required"),
});

type ReceivePurchaseFormData = z.infer<typeof receivePurchaseSchema>;

interface ReceivePurchaseModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSuccess: () => void;
}

const ReceivePurchaseModal = ({
  purchase,
  onClose,
  onSuccess,
}: ReceivePurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReceivePurchaseFormData>({
    resolver: zodResolver(receivePurchaseSchema),
    defaultValues: {
      receiptLines: purchase.purchaseLines.map((line) => ({
        purchaseLineId: line.id,
        qtyReceived: line.qty,
        unitCost: line.unitPrice,
        warehouseId: "",
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "receiptLines",
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-receipt"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedLines = watch("receiptLines");

  const onSubmit = async (data: ReceivePurchaseFormData) => {
    try {
      await purchaseApi.receivePurchase(purchase.id, data);
      toast.success("Purchase received successfully");
      onSuccess();
    } catch (error) {
      console.error("Receive purchase error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Receive Purchase Order: {purchase.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Purchase Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-sm text-gray-500">Vendor:</span>
                    <div className="font-medium">{purchase.vendor.name}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Order Date:</span>
                    <div className="font-medium">
                      {new Date(purchase.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Total Amount:</span>
                    <div className="font-medium">
                      ₦{purchase.totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Lines */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Receipt Details
                </h4>

                {errors.receiptLines && (
                  <p className="mb-4 text-sm text-red-600">
                    {errors.receiptLines.message}
                  </p>
                )}

                {/* Global Warehouse Assignment */}
                <div className="bg-gray-100 p-4 rounded-lg mb-4 border">
                  <label className="block text-sm font-medium text-gray-700">
                    Apply Warehouse to All Lines
                  </label>

                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3
               focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    onChange={(e) => {
                      const selected = e.target.value;

                      // Update every line's warehouseId
                      fields.forEach((_, index) => {
                        setValue(`receiptLines.${index}.warehouseId`, selected);
                      });
                    }}
                  >
                    <option value="">Select warehouse</option>
                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const purchaseLine = purchase.purchaseLines[index];
                    if (!purchaseLine) return null;

                    return (
                      <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Item
                            </label>
                            <div className="mt-1 p-2 bg-white border border-gray-300 rounded-md text-sm">
                              <div className="font-medium">
                                {purchaseLine.item.sku}
                              </div>
                              <div className="text-gray-500">
                                {purchaseLine.item.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                Ordered: {purchaseLine.qty}{" "}
                                {purchaseLine.item.uom}
                              </div>
                            </div>
                            <input
                              type="hidden"
                              {...register(
                                `receiptLines.${index}.purchaseLineId`
                              )}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Qty Received *
                            </label>
                            <input
                              {...register(
                                `receiptLines.${index}.qtyReceived`,
                                { valueAsNumber: true }
                              )}
                              type="number"
                              step="0.001"
                              disabled
                              max={purchaseLine.qty}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.receiptLines?.[index]?.qtyReceived && (
                              <p className="mt-1 text-sm text-red-600">
                                {
                                  errors.receiptLines[index]?.qtyReceived
                                    ?.message
                                }
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Unit Cost *
                            </label>
                            <input
                              {...register(`receiptLines.${index}.unitCost`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              disabled
                              step="0.01"
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            {errors.receiptLines?.[index]?.unitCost && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.receiptLines[index]?.unitCost?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Warehouse *
                            </label>
                            <select
                              {...register(`receiptLines.${index}.warehouseId`)}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              <option value="">Select warehouse</option>
                              {warehouses?.warehouses?.map((warehouse: any) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.code} - {warehouse.name}
                                </option>
                              ))}
                            </select>
                            {errors.receiptLines?.[index]?.warehouseId && (
                              <p className="mt-1 text-sm text-red-600">
                                {
                                  errors.receiptLines[index]?.warehouseId
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

                {/* Total */}
                <div className="mt-4 bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">
                      Total Receipt Value:
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      ₦
                      {watchedLines
                        .reduce(
                          (sum, line) =>
                            sum +
                            (line.qtyReceived || 0) * (line.unitCost || 0),
                          0
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Receiving..." : "Receive Items"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivePurchaseModal;
