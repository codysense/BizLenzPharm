import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Plus, Edit, Trash2, X, Save, Users } from "lucide-react";
import { managementApi } from "../../lib/api";
import { RoleWithPermissions, Permission } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import EditUserRolesModal from "./EditUserRolesModal";

const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

const RoleManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(
    null,
  );
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ["roles-with-permissions"],
    queryFn: () => managementApi.getRolesWithPermissions(),
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: () => managementApi.getAllPermissions(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: CreateRoleFormData) => managementApi.createRole(data),
    onSuccess: () => {
      toast.success("Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      setShowCreateModal(false);
      reset();
    },
    onError: (error) => {
      console.error("Create role error:", error);
      toast.error("Failed to create role");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRoleFormData }) =>
      managementApi.updateRole(id, data),
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      setEditingRole(null);
      reset();
    },
    onError: (error) => {
      console.error("Update role error:", error);
      toast.error("Failed to update role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => managementApi.deleteRole(id),
    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
    },
    onError: (error) => {
      console.error("Delete role error:", error);
      toast.error("Failed to delete role");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
  });

  const columns = [
    {
      key: "name",
      header: "Role Name",
      width: "w-48",
    },
    {
      key: "description",
      header: "Description",
      cell: (role: RoleWithPermissions) => role.description || "-",
      width: "w-64",
    },
    {
      key: "rolePermissions",
      header: "Permissions",
      cell: (role: RoleWithPermissions) => (
        <div className="space-y-1 max-w-sm">
          {role.rolePermissions.slice(0, 3).map((rp, index) => (
            <div
              key={index}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
            >
              {rp.permission.name}
            </div>
          ))}
          {role.rolePermissions.length > 3 && (
            <div className="text-xs text-gray-500 italic">
              +{role.rolePermissions.length - 3} more
            </div>
          )}
        </div>
      ),
      width: "w-80",
    },
    {
      key: "_count.userRoles",
      header: "Users",
      cell: (role: RoleWithPermissions) => (
        <div className="flex items-center">
          <Users className="h-4 w-4 text-gray-400 mr-1" />
          <span>{role._count.userRoles}</span>
        </div>
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (role: RoleWithPermissions) =>
        new Date(role.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleEditRole = (role: RoleWithPermissions) => {
    setEditingRole(role);
    const rolePermissionIds = role.rolePermissions.map(
      (rp) => rp.permission.id,
    );
    setSelectedPermissions(rolePermissionIds);
    reset({
      name: role.name,
      description: role.description || "",
      permissions: rolePermissionIds,
    });
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const onSubmit = (data: CreateRoleFormData) => {
    const submitData = {
      ...data,
      permissions: selectedPermissions,
    };

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: submitData });
    } else {
      createRoleMutation.mutate(submitData);
    }
  };

  const actions = (role: RoleWithPermissions) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handleEditRole(role)}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Role"
      >
        <Edit className="h-4 w-4" />
      </button>
      {role._count.userRoles === 0 && (
        <button
          onClick={() => {
            if (confirm("Are you sure you want to delete this role?")) {
              deleteRoleMutation.mutate(role.id);
            }
          }}
          className="text-red-600 hover:text-red-900"
          title="Delete Role"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // Group permissions by resource
  const permissionsByResource =
    permissionsData?.permissions?.reduce((acc: any, permission: Permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Role Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setSelectedPermissions([]);
            reset();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </button>
      </div>

      {/* Roles Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            System Roles
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={rolesData?.roles || []}
            columns={columns}
            loading={loadingRoles}
            actions={actions}
          />
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingRole ? "Edit Role" : "Create New Role"}
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role Name *
                      </label>
                      <input
                        {...register("name")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Warehouse Manager"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        {...register("description")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Role description"
                      />
                    </div>
                  </div>

                  {/* Permissions */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      Permissions
                    </h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(permissionsByResource).map(
                        ([resource, permissions]) => (
                          <div
                            key={resource}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <h5 className="font-medium text-gray-900 mb-3 capitalize">
                              {resource} Permissions
                            </h5>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {(permissions as Permission[]).map(
                                (permission) => (
                                  <label
                                    key={permission.id}
                                    className="flex items-center"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(
                                        permission.id,
                                      )}
                                      onChange={() =>
                                        handlePermissionToggle(permission.id)
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-900">
                                      {permission.name}
                                    </span>
                                    {permission.description && (
                                      <span className="ml-1 text-xs text-gray-500">
                                        ({permission.description})
                                      </span>
                                    )}
                                  </label>
                                ),
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting
                        ? "Saving..."
                        : editingRole
                          ? "Update Role"
                          : "Create Role"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
