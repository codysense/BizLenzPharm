import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { salesApi } from "../../lib/api";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerGroupModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  });

  const onSubmit = async (values: FormData) => {
    try {
      await salesApi.createCustomerGroup(values);
      toast.success("Customer group created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Failed to create group");
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Premium Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Create Customer Group
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Organize customers into categories for pricing & reporting
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
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 space-y-5 max-h-[85vh] overflow-y-auto"
          >
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Code
              </label>
              <input
                {...register("code")}
                placeholder="e.g. RETAIL001"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
              focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              outline-none transition"
              />
              {errors.code && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                {...register("name")}
                placeholder="Wholesale Customers"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
              focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              outline-none transition"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={4}
                placeholder="Add details about this customer group..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
              focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              outline-none transition"
              />
            </div>

            {/* Active Toggle */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Active Status</p>
                  <p className="text-sm text-gray-500">
                    Enable this group for customer assignment
                  </p>
                </div>

                <input
                  type="checkbox"
                  {...register("isActive")}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 
              text-sm font-medium text-white shadow-lg hover:shadow-xl 
              hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerGroupModal;
