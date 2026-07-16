import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Package } from "lucide-react";
import { productionApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const receiveFinishedGoodsSchema = z.object({
  qtyGood: z.number().positive("Good quantity must be positive"),
  qtyScrap: z.number().min(0, "Scrap quantity cannot be negative").default(0),
});

type ReceiveFinishedGoodsFormData = z.infer<typeof receiveFinishedGoodsSchema>;

interface ReceiveFinishedGoodsModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const MetricRow = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`text-sm font-medium ${color}`}>{value}</span>
  </div>
);

const ReceiveFinishedGoodsModal = ({
  order,
  onClose,
  onSuccess,
}: ReceiveFinishedGoodsModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReceiveFinishedGoodsFormData>({
    resolver: zodResolver(receiveFinishedGoodsSchema),
    defaultValues: {
      qtyGood: Number(order.qtyTarget) - Number(order.qtyProduced),
      qtyScrap: 0,
    },
  });

  const watchedGood = watch("qtyGood") || 0;
  const watchedScrap = watch("qtyScrap") || 0;
  const totalProduced = watchedGood + watchedScrap;
  const remainingQty = Number(order.qtyTarget) - Number(order.qtyProduced);

  const onSubmit = async (data: ReceiveFinishedGoodsFormData) => {
    try {
      await productionApi.receiveFinishedGoods(order.id, data);
      toast.success("Finished goods received successfully");
      onSuccess();
    } catch (error) {
      console.error("Receive finished goods error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Premium Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Premium Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Receive Finished Goods
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Order: {order.orderNo}
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto p-6 space-y-6"
          >
            {/* Order Summary Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-blue-600 text-white">
                  <Package className="h-5 w-5" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {order.item.name}
                  </h4>
                  <p className="text-sm text-gray-500">Production Summary</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500">Target</p>
                  <p className="text-lg font-bold text-gray-900">
                    {order.qtyTarget}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500">Produced</p>
                  <p className="text-lg font-bold text-green-600">
                    {order.qtyProduced}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className="text-lg font-bold text-orange-600">
                    {remainingQty}
                  </p>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Good Quantity *
                </label>
                <input
                  {...register("qtyGood", { valueAsNumber: true })}
                  type="number"
                  step="0.001"
                  max={remainingQty}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="100.00"
                />
                {errors.qtyGood && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.qtyGood.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scrap Quantity
                </label>
                <input
                  {...register("qtyScrap", { valueAsNumber: true })}
                  type="number"
                  step="0.001"
                  min="0"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  placeholder="0.00"
                />
                {errors.qtyScrap && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.qtyScrap.message}
                  </p>
                )}
              </div>
            </div>

            {/* Production Metrics */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Production Metrics
                </h4>

                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                  {totalProduced > 0
                    ? ((watchedGood / totalProduced) * 100).toFixed(1)
                    : 0}
                  % Yield
                </span>
              </div>

              <div className="space-y-3">
                <MetricRow
                  label="Good Units"
                  value={watchedGood}
                  color="text-green-600"
                />

                <MetricRow
                  label="Scrap Units"
                  value={watchedScrap}
                  color="text-red-500"
                />

                <MetricRow
                  label="Total Produced"
                  value={totalProduced}
                  color="text-blue-600"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Receiving..." : "Receive Finished Goods"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReceiveFinishedGoodsModal;
