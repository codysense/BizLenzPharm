import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Calculator, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";

const runDepreciationSchema = z.object({
  periodYear: z.number().int().min(2020).max(2050),
  periodMonth: z.number().int().min(1).max(12),
  assetIds: z.array(z.string()).optional(),
});

type RunDepreciationFormData = z.infer<typeof runDepreciationSchema>;

interface RunDepreciationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RunDepreciationModal = ({
  onClose,
  onSuccess,
}: RunDepreciationModalProps) => {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RunDepreciationFormData>({
    resolver: zodResolver(runDepreciationSchema),
    defaultValues: {
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
    },
  });

  const { data: assetsData } = useQuery({
    queryKey: ["active-assets-for-depreciation"],
    queryFn: () => assetsApi.getAssets({ status: "ACTIVE", limit: 100 }),
  });

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId],
    );
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === assetsData?.assets?.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(
        assetsData?.assets?.map((asset: any) => asset.id) || [],
      );
    }
  };

  const onSubmit = async (data: RunDepreciationFormData) => {
    try {
      const submitData = {
        ...data,
        assetIds: selectedAssets.length > 0 ? selectedAssets : undefined,
      };

      const result = await assetsApi.runDepreciation(submitData);
      toast.success(
        `Depreciation calculated for ${result.processedAssets} assets. Total: ₦${result.totalDepreciation.toLocaleString()}`,
      );
      onSuccess();
    } catch (error) {
      console.error("Run depreciation error:", error);
    }
  };

  const watchedYear = watch("periodYear");
  const watchedMonth = watch("periodMonth");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-10 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Run Monthly Depreciation
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Process depreciation for selected period and assets
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
          <div className="bg-white px-6 py-5 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Period Selection */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                <div className="flex items-center mb-4">
                  <Calculator className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-sm font-semibold text-blue-900">
                    Depreciation Period
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Year *
                    </label>
                    <input
                      {...register("periodYear", { valueAsNumber: true })}
                      type="number"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.periodYear && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.periodYear.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Month *
                    </label>
                    <select
                      {...register("periodMonth", { valueAsNumber: true })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleString("default", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                    {errors.periodMonth && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.periodMonth.message}
                      </p>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm text-blue-800">
                  Running depreciation for:{" "}
                  <span className="font-semibold">
                    {new Date(watchedYear, watchedMonth - 1, 1).toLocaleString(
                      "default",
                      { month: "long", year: "numeric" },
                    )}
                  </span>
                </p>
              </div>

              {/* Asset Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Select Assets (Optional)
                  </h4>

                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedAssets.length === assetsData?.assets?.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    Leave empty to process all active assets. Selecting assets
                    will limit depreciation only to those.
                  </p>
                </div>

                {/* Table */}
                <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              selectedAssets.length ===
                                assetsData?.assets?.length &&
                              assetsData?.assets?.length > 0
                            }
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-blue-600"
                          />
                        </th>
                        <th className="p-3 text-left">Asset</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Cost</th>
                        <th className="p-3 text-left">Method</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                      {assetsData?.assets?.map((asset: any) => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedAssets.includes(asset.id)}
                              onChange={() => handleAssetToggle(asset.id)}
                              className="h-4 w-4 text-blue-600"
                            />
                          </td>

                          <td className="p-3">
                            <div className="font-medium text-gray-900">
                              {asset.assetNo}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {asset.name}
                            </div>
                          </td>

                          <td className="p-3 text-gray-700">
                            {asset.category?.name}
                          </td>

                          <td className="p-3 text-gray-700">
                            ₦{asset.acquisitionCost.toLocaleString()}
                          </td>

                          <td className="p-3">
                            <StatusBadge
                              status={asset.depreciationMethod.replace(
                                "_",
                                " ",
                              )}
                              variant="info"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  {selectedAssets.length > 0
                    ? `${selectedAssets.length} assets selected`
                    : "All active assets will be processed"}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white
                bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600
                shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Processing..." : "Run Depreciation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunDepreciationModal;
