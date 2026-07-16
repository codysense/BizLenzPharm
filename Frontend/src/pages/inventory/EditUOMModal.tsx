import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { uomApi } from "../../lib/api";
// import { updateUOMSchema } from "../../schemas/uom.schema";

const updateUOMSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less")
    .optional(),
  name: z.string().min(1, "Name is required").optional(),
});

type UpdateUOMFormData = z.infer<typeof updateUOMSchema>;

interface EditUOMModalProps {
  uom: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUOMModal = ({ uom, onClose, onSuccess }: EditUOMModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUOMFormData>({
    resolver: zodResolver(updateUOMSchema),
    defaultValues: {
      code: uom.code,
      name: uom.name,
    },
  });

  const onSubmit = async (data: UpdateUOMFormData) => {
    try {
      await uomApi.updateUOM(uom.id, data);
      toast.success("UOM updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update UOM error:", error);
      toast.error("Failed to update UOM");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL CONTAINER */}
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit UOM</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update unit of measurement details
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* INFO CARD */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-sm text-blue-800">
                Update unit definition used across inventory, pricing, and BOMs.
              </p>
            </div>

            {/* FORM FIELDS */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                UOM Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CODE */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Code *
                  </label>
                  <input
                    {...register("code")}
                    placeholder="e.g., KG"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errors.code && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                {/* NAME */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    {...register("name")}
                    placeholder="Kilogram"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* IMPACT NOTE */}
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                System Impact
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Affects inventory item measurement consistency</li>
                <li>• Used in BOM calculations and production planning</li>
                <li>• Changes reflect across all linked modules</li>
              </ul>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUOMModal;
