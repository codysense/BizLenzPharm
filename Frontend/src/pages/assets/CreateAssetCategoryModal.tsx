import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";

const createAssetCategorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]),
  usefulLife: z.number().int().positive("Useful life must be positive"),
  residualValue: z
    .number()
    .min(0)
    .max(100, "Residual value must be between 0-100%"),
  glAssetAccountId: z.string().min(1, "Asset account is required"),
  glDepreciationAccountId: z
    .string()
    .min(1, "Depreciation account is required"),
  glAccumulatedDepreciationAccountId: z
    .string()
    .min(1, "Accumulated depreciation account is required"),
});

type CreateAssetCategoryFormData = z.infer<typeof createAssetCategorySchema>;

interface CreateAssetCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssetCategoryModal = ({
  onClose,
  onSuccess,
}: CreateAssetCategoryModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateAssetCategoryFormData>({
    resolver: zodResolver(createAssetCategorySchema),
    defaultValues: {
      depreciationMethod: "STRAIGHT_LINE",
      usefulLife: 5,
      residualValue: 10,
    },
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-assets"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const onSubmit = async (data: CreateAssetCategoryFormData) => {
    try {
      await assetsApi.createAssetCategory(data);
      toast.success("Asset category created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create asset category error:", error);
    }
  };

  // Filter accounts by type
  const assetAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === "NON_CURRENT_ASSETS" &&
        !acc.name.toLowerCase().includes("depreciation"),
    ) || [];

  const depreciationAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === "EXPENSES" &&
        acc.name.toLowerCase().includes("depreciation"),
    ) || [];

  const accumulatedDepreciationAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        acc.accountType === "NON_CURRENT_ASSETS" &&
        acc.name.toLowerCase().includes("accumulated"),
    ) || [];

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
          {/* Header (Premium Gradient) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Create Asset Category
            </h3>

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
              {/* Code + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Code *
                  </label>
                  <input
                    {...register("code")}
                    placeholder="e.g., PLANT"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    {...register("name")}
                    placeholder="e.g., Plant and Equipment"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Category description"
                />
              </div>

              {/* Depreciation Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Depreciation Method *
                  </label>
                  <select
                    {...register("depreciationMethod")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="STRAIGHT_LINE">Straight Line</option>
                    <option value="REDUCING_BALANCE">Reducing Balance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Useful Life (Years)
                  </label>
                  <input
                    type="number"
                    {...register("usefulLife", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Residual Value (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("residualValue", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* GL Accounts */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  GL Account Mappings
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asset Account *
                  </label>
                  <select
                    {...register("glAssetAccountId")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account</option>
                    {assetAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Depreciation Expense Account *
                  </label>
                  <select
                    {...register("glDepreciationAccountId")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account</option>
                    {depreciationAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Accumulated Depreciation Account *
                  </label>
                  <select
                    {...register("glAccumulatedDepreciationAccountId")}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account</option>
                    {accumulatedDepreciationAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                <p className="font-semibold mb-1">GL Setup Guide</p>
                <ul className="space-y-1 list-disc pl-5">
                  <li>Asset Account → Records asset acquisition cost</li>
                  <li>Depreciation Expense → Periodic expense recognition</li>
                  <li>
                    Accumulated Depreciation → Total depreciation over time
                  </li>
                </ul>
              </div>

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
                  {isSubmitting ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssetCategoryModal;
