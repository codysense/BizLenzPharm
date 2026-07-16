import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, X } from "lucide-react";
import { purchaseApi } from "../../lib/api";
import toast from "react-hot-toast";
import { Vendor } from "../../types/api";

const createVendorSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  paymentTerms: z.string().optional(),
});

type EditVendorFormData = z.infer<typeof createVendorSchema>;

interface CreateVendorModalProps {
  vendor: Vendor;
  onClose: () => void;
  onSuccess: () => void;
}

const EditVendorModal = ({
  vendor,
  onClose,
  onSuccess,
}: CreateVendorModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditVendorFormData>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      code: vendor.code,
      name: vendor.name,
      address: vendor.address,
      phone: vendor.phone,
      email: vendor.email,
      paymentTerms: vendor.paymentTerms,
    },
  });

  const onSubmit = async (data: EditVendorFormData) => {
    try {
      await purchaseApi.createVendor({
        code: data.code,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        paymentTerms: data.paymentTerms,
        mode: "update",
      });

      toast.success("Vendor updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update vendor error:", error);
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
                  Edit Vendor
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Update vendor profile details
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

          {/* Body */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
          >
            {/* Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor Code
                </label>
                <input
                  {...register("code")}
                  disabled
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
                  placeholder="VEN001"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor Name *
                </label>
                <input
                  {...register("name")}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Vendor name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                {...register("address")}
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="Vendor address"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  {...register("phone")}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="+234 xxx xxx xxxx"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="vendor@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Payment Terms
              </label>
              <select
                {...register("paymentTerms")}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition"
              >
                <option value="">Select payment terms</option>
                <option value="Net 7">Net 7 days</option>
                <option value="Net 15">Net 15 days</option>
                <option value="Net 30">Net 30 days</option>
                <option value="Net 45">Net 45 days</option>
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
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Update Vendor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditVendorModal;
