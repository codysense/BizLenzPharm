import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";

const createProductionOrderSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  qtyTarget: z.number().positive("Target quantity must be positive"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  bomId: z.string().optional(),
});

type CreateProductionOrderFormData = z.infer<
  typeof createProductionOrderSchema
>;

interface CreateProductionOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateProductionOrderModal = ({
  onClose,
  onSuccess,
}: CreateProductionOrderModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductionOrderFormData>({
    resolver: zodResolver(createProductionOrderSchema),
  });

  const selectedItemId = watch("itemId");

  // const { data: finishedGoods } = useQuery({
  //   queryKey: ['finished-goods-for-production'],
  //   queryFn: () => inventoryApi.getItems({ type: 'FINISHED_GOODS', limit: 100 })
  // });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: boms } = useQuery<any[]>({
    queryKey: ["boms-for-item", selectedItemId],
    queryFn: () => inventoryApi.getBoms({ itemId: selectedItemId }),
    enabled: !!selectedItemId,
  });

  const onSubmit = async (data: CreateProductionOrderFormData) => {
    try {
      // Remove empty bomId to avoid validation error
      const submitData = {
        ...data,
        bomId: data.bomId || undefined,
      };
      await productionApi.createProductionOrder(submitData);
      toast.success("Production order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create production order error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-100">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Create Production Order
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Schedule manufacturing for finished goods inventory
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Finished Goods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finished Goods Item *
                </label>
                <ItemSelect
                  value={watch("itemId")}
                  onChange={(val) => setValue("itemId", val)}
                  typeFilter="FINISHED_GOODS"
                />
                {errors.itemId && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.itemId.message}
                  </p>
                )}
              </div>

              {/* Quantity + Warehouse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Quantity *
                  </label>
                  <input
                    {...register("qtyTarget", { valueAsNumber: true })}
                    type="number"
                    step="0.001"
                    placeholder="100"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.qtyTarget && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.qtyTarget.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warehouse *
                  </label>
                  <select
                    {...register("warehouseId")}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              {/* BOM Section */}
              {selectedItemId && boms && boms.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <label className="block text-sm font-medium text-gray-800 mb-3">
                    Bill of Materials (Recommended)
                  </label>

                  <select
                    {...register("bomId")}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No BOM - Manual material planning</option>

                    {boms.map((bom: any) => (
                      <option key={bom.id} value={bom.id}>
                        Version {bom.version} ({bom.bomLines.length} components)
                      </option>
                    ))}
                  </select>

                  {/* BOM Preview */}
                  <div className="mt-4 space-y-3">
                    {boms.map((bom: any) => (
                      <div
                        key={bom.id}
                        className="bg-white rounded-xl border border-blue-100 p-4"
                      >
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">
                          Version {bom.version}
                        </h4>

                        <div className="space-y-2">
                          {bom.bomLines.map((line: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm text-gray-700"
                            >
                              <span>{line.componentItem.sku}</span>

                              <span className="font-medium">
                                {line.qtyPer} {line.componentItem.uom}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No BOM Warning */}
              {selectedItemId && (!boms || boms.length === 0) && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />

                    <div>
                      <h4 className="text-sm font-semibold text-yellow-900">
                        No BOM Available
                      </h4>

                      <p className="text-sm text-yellow-700 mt-1">
                        This item doesn't have a Bill of Materials. You'll need
                        to manually issue raw materials.
                      </p>

                      <p className="text-sm text-yellow-700 mt-2">
                        Consider creating a BOM for automated material planning.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium 
                hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Production Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductionOrderModal;
