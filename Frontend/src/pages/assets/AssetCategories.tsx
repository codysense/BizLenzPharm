import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Building, Settings, Edit, Trash2 } from "lucide-react";
import { assetsApi, managementApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AssetCategory } from "../../types/api";
import CreateAssetCategoryModal from "./CreateAssetCategoryModal";
import { useAuthStore } from "../../store/authStore";
import EditAssetCategoryModal from "./EditAssetCategoryModal";
import toast from "react-hot-toast";

const AssetCategories = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditAssetCategoryModal, setShowEditAssetCategoryModal] =
    useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<AssetCategory | null>(null);
  const { user } = useAuthStore();

  const canManageCategories = user?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: () => assetsApi.getAssetCategories(),
  });

  const columns = [
    {
      key: "code",
      header: "Code",
      width: "w-24",
    },
    {
      key: "name",
      header: "Category Name",
      width: "w-48",
    },
    {
      key: "description",
      header: "Description",
      cell: (category: AssetCategory) => category.description || "-",
      width: "w-64",
    },
    {
      key: "depreciationMethod",
      header: "Depreciation Method",
      cell: (category: AssetCategory) => (
        <StatusBadge
          status={category.depreciationMethod.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-40",
    },
    {
      key: "usefulLife",
      header: "Useful Life",
      cell: (category: AssetCategory) => `${category.usefulLife} years`,
      width: "w-24",
    },
    {
      key: "residualValue",
      header: "Residual Value",
      cell: (category: AssetCategory) => `${category.residualValue}%`,
      width: "w-24",
    },
    {
      key: "_count.assets",
      header: "Assets",
      cell: (category: AssetCategory) => category._count?.assets || 0,
      width: "w-20",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (category: AssetCategory) => (
        <StatusBadge status={category.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const handleCreateCategory = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleDeleteCategory = async (id: string, category: AssetCategory) => {
    if (
      !confirm(
        `Are you sure you want to delete the asset category "${category.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await assetsApi.deleteAssetCategory(id);
      refetch();
      toast.success("Asset category deleted successfully");
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const handleEditCategory = () => {
    refetch();
    setShowEditAssetCategoryModal(false);
  };

  const actions = (category: AssetCategory) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedCategory(category);
          setShowEditAssetCategoryModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Category"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => {
          handleDeleteCategory(category.id, category);
        }}
        className="text-red-600 hover:text-red-900"
        title="Delete Category"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  if (!canManageCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">Only CFO can manage asset categories.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Asset Categories</h1>
          <p className="text-gray-600">
            Configure asset categories and depreciation settings
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Category
        </button>
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
                    Total Categories
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {data?.categories?.length || 0}
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
                    Active Categories
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {data?.categories?.filter((c: AssetCategory) => c.isActive)
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
                    Total Assets
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {data?.categories?.reduce(
                      (sum: number, c: AssetCategory) =>
                        sum + (c._count?.assets || 0),
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
        data={data?.categories || []}
        actions={actions}
        columns={columns}
        loading={isLoading}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAssetCategoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateCategory}
        />
      )}

      {/* Edit Modal */}
      {showEditAssetCategoryModal && selectedCategory && (
        <EditAssetCategoryModal
          assetCategory={selectedCategory}
          onClose={() => setShowEditAssetCategoryModal(false)}
          onSuccess={handleEditCategory}
        />
      )}
    </div>
  );
};

export default AssetCategories;
