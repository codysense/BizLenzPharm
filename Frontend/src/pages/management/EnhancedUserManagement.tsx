import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Shield, Users, Eye, EyeOff } from "lucide-react";
import { managementApi, userApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import CreateUserModal from "../CreateUserModal";
import EditUserRolesModal from "./EditUserRolesModal";
import toast from "react-hot-toast";
import EditUserModal from "./EditUserModal";

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  roles: {
    id: string;
    name: string;
  }[];
}

const EnhancedUserManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditRolesModal, setShowEditRolesModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(
    null,
  );
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Only CFO and GM can access user management
  const canManageUsers =
    currentUser?.roles.includes("Senior Accountant") ||
    currentUser?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users-with-details", { page, search }],
    queryFn: () =>
      managementApi.getUsersWithDetails({ page, limit: 10, search }),
    enabled: canManageUsers,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles-for-user-management"],
    queryFn: () => userApi.getRoles(),
    enabled: canManageUsers,
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      userApi.updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success("User status updated successfully");
      refetch();
    },
    onError: (error) => {
      console.error("Update user status error:", error);
      toast.error("Failed to update user status");
    },
  });

  if (!canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      width: "w-48",
    },
    {
      key: "email",
      header: "Email",
      width: "w-64",
    },
    {
      key: "roles",
      header: "Roles",
      cell: (user: UserWithDetails) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role, index) => (
            <StatusBadge key={index} status={role.name} variant="info" />
          ))}
        </div>
      ),
      width: "w-48",
    },
    {
      key: "status",
      header: "Status",
      cell: (user: UserWithDetails) => <StatusBadge status={user.status} />,
      width: "w-24",
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      cell: (user: UserWithDetails) =>
        user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString()
          : "Never",
      width: "w-32",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (user: UserWithDetails) =>
        new Date(user.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateUser = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditUserRoles = () => {
    refetch();
    setShowEditRolesModal(false);
    setSelectedUser(null);
  };

  const handleToggleUserStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateUserStatusMutation.mutate({ userId, status: newStatus });
  };

  const actions = (user: UserWithDetails) => (
    <div className="flex space-x-2">
      {/* <button
        onClick={() => {
          setSelectedUser(user);
          setShowEditRolesModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit User Roles"
      >
        <Edit className="h-4 w-4" />
      </button> */}
      <button
        onClick={() => {
          setSelectedUser(user);
          setShowEditUserModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit User Details"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleToggleUserStatus(user.id, user.status)}
        className={`${user.status === "ACTIVE" ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}
        title={user.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
      >
        {user.status === "ACTIVE" ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {data?.pagination?.total || 0}
              </h3>
            </div>

            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {data?.users?.filter(
                  (u: UserWithDetails) => u.status === "ACTIVE",
                ).length || 0}
              </h3>
            </div>

            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Accountants */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Accountants</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {data?.users?.filter((u: UserWithDetails) =>
                  u.roles.some((r) => r.name === "Senior Accountant"),
                ).length || 0}
              </h3>
            </div>

            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* General Managers */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">General Managers</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {data?.users?.filter((u: UserWithDetails) =>
                  u.roles.some((r) => r.name === "General Manager"),
                ).length || 0}
              </h3>
            </div>

            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <DataTable
          data={data?.users || []}
          columns={columns}
          loading={isLoading}
          pagination={data?.pagination}
          onPageChange={setPage}
          actions={actions}
        />
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles?.roles || []}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateUser}
        />
      )}

      {/* Edit User Roles Modal */}
      {showEditRolesModal && selectedUser && (
        <EditUserRolesModal
          user={selectedUser}
          roles={roles?.roles || []}
          onClose={() => {
            setShowEditRolesModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleEditUserRoles}
        />
      )}

      {/* Edit User Details Modal */}
      {showEditUserModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          roles={roles?.roles || []}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            refetch();
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedUserManagement;
