import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, DollarSign, Package } from "lucide-react";
import { productionApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const addOverheadSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

type AddOverheadFormData = z.infer<typeof addOverheadSchema>;

interface AddOverheadModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const AddOverheadModal = ({
  order,
  onClose,
  onSuccess,
}: AddOverheadModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddOverheadFormData>({
    resolver: zodResolver(addOverheadSchema),
  });

  const onSubmit = async (data: AddOverheadFormData) => {
    try {
      await productionApi.addOverhead(order.id, data);
      toast.success("Overhead cost added successfully");
      onSuccess();
    } catch (error) {
      console.error("Add overhead error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md">
                  <DollarSign className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Add Overhead Cost
                  </h3>
                  <p className="text-sm text-gray-500">
                    Production Order: {order.orderNo}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[80vh] overflow-y-auto px-6 py-6 space-y-6"
          >
            {/* Order Summary Card */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900">
                    {order.item.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Target Production:{" "}
                    <span className="font-medium">{order.qtyTarget} units</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Overhead Amount */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Overhead Amount (₦) *
              </label>

              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">₦</span>
                <input
                  {...register("amount", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  className="w-full rounded-xl border border-gray-200 pl-8 pr-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>

              {errors.amount && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Note
              </label>

              <textarea
                {...register("note")}
                rows={4}
                placeholder="e.g. Electricity, generator fuel, rent allocation, equipment depreciation..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none"
              />

              <p className="mt-2 text-xs text-gray-500">
                Add details to help track what this overhead cost covers.
              </p>
            </div>

            {/* Cost Preview */}
            {watch("amount") > 0 && (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Total Overhead
                  </span>

                  <span className="text-2xl font-bold text-green-600">
                    ₦{Number(watch("amount")).toLocaleString()}
                  </span>
                </div>

                <p className="mt-2 text-xs text-green-700">
                  This cost will be added to total production cost calculation.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Overhead Cost"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddOverheadModal;
