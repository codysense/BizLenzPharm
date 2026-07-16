import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { salesApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

const createCustomerSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  //mode: z.enum(["create", "update"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  creditLimit: z.number().optional(),
  customerGroupId: z.string().min(1, "Customer Group Id is required"),
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

interface CreateCustomerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerModal = ({
  onClose,
  onSuccess,
}: CreateCustomerModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
  });

  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: () => salesApi.getCustomerGroups({ page: 1, limit: 100 }), // adjust limit as needed
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  const groups = groupsData?.groups || [];

  // console.log(groupsData)

  const onSubmit = async (data: CreateCustomerFormData) => {
    try {
      await salesApi.createCustomer({ ...data, mode: "create" });
      toast.success("Customer created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create customer error:", error);
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
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Premium Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Create New Customer
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  Add customer details for sales and receivables tracking
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

          {/* Scrollable Form Section */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[75vh] overflow-y-auto p-6 space-y-5"
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Code *
                </label>
                <input
                  {...register("code")}
                  placeholder="CUS001"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.code && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  {...register("name")}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                {...register("address")}
                rows={3}
                placeholder="Customer address"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
              focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="+234-XXX-XXX-XXXX"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="customer@email.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 
                focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Financial Info */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h4 className="font-semibold text-gray-900 mb-4">
                Financial Information
              </h4>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Limit
                  </label>
                  <input
                    {...register("creditLimit", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 
                  focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Group
                  </label>
                  <select
                    {...register("customerGroupId")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 
                  focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Customer Group</option>

                    {isGroupsLoading ? (
                      <option disabled>Loading...</option>
                    ) : (
                      groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
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
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 
              text-sm font-medium text-white shadow-lg hover:shadow-xl 
              hover:scale-[1.02] transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerModal;
