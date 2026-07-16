import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Tags, Edit, Trash2 } from "lucide-react";
import { uomApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import CreateUOMModal from "./CreateUOMModal";
import EditUOMModal from "./EditUOMModal";
import toast from "react-hot-toast";

const UOMs = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["uoms", { page, search }],
    queryFn: () =>
      uomApi.getUOMs({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });

  // console.log("UOMs data:", data);

  const columns = [
    { key: "code", header: "Code", width: "w-24" },
    { key: "name", header: "Name", width: "w-48" },
    {
      key: "createdAt",
      header: "Created",
      cell: (uom: any) => new Date(uom.createdAt).toLocaleDateString(),
      width: "w-32",
    },
    // {
    //   key: "createdBy",
    //   header: "Created By",
    //   width: "w-32",
    // },
  ];

  const handleCreate = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEdit = () => {
    refetch();
    setShowEditModal(false);
    setSelectedUOM(null);
  };

  const handleDeleteUOM = async (uom: any) => {
    try {
      if (!confirm(`Are you sure you want to delete the UOM "${uom.name}"?`)) {
        return;
      }
      await uomApi.deleteUOM(uom.id);
      toast.success("UOM deleted successfully.");
      refetch();
    } catch (error) {
      console.error("Delete UOM error:", error);
      toast.error("Failed to delete UOM.");
    }
  };

  const actions = (uom: any) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedUOM(uom);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDeleteUOM(uom)}
        className="text-red-600 hover:text-red-900"
        title="Delete UOM"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Units of Measurement
          </h1>
          <p className="text-gray-600">Manage measurement units (UOM)</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 bg-emerald-600 text-white text-sm font-medium rounded-2xl hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create UOM
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search UOM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5 flex items-center">
            <Tags className="h-6 w-6 text-gray-400" />
            <div className="ml-5">
              <p className="text-sm text-gray-500">Total UOMs</p>
              <p className="text-5xl font-bold text-black/80">
                {data?.pagination?.total || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateUOMModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreate}
        />
      )}

      {showEditModal && selectedUOM && (
        <EditUOMModal
          uom={selectedUOM}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUOM(null);
          }}
          onSuccess={handleEdit}
        />
      )}
    </div>
  );
};

export default UOMs;
