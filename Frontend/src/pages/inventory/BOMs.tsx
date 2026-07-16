import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Package, Edit } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Bom } from "../../types/api";
import CreateBomModal from "./CreateBomModal";
import EditBomModal from "./EditBomModal";
import { ItemSelect } from "../../components/ItemSelect";

const BOMs = () => {
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBom, setSelectedBom] = useState<Bom | null>(null);
  // const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [search, setSearch] = useState("");

  const {
    data: boms,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["boms"],
    queryFn: () => inventoryApi.getBoms(),
  });

  // const { data: items } = useQuery({
  //   queryKey: ["items-for-bom"],
  //   queryFn: () => inventoryApi.getItems({ type: "FINISHED_GOODS" }),
  // });

  const filteredBoms = boms?.filter((bom: Bom) => {
    if (!search) return true;

    const q = search.toLowerCase();
    return (
      bom.item.name.toLowerCase().includes(q) ||
      bom.item.sku.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      key: "item.sku",
      header: "Item SKU",
      width: "w-32",
    },
    {
      key: "item.name",
      header: "Item Name",
      width: "w-48",
    },
    {
      key: "version",
      header: "Version",
      width: "w-24",
    },
    {
      key: "bomLines",
      header: "Components",
      cell: (bom: Bom) => (
        <div className="space-y-1 max-w-sm">
          {bom.bomLines.slice(0, 3).map((line, index) => (
            <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
              <div className="font-medium">{line.componentItem.sku}</div>
              <div className="text-gray-600">
                {line.qtyPer} {line.componentItem.uom} per unit
                {line.scrapPercent > 0 && ` (+${line.scrapPercent}% scrap)`}
              </div>
            </div>
          ))}
          {bom.bomLines.length > 3 && (
            <div className="text-xs text-gray-500 italic">
              +{bom.bomLines.length - 3} more
            </div>
          )}
        </div>
      ),
      width: "w-80",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (bom: Bom) => (
        <StatusBadge status={bom.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (bom: Bom) => new Date(bom.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateBom = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditBom = () => {
    refetch();
    setShowEditModal(false);
    setSelectedBom(null);
  };

  const actions = (bom: Bom) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedBom(bom);
          setShowEditModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit BOM"
      >
        <Edit className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bills of Materials
          </h1>
          <p className="text-gray-500 mt-1">
            Manage product recipes and component structures
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create BOM
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search BOM
            </label>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type item name or SKU..."
                className="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
              />

              <search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total BOMs</p>
              <h3 className="text-4xl font-bold text-black/80 mt-1">
                {boms?.length || 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <Package className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active BOMs</p>
              <h3 className="text-4xl font-bold text-black/80 mt-1">
                {boms?.filter((bom: Bom) => bom.isActive).length || 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-green-50">
              <Package className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Components</p>
              <h3 className="text-4xl font-bold text-black/80 mt-1">
                {boms?.length
                  ? Math.round(
                      boms.reduce(
                        (sum: number, bom: Bom) => sum + bom.bomLines.length,
                        0,
                      ) / boms.length,
                    )
                  : 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">BOM Records</h2>
        </div>

        <div className="p-2">
          <DataTable
            data={filteredBoms || []}
            columns={columns}
            loading={isLoading}
            actions={actions}
          />
        </div>
      </div>

      {/* MODALS */}
      {showCreateModal && (
        <CreateBomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateBom}
        />
      )}

      {showEditModal && selectedBom && (
        <EditBomModal
          bom={selectedBom}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBom(null);
          }}
          onSuccess={handleEditBom}
        />
      )}
    </div>
  );
};

export default BOMs;
