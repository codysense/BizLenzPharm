import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Package,
  ArrowUpRight,
  CheckCircle2,
  Key,
} from "lucide-react";
import { inventoryApi } from "../../lib/api"; // Adjust API mapping path as necessary
import { DataTable } from "../../components/DataTable";
import ImportItemsModal from "./ImportItemsModal"; // Imported custom modal
interface PriceListEntry {
  id: string;
  customerGroup: string;
  price: number;
}
interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: string;
  uom: string;
  minimumStockLevel?: number;
  costingMethod: string;
  standardCost?: number;
  taxCode?: string;
  priceList?: PriceListEntry[];
  createdAt: string;
  cartonQuantity?: string;
  stockQty?: number;
}
const ImportItems = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Tanstack Query to pull Items list matching backend pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["items-listing", { page, search }],
    queryFn: () =>
      inventoryApi.getItems({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });
  console.log("Items Data:", data);
  const columns = [
    {
      key: "sku",
      header: "SKU",
      width: "w-32",
    },
    {
      key: "name",
      header: "Item Name",
      cell: (row: Item) => (
        <div className="text-sm">
          <div
            className="font-semibold text-gray-900 truncate max-w-[200px]"
            title={row.name}
          >
            {row.name}
          </div>
          {row.description && (
            <div
              className="text-xs text-gray-500 truncate max-w-[200px]"
              title={row.description}
            >
              {row.description}
            </div>
          )}
        </div>
      ),
      width: "w-64",
    },
    {
      key: "type",
      header: "Type",
      cell: (row: Item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
          {row.type.replace("_", " ")}
        </span>
      ),
      width: "w-36",
    },
    {
      key: "uom",
      header: "UOM",
      width: "w-24",
    },
    {
      key: "costingMethod",
      header: "Costing Method",
      width: "w-36",
    },
    {
      key: "standardCost",
      header: "Standard Cost",
      cell: (row: Item) =>
        row.standardCost !== undefined && row.standardCost !== null ? (
          `₦${Number(row.standardCost).toLocaleString()}`
        ) : (
          <span className="text-gray-400">-</span>
        ),
      width: "w-36",
    },
    {
      key: "stockQty",
      header: "Stock Quantity",
      width: "w-36",
    },

    {
      key: "cartonQuantity",
      header: "Quantity per Carton",
      width: "w-36",
    },
  ];
  const handleImportSuccess = () => {
    refetch();
    setShowImportModal(false);
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Items Module</h1>
          <p className="text-gray-600">
            View and manage finished goods, inventory definitions, and pricing
            matrices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quickbooks Import trigger */}
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-5 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium shadow-sm transition-colors text-sm"
          >
            <ArrowUpRight className="mr-2 h-4 w-4 text-indigo-600" />
            Import from QuickBooks
          </button>
          {/* <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Item
          </button> */}
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search items by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Items
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {data?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Data Table */}
      <DataTable
        data={data?.items || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />
      {/* QuickBooks Import Modal Component */}
      {showImportModal && (
        <ImportItemsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}
      {/* Create Modal stub (defined elsewhere) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-indigo-600 mx-auto" />
            <h3 className="text-lg font-bold">Standard Item Creator Modal</h3>
            <p className="text-gray-500 text-sm">
              This triggers the standard modal to add a single finished good.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-250 rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ImportItems;
