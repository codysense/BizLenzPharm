import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";

const createLocationSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("Nigeria"),
});

type CreateLocationFormData = z.infer<typeof createLocationSchema>;

interface CreateLocationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLocationModal = ({
  onClose,
  onSuccess,
}: CreateLocationModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLocationFormData>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      country: "Nigeria",
    },
  });

  const onSubmit = async (data: CreateLocationFormData) => {
    try {
      await inventoryApi.createLocation(data);
      toast.success("Location created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create location error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL */}
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Create New Location
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Add a new operational branch or warehouse location
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* BASIC INFO */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Location Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* CODE */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Code *
                  </label>
                  <input
                    {...register("code")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. LAG"
                  />
                  {errors.code && (
                    <p className="text-sm text-red-500 mt-1">
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
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Location name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ADDRESS SECTION */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Address Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* CITY */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    {...register("city")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Lagos"
                  />
                </div>

                {/* STATE */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    State
                  </label>
                  <select
                    {...register("state")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select state</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Federal Capital Territory</option>
                    <option value="Kano">Kano</option>
                    <option value="Rivers">Rivers</option>
                    <option value="Oyo">Oyo</option>
                    <option value="Ogun">Ogun</option>
                  </select>
                </div>
              </div>

              {/* COUNTRY */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  {...register("country")}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nigeria"
                />
              </div>

              {/* ADDRESS */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Full Address
                </label>
                <textarea
                  {...register("address")}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter full location address"
                />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 transition"
              >
                {isSubmitting ? "Creating..." : "Create Location"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateLocationModal;
