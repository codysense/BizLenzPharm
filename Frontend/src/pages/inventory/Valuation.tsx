import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingUp, DollarSign } from "lucide-react";
import { inventoryApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { InventoryValuation as InventoryValuationType } from "../../types/api";

const InventoryValuation = () => {
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: valuationData, isLoading } = useQuery({
    queryKey: [
      "inventory-valuation",
      { warehouseId: warehouseFilter, type: typeFilter },
    ],
    queryFn: () =>
      inventoryApi.getInventoryValuation({
        ...(warehouseFilter && { warehouseId: warehouseFilter }),
        ...(typeFilter && { type: typeFilter }),
      }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-valuation"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const columns = [
    {
      key: "sku",
      header: "SKU",
      width: "w-32",
    },
    {
      key: "name",
      header: "Item Name",
      width: "w-48",
    },
    {
      key: "type",
      header: "Type",
      cell: (item: InventoryValuationType) => (
        <StatusBadge status={item.type.replace("_", " ")} />
      ),
      width: "w-36",
    },
    {
      key: "costingMethod",
      header: "Costing Method",
      cell: (item: InventoryValuationType) => (
        <StatusBadge
          status={item.costingMethod.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-32",
    },
    {
      key: "qty",
      header: "Quantity",
      cell: (item: InventoryValuationType) => item.qty.toLocaleString(),
      width: "w-24",
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (item: InventoryValuationType) =>
        `₦${item.unitCost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      width: "w-32",
    },
    {
      key: "totalValue",
      header: "Total Value",
      cell: (item: InventoryValuationType) =>
        `₦${item.totalValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      width: "w-32",
    },
  ];

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export inventory valuation");
  };

  // Calculate summary statistics
  const totalItems = valuationData?.valuation?.length || 0;
  const totalQuantity =
    valuationData?.valuation?.reduce(
      (sum: number, item: InventoryValuationType) => sum + item.qty,
      0,
    ) || 0;
  const totalValue = valuationData?.totalValue || 0;
  const avgUnitCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Valuation</h1>
          <p className="text-gray-600">
            Current inventory values and costing analysis
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Warehouse
            </label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Warehouses</option>
              {warehouses?.warehouses?.map((warehouse: any) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Item Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="WORK_IN_PROGRESS">Work in Progress</option>
              <option value="FINISHED_GOODS">Finished Goods</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </div>

          {/* <div className="flex items-end">
            <div className="text-sm text-gray-500">
              As of: {valuationData?.asOfDate ? new Date(valuationData.asOfDate).toLocaleString() : '-'}
            </div>
            
          </div> */}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Items
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {totalItems}
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
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Quantity
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {totalQuantity.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden  shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Value
                  </dt>
                  <dd className="text-2xl font-bold text-black/80 ">
                    ₦{totalValue.toLocaleString()}
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
                <DollarSign className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Unit Cost
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    ₦{avgUnitCost.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={valuationData?.valuation || []}
        columns={columns}
        loading={isLoading}
        pagination={valuationData?.pagination}
        onExport={handleExport}
      />
    </div>
  );
};

export default InventoryValuation;
