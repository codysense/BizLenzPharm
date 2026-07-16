import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";

const capitalizeFromPurchaseSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  assets: z
    .array(
      z.object({
        name: z.string().min(1, "Asset name is required"),
        categoryId: z.string().min(1, "Category is required"),
        acquisitionCost: z.number().positive("Cost must be positive"),
        serialNumber: z.string().optional(),
        locationId: z.string().optional(),
      }),
    )
    .min(1, "At least one asset is required"),
});

type CapitalizeFromPurchaseFormData = z.infer<
  typeof capitalizeFromPurchaseSchema
>;

interface CapitalizeFromPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CapitalizeFromPurchaseModal = ({
  onClose,
  onSuccess,
}: CapitalizeFromPurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CapitalizeFromPurchaseFormData>({
    resolver: zodResolver(capitalizeFromPurchaseSchema),
    defaultValues: {
      assets: [
        {
          name: "",
          categoryId: "",
          acquisitionCost: 0,
          serialNumber: "",
          locationId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "assets",
  });

  const selectedPurchaseId = watch("purchaseOrderId");
  const acquisitionCostSum = watch("assets").reduce(
    (sum, asset) => sum + (asset.acquisitionCost || 0),
    0,
  );

  console.log("Acquisition Cost Sum:", acquisitionCostSum);

  const { data: purchaseOrders } = useQuery({
    queryKey: ["purchase-orders-for-capitalization"],
    queryFn: () => assetsApi.getPurchaseOrdersForCapitalization(),
  });

  const { data: categories } = useQuery({
    queryKey: ["asset-categories-for-capitalize"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-capitalize"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  const selectedPurchase = purchaseOrders?.purchases?.find(
    (po: any) => po.id === selectedPurchaseId,
  );
  //console.log("Selected Purchase:", selectedPurchase);

  const onSubmit = async (data: CapitalizeFromPurchaseFormData) => {
    try {
      await assetsApi.capitalizeFromPurchase(data);
      toast.success("Assets capitalized successfully");
      onSuccess();
    } catch (error) {
      console.error("Capitalize from purchase error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-white text-lg font-semibold">
            Capitalize Assets from Purchase Order
          </h3>

          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Purchase Order Select */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Purchase Order *
              </label>

              <select
                {...register("purchaseOrderId")}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option value="">Select purchase order</option>
                {purchaseOrders?.purchases?.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNo} - {po.vendor.name} (₦
                    {po.totalAmount.toLocaleString()})
                  </option>
                ))}
              </select>

              {errors.purchaseOrderId && (
                <p className="text-red-500 text-sm">
                  {errors.purchaseOrderId.message}
                </p>
              )}
            </div>

            {/* Purchase Preview */}
            {selectedPurchase && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-blue-900">
                  Purchase Order Details
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700">Vendor</p>
                    <p className="font-medium">
                      {selectedPurchase.vendor.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700">Total</p>
                    <p className="font-medium">
                      ₦{selectedPurchase.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700">Date</p>
                    <p className="font-medium">
                      {new Date(
                        selectedPurchase.orderDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-blue-700">Status</p>
                    <p className="font-medium">{selectedPurchase.status}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assets Section */}
            <div>
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">
                  Assets to Capitalize
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    append({
                      name: "",
                      categoryId: "",
                      acquisitionCost: 0,
                      serialNumber: "",
                      locationId: "",
                    })
                  }
                  className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Asset
                </button>
              </div>

              {/* Lines */}
              <div className="space-y-4 mt-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-gray-50 border rounded-lg p-4"
                  >
                    {/* Top Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Asset Name *
                        </label>
                        <input
                          {...register(`assets.${index}.name`)}
                          className="mt-1 w-full border rounded-md px-3 py-2"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Category *
                        </label>
                        <select
                          {...register(`assets.${index}.categoryId`)}
                          className="mt-1 w-full border rounded-md px-3 py-2"
                        >
                          <option value="">Select</option>
                          {categories?.categories?.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} - {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cost + Remove */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">
                            Cost *
                          </label>
                          <input
                            {...register(`assets.${index}.acquisitionCost`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <input
                        {...register(`assets.${index}.serialNumber`)}
                        placeholder="Serial Number"
                        className="border rounded-md px-3 py-2"
                      />

                      <select
                        {...register(`assets.${index}.locationId`)}
                        className="border rounded-md px-3 py-2"
                      >
                        <option value="">Select Location</option>
                        {locations?.locations?.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code} - {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedPurchaseId ||
                  acquisitionCostSum !== Number(selectedPurchase?.totalAmount)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Capitalizing..." : "Capitalize Assets"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CapitalizeFromPurchaseModal;
