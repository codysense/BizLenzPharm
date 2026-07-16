import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
// import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";

const createWarehouseSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  name: z.string().min(1, "Name is required"),
  locationId: z.string().min(1, "Location is required"),
  address: z.string().optional(),
});

type CreateWarehouseFormData = z.infer<typeof createWarehouseSchema>;

interface CreateWarehouseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateWarehouseModal = ({
  onClose,
  onSuccess,
}: CreateWarehouseModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateWarehouseFormData>({
    resolver: zodResolver(createWarehouseSchema),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-warehouse"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  const onSubmit = async (data: CreateWarehouseFormData) => {
    try {
      await inventoryApi.createWarehouse(data);
      toast.success("Warehouse created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create warehouse error:", error);
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
                Create New Warehouse
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Define storage location under a branch
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
            {/* LOCATION SECTION */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Parent Location
              </h4>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Location *
                </label>

                <select
                  {...register("locationId")}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select location</option>
                  {locations?.locations?.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.code} - {location.name} ({location.city},{" "}
                      {location.state})
                    </option>
                  ))}
                </select>

                {errors.locationId && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.locationId.message}
                  </p>
                )}
              </div>
            </div>

            {/* WAREHOUSE DETAILS */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Warehouse Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* CODE */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Code *
                  </label>

                  <input
                    {...register("code")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. WH001"
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
                    placeholder="Warehouse name"
                  />

                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ADDRESS */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Address
                </label>

                <textarea
                  {...register("address")}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Warehouse address"
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
                {isSubmitting ? "Creating..." : "Create Warehouse"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateWarehouseModal;
