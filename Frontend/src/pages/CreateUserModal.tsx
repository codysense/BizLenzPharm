import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Eye, EyeOff } from "lucide-react";
import { userApi } from "../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../lib/api";

const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    roleId: z.string().min(1, "Please select a role"),
    warehouseId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface CreateUserModalProps {
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserModal = ({
  roles,
  onClose,
  onSuccess,
}: CreateUserModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-user"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const watchedRoleId = watch("roleId");

  // Check if selected role is POS User
  const isPosUser = roles
    .find((role) => role.id === watchedRoleId)
    ?.name.includes("POS ");

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await userApi.createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        roleId: data.roleId,
        warehouseId: data.warehouseId,
      });
      toast.success("User created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create user error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-white text-lg font-semibold">Create New User</h3>

          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* POS Warehouse (only if POS user) */}
            {isPosUser && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700">
                  Assigned Warehouse *
                </label>

                <select
                  {...register("warehouseId")}
                  className="mt-1 w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select warehouse</option>
                  {warehouses?.warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>

                {errors.warehouseId && (
                  <p className="text-red-500 text-sm">
                    {errors.warehouseId.message}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  POS users are restricted to assigned warehouse
                </p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                {...register("name")}
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                {...register("email")}
                type="email"
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="Enter email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Role *
              </label>
              <select
                {...register("roleId")}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.description && `- ${r.description}`}
                  </option>
                ))}
              </select>

              {errors.roleId && (
                <p className="text-red-500 text-sm">{errors.roleId.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Password *
              </label>

              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="mt-1 w-full border rounded-md px-3 py-2 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Confirm Password *
              </label>

              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="mt-1 w-full border rounded-md px-3 py-2 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-800">
              User will receive login credentials and can change password after
              first login.
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
