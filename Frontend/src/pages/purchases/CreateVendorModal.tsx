import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { purchaseApi } from "../../lib/api";
import toast from "react-hot-toast";

const createVendorSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  paymentTerms: z.string().optional(),
});

type CreateVendorFormData = z.infer<typeof createVendorSchema>;

interface CreateVendorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVendorModal = ({ onClose, onSuccess }: CreateVendorModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateVendorFormData>({
    resolver: zodResolver(createVendorSchema),
  });

  const onSubmit = async (data: CreateVendorFormData) => {
    try {
      await purchaseApi.createVendor({ ...data, mode: "create" });
      toast.success("Vendor created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create vendor error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Create New Vendor
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  Add supplier details for procurement and purchasing
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor Code *
                </label>
                <input
                  {...register("code")}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="VEN001"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Enter vendor name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Card */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Contact Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-gray-700">Phone</label>
                  <input
                    {...register("phone")}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="+234..."
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="vendor@email.com"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm text-gray-700">Address</label>
                <textarea
                  {...register("address")}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Vendor address..."
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Payment Terms
              </label>
              <select
                {...register("paymentTerms")}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="">Select payment terms</option>
                <option value="Net 7">Net 7 days</option>
                <option value="Net 15">Net 15 days</option>
                <option value="Net 30">Net 30 days</option>
                <option value="Net 60">Net 60 days</option>
                <option value="COD">Cash on Delivery</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Vendor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorModal;
