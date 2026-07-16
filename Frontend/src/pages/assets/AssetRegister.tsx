import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Building,
  Package,
  Edit,
  Trash2,
  TrendingDown,
  FileText,
} from "lucide-react";
import { assetsApi, inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { Asset } from "../../types/api";
import CreateAssetModal from "./CreateAssetModal";
import EditAssetModal from "./EditAssetModal";
import DisposeAssetModal from "./DisposeAssetModal";
import DepreciationScheduleModal from "./DepreciationScheduleModal";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const AssetRegister = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { user } = useAuthStore();

  const canManageAssets =
    user?.roles.includes("Senior Accountant") ||
    user?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "assets",
      {
        page,
        categoryId: categoryFilter,
        status: statusFilter,
        locationId: locationFilter,
      },
    ],
    queryFn: () =>
      assetsApi.getAssets({
        page,
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(locationFilter && { locationId: locationFilter }),
      }),
  });
  console.log("Assets data ", data);

  const { data: categories } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const { data: registerData } = useQuery({
    queryKey: [
      "asset-register-summary",
      page,
      categoryFilter,
      statusFilter,
      locationFilter,
    ],
    queryFn: () =>
      assetsApi.getAssetRegister({
        page,
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(locationFilter && { locationId: locationFilter }),
      }),
  });
  console.log("Assest register ", registerData);

  //console.log("Assets ", categories);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, statusFilter, locationFilter]);

  const { data: locations } = useQuery({
    queryKey: ["locations-for-assets"],
    queryFn: () => inventoryApi.getLocations({ limit: 100 }),
  });

  const columns = [
    {
      key: "assetNo",
      header: "Asset No",
      width: "w-32",
    },
    {
      key: "name",
      header: "Asset Name",
      width: "w-48",
    },
    {
      key: "category.name",
      header: "Category",
      cell: (asset: Asset) => (
        <div>
          <div className="font-medium">{asset.category?.name}</div>
          <div className="text-xs text-gray-500">
            {asset.depreciationMethod}
          </div>
        </div>
      ),
      width: "w-40",
    },
    {
      key: "acquisitionDate",
      header: "Acquisition Date",
      cell: (asset: Asset) =>
        new Date(asset.acquisitionDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "acquisitionCost",
      header: "Cost",
      cell: (asset: Asset) =>
        `₦${Number(asset.acquisitionCost).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "accumulatedDepreciation",
      header: "Accumulated Depreciation",
      cell: (asset: Asset) =>
        `₦${(Number(asset.accumulatedDepreciation) || 0).toLocaleString()}`,
      width: "w-40",
    },
    {
      key: "netBookValue",
      header: "Net Book Value",
      cell: (asset: Asset) => (
        <span className="font-semibold text-blue-600">
          ₦
          {(
            asset.netBookValue || Number(asset.acquisitionCost)
          ).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "location.name",
      header: "Location",
      cell: (asset: Asset) => asset.location?.name || "-",
      width: "w-32",
    },
    {
      key: "status",
      header: "Status",
      cell: (asset: Asset) => <StatusBadge status={asset.status} />,
      width: "w-24",
    },
  ];

  const handleCreateAsset = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditAsset = () => {
    refetch();
    setShowEditModal(false);
    setSelectedAsset(null);
  };

  const handleDisposeAsset = () => {
    refetch();
    setShowDisposeModal(false);
    setSelectedAsset(null);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (confirm(`Are you sure you want to delete asset ${asset.assetNo}?`)) {
      try {
        await assetsApi.deleteAsset(asset.id);
        toast.success("Asset deleted successfully");
        refetch();
      } catch (error) {
        console.error("Delete asset error:", error);
      }
    }
  };

  const actions = (asset: Asset) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedAsset(asset);
          setShowDepreciationModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Depreciation Schedule"
      >
        <FileText className="h-4 w-4" />
      </button>
      {asset.status === "ACTIVE" && canManageAssets && (
        <button
          onClick={() => {
            setSelectedAsset(asset);
            setShowEditModal(true);
          }}
          className="text-blue-600 hover:text-blue-900"
          title="Edit Asset"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}
      {asset.status === "ACTIVE" && canManageAssets && (
        <button
          onClick={() => {
            setSelectedAsset(asset);
            setShowDisposeModal(true);
          }}
          className="text-orange-600 hover:text-orange-900"
          title="Dispose Asset"
        >
          <TrendingDown className="h-4 w-4" />
        </button>
      )}
      {(asset._count?.depreciationEntries || 0) === 0 && canManageAssets && (
        <button
          onClick={() => handleDeleteAsset(asset)}
          className="text-red-600 hover:text-red-900"
          title="Delete Asset"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Asset Register</h1>
          <p className="text-gray-600">Manage fixed assets and depreciation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories?.categories?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISPOSED">Disposed</option>
              <option value="SOLD">Sold</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Locations</option>
              {locations?.locations?.map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Assets
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {registerData?.register?.pagination?.total || 0}
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
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Assets
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {registerData?.register?.assets.filter(
                      (a: Asset) => a.status === "ACTIVE",
                    ).length || 0}
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
                    Total Cost
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦
                    {registerData?.register?.assets
                      ?.reduce(
                        (sum: number, a: Asset) =>
                          Number(sum) + Number(a.acquisitionCost),
                        0,
                      )
                      .toLocaleString() || "0"}
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
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Net Book Value
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦
                    {registerData?.register?.assets
                      ?.reduce(
                        (sum: number, a: Asset) =>
                          sum +
                          (Number(a.netBookValue) || Number(a.acquisitionCost)),
                        0,
                      )
                      .toLocaleString() || "0"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={registerData?.register?.assets || []}
        columns={columns}
        loading={isLoading}
        pagination={registerData?.register?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAssetModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateAsset}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAsset && (
        <EditAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAsset(null);
          }}
          onSuccess={handleEditAsset}
        />
      )}

      {/* Dispose Modal */}
      {showDisposeModal && selectedAsset && (
        <DisposeAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowDisposeModal(false);
            setSelectedAsset(null);
          }}
          onSuccess={handleDisposeAsset}
        />
      )}

      {/* Depreciation Schedule Modal */}
      {showDepreciationModal && selectedAsset && (
        <DepreciationScheduleModal
          asset={selectedAsset}
          onClose={() => {
            setShowDepreciationModal(false);
            setSelectedAsset(null);
          }}
        />
      )}
    </div>
  );
};

export default AssetRegister;
