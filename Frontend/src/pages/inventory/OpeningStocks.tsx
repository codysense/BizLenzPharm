import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Building, Eye, ChevronDown } from "lucide-react";

import { openingStockApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import CreateOpeningStockModal from "./CreateOpeningStockModal";

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  uom: string;
}

interface OpeningLine {
  id: string;
  item: Item;
  qty: string;
  unitCost: string;
}

interface OpeningStock {
  id: string;
  referenceNo: string;
  openingDate: string;
  warehouse: Warehouse;
  totalItems: number;
  totalQty: number;
  totalValue: number;
  createdBy: {
    name: string;
  };
  openingLines?: OpeningLine[];
}

const OpeningStock = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["opening-stock", { page, search }],
    queryFn: () =>
      openingStockApi.getOpeningStocks({
        page,
        limit: 10,
        ...(search && { search }),
      }),
  });

  console.log("Opening Stocks Data:", data);

  const columns = [
    {
      key: "referenceNo",
      header: "Reference",
      width: "w-36",
    },
    {
      key: "openingDate",
      header: "Opening Date",
      cell: (row: OpeningStock) =>
        new Date(row.openingDate).toLocaleDateString(),
      width: "w-32",
    },
    {
      key: "warehouse.name",
      header: "Warehouse",
      width: "w-48",
    },
    {
      key: "totalItems",
      header: "Items",
      cell: (row: OpeningStock) => {
        const lines = row.openingLines || [];
        if (lines.length === 0) return <span className="text-gray-400">-</span>;

        if (lines.length === 1) {
          const line = lines[0];
          return (
            <div className="text-sm">
              <div
                className="font-medium text-gray-900 truncate max-w-[180px]"
                title={line.item.name}
              >
                {line.item.name}
              </div>
              <div className="text-xs text-gray-500">
                {line.qty} {line.item.uom} @ ₦
                {Number(line.unitCost).toLocaleString()}
              </div>
            </div>
          );
        }

        return (
          <details className="group cursor-pointer relative">
            <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50/50 hover:bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 max-w-[180px]">
              <span>{lines.length} Items</span>
              <ChevronDown className="h-4 w-4 transform transition-transform duration-200 group-open:rotate-180 text-emerald-600" />
            </summary>
            <div className="absolute left-0 mt-1.5 p-3 bg-white rounded-2xl border border-gray-100 space-y-2 text-xs shadow-xl z-20 min-w-[220px] max-w-xs">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="border-b border-gray-50 last:border-0 pb-1.5 last:pb-0"
                >
                  <span
                    className="font-medium text-gray-800 block truncate"
                    title={line.item.name}
                  >
                    {line.item.name}
                  </span>
                  <span className="text-gray-500">
                    {line.qty} {line.item.uom} x ₦
                    {Number(line.unitCost).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </details>
        );
      },
      width: "w-64",
    },
    {
      key: "totalQty",
      header: "Quantity",
      cell: (row: OpeningStock) => Number(row.totalQty).toLocaleString(),
      width: "w-32",
    },
    {
      key: "totalValue",
      header: "Value",
      cell: (row: OpeningStock) =>
        `₦${Number(row.totalValue).toLocaleString()}`,
      width: "w-40",
    },
    {
      key: "createdBy.name",
      header: "Created By",
      width: "w-40",
    },
  ];

  const handleCreate = () => {
    refetch();
    setShowCreateModal(false);
  };

  // const actions = (row: OpeningStock) => (
  // <div className="flex space-x-2">
  //   <button className="text-blue-600 hover:text-blue-800" title="View">
  //     <Eye className="h-4 w-4" />
  //   </button>
  // </div>
  // );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opening Stock</h1>
          <p className="text-gray-600">
            Record initial inventory balances before normal operations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Opening Stock
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Documents
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
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        // actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateOpeningStockModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreate}
        />
      )}
    </div>
  );
};

export default OpeningStock;
