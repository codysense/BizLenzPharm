import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, Edit } from "lucide-react";
import { salesApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { CustomerGroup } from "../../types/api";
import CreateCustomerGroupModal from "./CreateCusomerGroupModal";
import EditCustomerGroupModal from "./EditCustomerGroup";

const CustomerGroups = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(
    null,
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customerGroups", { page, search }],
    queryFn: () =>
      salesApi.getCustomerGroups({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });

  console.log(data);

  const columns = [
    {
      key: "code",
      header: "Code",
      width: "w-24",
    },
    {
      key: "name",
      header: "Group Name",
      width: "w-48",
    },
    {
      key: "description",
      header: "Description",
      cell: (group: CustomerGroup) => group.description || "-",
      width: "w-64",
    },
    {
      key: "customerCount",
      header: "Customers",
      cell: (group: CustomerGroup) => group.customerCount || 0,
      width: "w-24",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (group: CustomerGroup) => (
        <StatusBadge status={group.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const handleCreateGroup = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditGroup = () => {
    refetch();
    setShowEditModal(false);
    setSelectedGroup(null);
  };

  const actions = (group: CustomerGroup) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedGroup(group);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Group"
      >
        <Edit className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Customer Groups</h1>
          <p className="text-gray-600">Manage your customer group categories</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Customer Group
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search customer groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Groups
                  </dt>
                  <dd className="text-4xl font-bold text-gray-900">
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
                    Active Groups
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.groups?.filter((g: CustomerGroup) => g.isActive)
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
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Customers
                  </dt>
                  <dd className="text-4xl font-bold text-gray-900">
                    {data?.groups?.reduce(
                      (sum: number, g: CustomerGroup) =>
                        sum + (g.customerCount || 0),
                      0,
                    ) || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.groups || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCustomerGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateGroup}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedGroup && (
        <EditCustomerGroupModal
          group={selectedGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={handleEditGroup}
        />
      )}
    </div>
  );
};

export default CustomerGroups;
