import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save, AlertTriangle, Factory } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const editProductionOrderSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  qtyTarget: z.number().positive("Target quantity must be positive"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  bomId: z.string().optional(),
});

type EditProductionOrderFormData = z.infer<typeof editProductionOrderSchema>;

interface EditProductionOrderModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProductionOrderModal = ({
  order,
  onClose,
  onSuccess,
}: EditProductionOrderModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditProductionOrderFormData>({
    resolver: zodResolver(editProductionOrderSchema),
    defaultValues: {
      itemId: order.itemId,
      qtyTarget: Number(order.qtyTarget),
      warehouseId: order.warehouseId,
      bomId: order.bomId || "",
    },
  });

  const selectedItemId = watch("itemId");

  const { data: finishedGoods } = useQuery({
    queryKey: ["finished-goods-for-edit-production"],
    queryFn: () =>
      inventoryApi.getItems({ type: "FINISHED_GOODS", limit: 100 }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-edit"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: boms } = useQuery({
    queryKey: ["boms-for-edit-item", selectedItemId],
    queryFn: () =>
      selectedItemId ? inventoryApi.getBoms({ itemId: selectedItemId }) : null,
    enabled: !!selectedItemId,
  });

  // Reset form when order changes
  useEffect(() => {
    reset({
      itemId: order.itemId,
      qtyTarget: Number(order.qtyTarget),
      warehouseId: order.warehouseId,
      bomId: order.bomId || "",
    });
  }, [order, reset]);

  const onSubmit = async (data: EditProductionOrderFormData) => {
    try {
      const submitData = {
        ...data,
        bomId: data.bomId || undefined,
      };
      await productionApi.updateProductionOrder(order.id, submitData);
      toast.success("Production order updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit production order error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
                  <Factory className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit Production Order
                  </h3>
                  <p className="text-sm text-gray-500">
                    {order.orderNo} • Status:{" "}
                    <span className="font-medium">{order.status}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6"
          >
            {/* Released Warning */}
            {order.status === "RELEASED" && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800">
                      Released Order Warning
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This production order has already been released. Updating
                      it may affect material planning, scheduling, and
                      operational workflows.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Production Details */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-5">
              <h4 className="text-sm font-semibold text-gray-900">
                Production Details
              </h4>

              {/* Finished Goods */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Finished Goods Item *
                </label>

                <select
                  {...register("itemId")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Select finished goods item</option>

                  {finishedGoods?.items?.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </option>
                  ))}
                </select>

                {errors.itemId && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.itemId.message}
                  </p>
                )}
              </div>

              {/* Qty + Warehouse */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Target Quantity *
                  </label>

                  <input
                    {...register("qtyTarget", { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />

                  {errors.qtyTarget && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.qtyTarget.message}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-gray-500">
                    Original Quantity: {order.qtyTarget}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Warehouse *
                  </label>

                  <select
                    {...register("warehouseId")}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="">Select warehouse</option>

                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>

                  {errors.warehouseId && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.warehouseId.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* BOM Selection */}
            {selectedItemId && boms && boms.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">
                  Bill of Materials
                </h4>

                <select
                  {...register("bomId")}
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">No BOM - Manual material planning</option>

                  {boms.map((bom: any) => (
                    <option key={bom.id} value={bom.id}>
                      Version {bom.version} ({bom.bomLines.length} components)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Change Summary */}
            {isDirty && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h4 className="text-sm font-semibold text-amber-900 mb-3">
                  Change Impact
                </h4>

                <ul className="space-y-2 text-sm text-amber-800">
                  <li>• Production order details will be updated</li>
                  <li>• Material requirements may be recalculated</li>
                  <li>• Inventory planning may be affected</li>

                  {order.status === "RELEASED" && (
                    <li>• Released orders may impact live scheduling</li>
                  )}
                </ul>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductionOrderModal;
