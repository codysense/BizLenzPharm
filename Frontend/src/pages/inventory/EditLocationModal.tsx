import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Save } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { Location } from "../../types/api";
import toast from "react-hot-toast";

const editLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("Nigeria"),
  isActive: z.boolean().default(true),
});

type EditLocationFormData = z.infer<typeof editLocationSchema>;

interface EditLocationModalProps {
  location: Location;
  onClose: () => void;
  onSuccess: () => void;
}

const EditLocationModal = ({
  location,
  onClose,
  onSuccess,
}: EditLocationModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditLocationFormData>({
    resolver: zodResolver(editLocationSchema),
    defaultValues: {
      name: location.name,
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      country: location.country,
      isActive: location.isActive,
    },
  });

  // Reset form when location changes
  useEffect(() => {
    reset({
      name: location.name,
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      country: location.country,
      isActive: location.isActive,
    });
  }, [location, reset]);

  const onSubmit = async (data: EditLocationFormData) => {
    try {
      await inventoryApi.updateLocation(location.id, data);
      toast.success("Location updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit location error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Location</h3>
              <p className="text-sm text-gray-500 mt-1">
                {location.code} — {location.name}
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
                <span className="font-semibold">Location Code:</span>{" "}
                {location.code} (cannot be changed)
              </p>
            </div>

            {/* BASIC INFO */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Location Details
              </h4>

              {/* NAME */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Location name"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* CITY / STATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    {...register("city")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Lagos"
                  />
                </div>

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
                    <option value="Oyo">Oyo</option>
                    <option value="Abuja">FCT</option>
                    <option value="Kano">Kano</option>
                    <option value="Rivers">Rivers</option>
                    <option value="Edo">Edo</option>
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
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nigeria"
                />
              </div>

              {/* ADDRESS */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  {...register("address")}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Full address"
                />
              </div>

              {/* ACTIVE TOGGLE */}
              <div className="flex items-center gap-2">
                <input
                  {...register("isActive")}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">Active Location</label>
              </div>
            </div>

            {/* CHANGE WARNING */}
            {isDirty && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  Change Impact Summary
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Location details will be updated across the system</li>
                  <li>• Linked warehouses will reflect new information</li>
                  <li>• Status changes affect inventory operations</li>
                </ul>
              </div>
            )}

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
                disabled={isSubmitting || !isDirty}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4 inline mr-2" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLocationModal;
