import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, MapPin, Building, Edit } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Location } from "../../types/api";
import CreateLocationModal from "./CreateLocationModal";
import EditLocationModal from "./EditLocationModal";

const Locations = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["locations", { page, search }],
    queryFn: () =>
      inventoryApi.getLocations({
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
      key: "city",
      header: "City",
      cell: (location: Location) => location.city || "-",
      width: "w-32",
    },
    {
      key: "state",
      header: "State",
      cell: (location: Location) => location.state || "-",
      width: "w-32",
    },
    {
      key: "country",
      header: "Country",
      width: "w-32",
    },
    {
      key: "address",
      header: "Address",
      cell: (location: Location) => location.address || "-",
      width: "w-64",
    },
    {
      key: "warehouseCount",
      header: "Warehouses",
      cell: (location: Location & { _count?: { warehouses: number } }) => (
        <div className="flex items-center">
          <Building className="h-4 w-4 text-gray-400 mr-1" />
          <span>{location._count?.warehouses || 0}</span>
        </div>
      ),
      width: "w-24",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (location: Location) => (
        <StatusBadge status={location.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (location: Location) =>
        new Date(location.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateLocation = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditLocation = () => {
    refetch();
    setShowEditModal(false);
    setSelectedLocation(null);
  };

  const actions = (location: Location) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedLocation(location);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Location"
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
          <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-600">
            Manage business locations and facilities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Location
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
              placeholder="Search locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Locations
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
                <MapPin className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Locations
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.locations?.filter((l: Location) => l.isActive)
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
                <Building className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Warehouses
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.locations?.reduce(
                      (
                        sum: number,
                        l: Location & { _count?: { warehouses: number } },
                      ) => sum + (l._count?.warehouses || 0),
                      0,
                    ) || 0}
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
                <MapPin className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    States Covered
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.locations
                      ? new Set(
                          data.locations
                            .filter((l: Location) => l.state)
                            .map((l: Location) => l.state),
                        ).size
                      : 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.locations || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateLocationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateLocation}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedLocation && (
        <EditLocationModal
          location={selectedLocation}
          onClose={() => {
            setShowEditModal(false);
            setSelectedLocation(null);
          }}
          onSuccess={handleEditLocation}
        />
      )}
    </div>
  );
};

export default Locations;
