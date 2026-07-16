import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, inventoryApi } from "../../lib/api";
import { Asset } from "../../types/api";
import toast from "react-hot-toast";

const updateAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  locationId: z.string().optional(),
  serialNumber: z.string().optional(),
  supplier: z.string().optional(),
});

type UpdateAssetFormData = z.infer<typeof updateAssetSchema>;

interface EditAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAssetModal = ({ asset, onClose, onSuccess }: EditAssetModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateAssetFormData>({
    resolver: zodResolver(updateAssetSchema),
    defaultValues: {
      name: asset.name,
      description: asset.description || "",
      categoryId: asset.categoryId,
      locationId: asset.locationId || "",
      serialNumber: asset.serialNumber || "",
      supplier: asset.supplier || "",
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["asset-categories-for-edit"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-edit-asset"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  useEffect(() => {
    reset({
      name: asset.name,
      description: asset.description || "",
      categoryId: asset.categoryId,
      locationId: asset.locationId || "",
      serialNumber: asset.serialNumber || "",
      supplier: asset.supplier || "",
    });
  }, [asset, reset]);

  const onSubmit = async (data: UpdateAssetFormData) => {
    try {
      await assetsApi.updateAsset(asset.id, data);
      toast.success("Asset updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update asset error:", error);
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
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Edit Asset</h3>
                <p className="text-sm text-blue-100 mt-1">
                  {asset.assetNo} • {asset.name}
                </p>
              </div>

              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-5 space-y-5">
            {/* Asset No (locked info) */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Asset No:</span> {asset.assetNo}{" "}
                (read-only)
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Asset Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Category *
                </label>
                <select
                  {...register("categoryId")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {categories?.categories?.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.code} - {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.categoryId.message}
                  </p>
                )}
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
                    {locations?.locations?.map((location: any) => (
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Financial Info */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Financial Details (Read-only)
                </h4>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    • Acquisition Cost: ₦
                    {asset.acquisitionCost.toLocaleString()}
                  </p>
                  <p>
                    • Acquisition Date:{" "}
                    {new Date(asset.acquisitionDate).toLocaleDateString()}
                  </p>
                  <p>
                    • Depreciation Method:{" "}
                    {asset.depreciationMethod.replace("_", " ")}
                  </p>
                  <p>• Useful Life: {asset.usefulLife} years</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !isDirty}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white
                bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600
                shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;
