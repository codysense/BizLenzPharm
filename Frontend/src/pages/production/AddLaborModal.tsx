import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Clock } from "lucide-react";
import { productionApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const addLaborSchema = z.object({
  hours: z.number().positive("Hours must be positive"),
  rate: z.number().positive("Rate must be positive"),
  employeeName: z.string().optional(),
});

type AddLaborFormData = z.infer<typeof addLaborSchema>;

interface AddLaborModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const AddLaborModal = ({ order, onClose, onSuccess }: AddLaborModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddLaborFormData>({
    resolver: zodResolver(addLaborSchema),
  });

  const watchedHours = watch("hours") || 0;
  const watchedRate = watch("rate") || 0;
  const totalAmount = watchedHours * watchedRate;

  const onSubmit = async (data: AddLaborFormData) => {
    try {
      await productionApi.addLabor(order.id, data);
      toast.success("Labor cost added successfully");
      onSuccess();
    } catch (error) {
      console.error("Add labor error:", error);
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
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Add Labor Cost
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Order: {order.orderNo}
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

          {/* Form Content */}
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Order Info */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      {order.item.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Target Production: {order.qtyTarget} units
                    </p>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Worked *
                  </label>
                  <input
                    {...register("hours", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="8.00"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.hours && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.hours.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (₦) *
                  </label>
                  <input
                    {...register("rate", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="500.00"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.rate && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.rate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Name
                </label>
                <input
                  {...register("employeeName")}
                  placeholder="Employee name (optional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Total Cost */}
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Calculated Labor Cost
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on hours × hourly rate
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ₦{totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
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
                  className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium 
                hover:bg-green-700 shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Labor Cost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLaborModal;
