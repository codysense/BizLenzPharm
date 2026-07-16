import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";

/* ---------------- Schema ---------------- */

const editAssetCategorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "REDUCING_BALANCE"]),
  usefulLife: z.number().int().positive(),
  residualValue: z.number().min(0).max(100),
  glAssetAccountId: z.string().min(1),
  glDepreciationAccountId: z.string().min(1),
  glAccumulatedDepreciationAccountId: z.string().min(1),
});

type EditAssetCategoryFormData = z.infer<typeof editAssetCategorySchema>;

interface EditAssetCategoryModalProps {
  assetCategory: any;
  onClose: () => void;
  onSuccess: () => void;
}

/* ---------------- Component ---------------- */

const EditAssetCategoryModal = ({
  assetCategory,
  onClose,
  onSuccess,
}: EditAssetCategoryModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditAssetCategoryFormData>({
    resolver: zodResolver(editAssetCategorySchema),
  });

  /* -------- Prefill form -------- */
  useEffect(() => {
    if (assetCategory) {
      reset({
        code: assetCategory.code,
        name: assetCategory.name,
        description: assetCategory.description ?? "",
        depreciationMethod: assetCategory.depreciationMethod,
        usefulLife: assetCategory.usefulLife,
        residualValue: Number(assetCategory.residualValue),
        glAssetAccountId: assetCategory.glAssetAccountId,
        glDepreciationAccountId: assetCategory.glDepreciationAccountId,
        glAccumulatedDepreciationAccountId:
          assetCategory.glAccumulatedDepreciationAccountId,
      });
    }
  }, [assetCategory, reset]);

  /* -------- Chart of accounts -------- */
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-assets"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

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

  /* -------- Submit -------- */
  const onSubmit = async (data: EditAssetCategoryFormData) => {
    try {
      await assetsApi.updateAssetCategory(assetCategory.id, data);
      toast.success("Asset category updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to update asset category",
      );
      console.error("Update asset category error:", error);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Wrapper */}
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">
              Edit Asset Category
            </h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Code *</label>
                <input
                  {...register("code")}
                  disabled
                  className="input bg-gray-100 cursor-not-allowed"
                />
                {errors.code && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Name *</label>
                <input {...register("name")} className="input" />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-600">Description</label>
              <textarea
                {...register("description")}
                rows={3}
                className="input"
              />
            </div>

            {/* Depreciation Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600">Method *</label>
                <select {...register("depreciationMethod")} className="input">
                  <option value="STRAIGHT_LINE">Straight Line</option>
                  <option value="REDUCING_BALANCE">Reducing Balance</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Useful Life</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  {...register("usefulLife", { valueAsNumber: true })}
                  className="input"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Residual %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  {...register("residualValue", { valueAsNumber: true })}
                  className="input"
                />
              </div>
            </div>

            {/* GL Accounts Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                GL Account Mappings
              </h4>

              {/* Asset Account */}
              <div>
                <label className="text-sm text-gray-600">Asset Account *</label>
                <select {...register("glAssetAccountId")} className="input">
                  <option value="">Select account</option>
                  {assetAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                {errors.glAssetAccountId && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.glAssetAccountId.message}
                  </p>
                )}
              </div>

              {/* Depreciation Expense */}
              <div>
                <label className="text-sm text-gray-600">
                  Depreciation Expense *
                </label>
                <select
                  {...register("glDepreciationAccountId")}
                  className="input"
                >
                  <option value="">Select account</option>
                  {depreciationAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Accumulated Depreciation */}
              <div>
                <label className="text-sm text-gray-600">
                  Accumulated Depreciation *
                </label>
                <select
                  {...register("glAccumulatedDepreciationAccountId")}
                  className="input"
                >
                  <option value="">Select account</option>
                  {accumulatedDepreciationAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2">
                GL Account Setup
              </h4>

              <ul className="text-sm text-green-800 space-y-1">
                <li>• Asset Account → Asset value tracking</li>
                <li>• Depreciation Expense → Period expense</li>
                <li>• Accumulated Depreciation → Total depreciation</li>
              </ul>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Category"}
            </button>
          </div>
        </div>
      </div>

      {/* Shared input style */}
      <style jsx>{`
        .input {
          margin-top: 6px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
      `}</style>
    </div>
  );
};

export default EditAssetCategoryModal;
