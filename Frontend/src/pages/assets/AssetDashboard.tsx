import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Building,
  TrendingDown,
  Calculator,
  Package,
  FileText,
} from "lucide-react";
import { assetsApi } from "../../lib/api";
import CapitalizeFromPurchaseModal from "./CapitalizeFromPurchaseModal";
import RunDepreciationModal from "./RunDepreciationModal";
import { useAuthStore } from "../../store/authStore";

const AssetDashboard = () => {
  const [showCapitalizeModal, setShowCapitalizeModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const { user } = useAuthStore();

  const canManageAssets =
    user?.roles.includes("Auditor") || user?.roles.includes("General Manager");

  const { data: valuationData } = useQuery({
    queryKey: ["asset-valuation"],
    queryFn: () => assetsApi.getAssetValuation(),
  });

  const { data: registerData } = useQuery({
    queryKey: ["asset-register-summary"],
    queryFn: () => assetsApi.getAssetRegister({ limit: 500 }),
  });

  const handleCapitalizeSuccess = () => {
    setShowCapitalizeModal(false);
    // Refetch data
  };

  const handleDepreciationSuccess = () => {
    setShowDepreciationModal(false);
    // Refetch data
  };

  // Group assets by category for summary
  const assetsByCategory =
    registerData?.register?.assets.reduce((acc: any, asset: any) => {
      const categoryName = asset.category?.name || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = {
          count: 0,
          totalCost: 0,
          totalDepreciation: 0,
          netBookValue: 0,
        };
      }
      acc[categoryName].count++;
      acc[categoryName].totalCost += Number(asset.acquisitionCost) || 0;
      acc[categoryName].totalDepreciation +=
        Number(asset.accumulatedDepreciation) || 0;
      acc[categoryName].netBookValue +=
        Number(asset.netBookValue) ||
        Number(asset.acquisitionCost) -
          (Number(asset.accumulatedDepreciation) || 0);
      return acc;
    }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets Dashboard</h1>
          <p className="text-gray-600">
            Overview of fixed assets and depreciation
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCapitalizeModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Package className="h-4 w-4 mr-2" />
            Capitalize from Purchase
          </button>
          {canManageAssets && (
            <button
              onClick={() => setShowDepreciationModal(true)}
              className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Run Depreciation
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
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
                    {valuationData?.summary?.assetCount || 0}
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
                    ₦{(valuationData?.summary?.totalCost || 0).toLocaleString()}
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
                    Accumulated Depreciation
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦
                    {(
                      valuationData?.summary?.totalAccumulatedDepreciation || 0
                    ).toLocaleString()}
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
                    Net Book Value
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦
                    {(
                      valuationData?.summary?.totalNetBookValue || 0
                    ).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets by Category */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Assets by Category
          </h3>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(assetsByCategory).map(
              ([categoryName, data]: [string, any]) => (
                <div key={categoryName} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {categoryName}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {data.count} assets
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">
                        ₦{Number(data.totalCost).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Depreciation:</span>
                      <span className="font-medium text-red-600">
                        ₦{Number(data.totalDepreciation).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600">Net Book Value:</span>
                      <span className="font-medium text-green-600">
                        ₦{Number(data.netBookValue).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setShowCapitalizeModal(true)}
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Package className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">
                  Capitalize Assets
                </div>
                <div className="text-sm text-gray-500">
                  From purchase orders
                </div>
              </div>
            </button>

            {canManageAssets && (
              <button
                onClick={() => setShowDepreciationModal(true)}
                className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Calculator className="h-8 w-8 text-gray-400 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    Run Depreciation
                  </div>
                  <div className="text-sm text-gray-500">
                    Monthly calculation
                  </div>
                </div>
              </button>
            )}

            <a
              href="/assets/register"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FileText className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Asset Register</div>
                <div className="text-sm text-gray-500">View all assets</div>
              </div>
            </a>

            <a
              href="/assets/categories"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Building className="h-8 w-8 text-gray-400 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Categories</div>
                <div className="text-sm text-gray-500">Manage categories</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCapitalizeModal && (
        <CapitalizeFromPurchaseModal
          onClose={() => setShowCapitalizeModal(false)}
          onSuccess={handleCapitalizeSuccess}
        />
      )}

      {showDepreciationModal && (
        <RunDepreciationModal
          onClose={() => setShowDepreciationModal(false)}
          onSuccess={handleDepreciationSuccess}
        />
      )}
    </div>
  );
};

export default AssetDashboard;
