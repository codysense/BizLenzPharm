import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Shield, Eye, EyeOff } from "lucide-react";
import { userApi } from "../lib/api";
import { DataTable } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { useAuthStore } from "../store/authStore";
import CreateUserModal from "./CreateUserModal";

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
  lastLoginAt?: string;
  createdAt: string;
}

const UserManagement = () => {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Only CFO and GM can access user management
  const canManageUsers =
    currentUser?.roles.includes("Senior Accountant") ||
    currentUser?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users", { page }],
    queryFn: () => userApi.getUsers({ page, limit: 10 }),
    enabled: canManageUsers,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => userApi.getRoles(),
    enabled: canManageUsers,
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
      cell: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role, index) => (
            <StatusBadge key={index} status={role} variant="info" />
          ))}
        </div>
      ),
      width: "w-48",
    },
    {
      key: "status",
      header: "Status",
      cell: (user: User) => <StatusBadge status={user.status} />,
      width: "w-24",
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      cell: (user: User) =>
        user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString()
          : "Never",
      width: "w-32",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (user: User) => new Date(user.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateUser = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await userApi.updateUserStatus(userId, newStatus);
      refetch();
    } catch (error) {
      console.error("Toggle user status error:", error);
    }
  };

  const actions = (user: User) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          // TODO: Implement edit user functionality
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit User"
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter((u: User) => u.status === "ACTIVE")
                      .length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    CFOs
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter((u: User) => u.roles.includes("CFO"))
                      .length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    General Managers
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter((u: User) =>
                      u.roles.includes("General Manager"),
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.users || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles?.roles || []}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateUser}
        />
      )}
    </div>
  );
};

export default UserManagement;
