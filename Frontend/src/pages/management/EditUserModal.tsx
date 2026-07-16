import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Eye, EyeOff } from "lucide-react";
import { userApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";

const editUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    roleId: z.string().min(1, "Please select a role"),
    warehouseId: z.string().optional(),
    password: z.string().min(6).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type EditUserFormData = z.infer<typeof editUserSchema>;

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    warehouseId?: string | null;
  };
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal = ({
  user,
  roles,
  onClose,
  onSuccess,
}: EditUserModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      warehouseId: user.warehouseId ?? "",
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-user"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedRoleId = watch("roleId");
  const selectedRole = roles.find((r) => r.id === watchedRoleId)?.name || "";

  //  Warehouse visibility rules
  const isPosUser = selectedRole.includes("POS");
  const hideWarehouse =
    selectedRole.includes("Accountant") ||
    selectedRole.includes("General Manager");

  const showWarehouse = isPosUser && !hideWarehouse;

  const onSubmit = async (data: EditUserFormData) => {
    try {
      await userApi.updateUser(user.id, {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        warehouseId: showWarehouse ? data.warehouseId : null,
        ...(data.password && { password: data.password }),
      });

      toast.success("User updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update user error:", error);
      toast.error("Failed to update user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Wrapper */}
      <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold">Edit User</h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>

                <input
                  {...register("name")}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.name.message}
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
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Role
                </label>

                <select
                  {...register("roleId")}
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select role</option>

                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse */}
              {showWarehouse && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Assigned Warehouse
                  </label>

                  <select
                    {...register("warehouseId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select warehouse</option>

                    {warehouses?.warehouses?.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  New Password (optional)
                </label>

                <div className="relative mt-1">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>

                <div className="relative mt-1">
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl sticky bottom-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
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

export default EditUserModal;
