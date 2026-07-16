import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, inventoryApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  glAssetAccountId: z.string().cuid("Asset account is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  acquisitionDate: z.string().min(1, "Acquisition date is required"),
  acquisitionCost: z.number().positive("Acquisition cost must be positive"),
  residualValue: z.number().min(0).optional(),
  usefulLife: z.number().int().positive().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]).optional(),
  locationId: z.string().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
});

type CreateAssetFormData = z.infer<typeof createAssetSchema>;

interface CreateAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssetModal = ({ onClose, onSuccess }: CreateAssetModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssetFormData>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      acquisitionDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedCategoryId = watch("categoryId");

  const { data: categories } = useQuery({
    queryKey: ["asset-categories-for-create"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-asset"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  //chart accounts query can be added here when implementing the ChartAccountSelect component
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-asset"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const selectedCategory = categories?.categories?.find(
    (cat: any) => cat.id === selectedCategoryId,
  );

  const onSubmit = async (data: CreateAssetFormData) => {
    try {
      await assetsApi.createAsset(data);
      toast.success("Asset created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create asset error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-10 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header (Gradient) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Add New Asset</h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Asset Name + Category */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Name *
                  </label>
                  <input
                    {...register("name")}
                    placeholder="e.g., Manufacturing Machine #1"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Category *
                  </label>
                  <select
                    {...register("categoryId")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories?.categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.code} - {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.categoryId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* GL Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset GL Account *
                </label>
                <ChartAccountSelect
                  accounts={chartAccounts?.accounts || []}
                  value={watch("glAssetAccountId")}
                  onChange={(value) => setValue("glAssetAccountId", value)}
                />
                {errors.glAssetAccountId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.glAssetAccountId.message}
                  </p>
                )}
              </div>

              {/* Acquisition + Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Acquisition Date *
                  </label>
                  <input
                    type="date"
                    {...register("acquisitionDate")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.acquisitionDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.acquisitionDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Acquisition Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("acquisitionCost", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {errors.acquisitionCost && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.acquisitionCost.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Location + Serial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <select
                    {...register("locationId")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select location</option>
                    {locations?.locations?.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Serial Number
                  </label>
                  <input
                    {...register("serialNumber")}
                    placeholder="Asset serial number"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier
                </label>
                <input
                  {...register("supplier")}
                  placeholder="Supplier name"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Info */}
              {selectedCategory && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                  <p className="font-semibold mb-1">Category Defaults</p>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Depreciation: {selectedCategory.depreciationMethod}</li>
                    <li>Useful Life: {selectedCategory.usefulLife} years</li>
                    <li>Residual Value: {selectedCategory.residualValue}%</li>
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssetModal;
