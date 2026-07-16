import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";
import { Warehouse } from "../../types/api";
import toast from "react-hot-toast";

const editWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationId: z.string().min(1, "Location is required"),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type EditWarehouseFormData = z.infer<typeof editWarehouseSchema>;

interface EditWarehouseModalProps {
  warehouse: Warehouse;
  onClose: () => void;
  onSuccess: () => void;
}

const EditWarehouseModal = ({
  warehouse,
  onClose,
  onSuccess,
}: EditWarehouseModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditWarehouseFormData>({
    resolver: zodResolver(editWarehouseSchema),
    defaultValues: {
      name: warehouse.name,
      locationId: warehouse.locationId,
      address: warehouse.address || "",
      isActive: warehouse.isActive,
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["locations-for-warehouse-edit"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  // Reset form when warehouse changes
  useEffect(() => {
    reset({
      name: warehouse.name,
      locationId: warehouse.locationId,
      address: warehouse.address || "",
      isActive: warehouse.isActive,
    });
  }, [warehouse, reset]);

  const onSubmit = async (data: EditWarehouseFormData) => {
    try {
      await inventoryApi.updateWarehouse(warehouse.id, data);
      toast.success("Warehouse updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit warehouse error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-10 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Warehouse
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {warehouse.code} — {warehouse.name}
                </p>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-5 space-y-5 bg-white">
            {/* Code locked */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Warehouse Code:</span>{" "}
                {warehouse.code}{" "}
                <span className="text-blue-600">(cannot be changed)</span>
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Location
              </label>
              <select
                {...register("locationId")}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="">Select location</option>
                {locations?.locations?.map((location: any) => (
                  <option key={location.id} value={location.id}>
                    {location.code} - {location.name}
                  </option>
                ))}
              </select>
              {errors.locationId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.locationId.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Warehouse Name
              </label>
              <input
                {...register("name")}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter warehouse name"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                {...register("address")}
                rows={3}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Warehouse address"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-3 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Active Warehouse
                </p>
                <p className="text-xs text-gray-500">
                  Enable or disable warehouse operations
                </p>
              </div>

              <input
                {...register("isActive")}
                type="checkbox"
                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>

            {/* Change summary */}
            {isDirty && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Change Impact Preview
                </p>
                <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                  <li>Warehouse details will be updated</li>
                  <li>Inventory operations remain intact</li>
                  <li>Location changes affect stock flow</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium
                hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2 transition"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditWarehouseModal;
