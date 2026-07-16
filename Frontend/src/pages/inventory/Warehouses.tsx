import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Building, MapPin, Edit } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import CreateWarehouseModal from "./CreateWarehouseModal";
import EditWarehouseModal from "./EditWarehouseModal";

interface Location {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
}
interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  location: Location;
}

const Warehouses = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["warehouses-list", { page, search }],
    queryFn: () =>
      inventoryApi.getWarehousesList({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });

  const columns = [
    {
      key: "code",
      header: "Code",
      width: "w-24",
    },
    {
      key: "name",
      header: "Name",
      width: "w-48",
    },
    {
      key: "location.name",
      header: "Location",
      cell: (warehouse: Warehouse) => (
        <div>
          <div className="font-medium">{warehouse.location?.name}</div>
          <div className="text-xs text-gray-500">
            {warehouse.location?.city}, {warehouse.location?.state}
          </div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "address",
      header: "Address",
      cell: (warehouse: Warehouse) => warehouse.address || "-",
      width: "w-64",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (warehouse: Warehouse) => (
        <StatusBadge status={warehouse.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (warehouse: Warehouse) =>
        new Date(warehouse.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateWarehouse = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditWarehouse = () => {
    refetch();
    setShowEditModal(false);
    setSelectedWarehouse(null);
  };

  const actions = (warehouse: Warehouse) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedWarehouse(warehouse);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Warehouse"
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
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600">
            Manage warehouse locations and facilities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-2xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Warehouse
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
              placeholder="Search warehouses..."
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
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Warehouses
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
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
                <Building className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Warehouses
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.warehouses.filter((w: Warehouse) => w.isActive)
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
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Locations
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.warehouses?.filter((w: Warehouse) => w.address)
                      .length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.warehouses || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWarehouseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateWarehouse}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedWarehouse && (
        <EditWarehouseModal
          warehouse={selectedWarehouse}
          onClose={() => {
            setShowEditModal(false);
            setSelectedWarehouse(null);
          }}
          onSuccess={handleEditWarehouse}
        />
      )}
    </div>
  );
};

export default Warehouses;
