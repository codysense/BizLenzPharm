import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, TrendingDown } from "lucide-react";
import { assetsApi } from "../../lib/api";
import { Asset } from "../../types/api";
import toast from "react-hot-toast";

const disposeAssetSchema = z.object({
  disposalDate: z.string().min(1, "Disposal date is required"),
  disposalAmount: z.number().min(0, "Disposal amount cannot be negative"),
  disposalMethod: z.enum(["SALE", "SCRAP", "DONATION", "WRITE_OFF"]),
  buyerDetails: z.string().optional(),
  notes: z.string().optional(),
});

type DisposeAssetFormData = z.infer<typeof disposeAssetSchema>;

interface DisposeAssetModalProps {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}

const DisposeAssetModal = ({
  asset,
  onClose,
  onSuccess,
}: DisposeAssetModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DisposeAssetFormData>({
    resolver: zodResolver(disposeAssetSchema),
    defaultValues: {
      disposalDate: new Date().toISOString().split("T")[0],
      disposalAmount: 0,
      disposalMethod: "SALE",
    },
  });

  const watchedMethod = watch("disposalMethod");
  const watchedAmount = watch("disposalAmount") || 0;

  const netBookValue = asset.netBookValue || asset.acquisitionCost;
  const gainLoss = watchedAmount - netBookValue;

  const onSubmit = async (data: DisposeAssetFormData) => {
    try {
      await assetsApi.disposeAsset(asset.id, data);
      toast.success("Asset disposed successfully");
      onSuccess();
    } catch (error) {
      console.error("Dispose asset error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Wrapper */}
      <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold">
              Dispose Asset
              <span className="ml-2 text-blue-100 font-normal text-sm">
                ({asset.assetNo})
              </span>
            </h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Asset Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-blue-600 mt-1" />

                  <div>
                    <div className="font-semibold text-gray-900">
                      {asset.name}
                    </div>

                    <div className="text-sm text-gray-600 mt-1">
                      Cost: ₦{asset.acquisitionCost.toLocaleString()} • Net Book
                      Value:{" "}
                      <span className="font-medium text-gray-900">
                        ₦{netBookValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disposal Date + Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Disposal Date *
                  </label>

                  <input
                    {...register("disposalDate")}
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {errors.disposalDate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.disposalDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Method *
                  </label>

                  <select
                    {...register("disposalMethod")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SALE">Sale</option>
                    <option value="SCRAP">Scrap</option>
                    <option value="DONATION">Donation</option>
                    <option value="WRITE_OFF">Write Off</option>
                  </select>
                </div>
              </div>

              {/* Disposal Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Disposal Amount *
                </label>

                <input
                  {...register("disposalAmount", {
                    valueAsNumber: true,
                  })}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Buyer Details */}
              {watchedMethod === "SALE" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Buyer Details
                  </label>

                  <textarea
                    {...register("buyerDetails")}
                    rows={3}
                    placeholder="Buyer name & contact"
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Reason for disposal"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Gain/Loss Panel */}
              <div
                className={`rounded-xl p-5 border ${
                  gainLoss >= 0
                    ? "bg-green-50 border-green-100"
                    : "bg-red-50 border-red-100"
                }`}
              >
                <div
                  className={`text-sm font-semibold mb-2 ${
                    gainLoss >= 0 ? "text-green-800" : "text-red-800"
                  }`}
                >
                  Disposal Impact
                </div>

                <div
                  className={`text-sm space-y-1 ${
                    gainLoss >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  <div>Net Book Value: ₦{netBookValue.toLocaleString()}</div>

                  <div>Disposal Amount: ₦{watchedAmount.toLocaleString()}</div>

                  <div className="font-semibold">
                    {gainLoss >= 0 ? "Gain" : "Loss"}: ₦
                    {Math.abs(gainLoss).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl sticky bottom-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Disposing..." : "Dispose Asset"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisposeAssetModal;
