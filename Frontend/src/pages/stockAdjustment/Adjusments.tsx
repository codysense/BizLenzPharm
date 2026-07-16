import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adjustmentApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import { Eye, Plus } from "lucide-react";
import CreateAdjustmentModal from "./createAdjustmentModal";

export const Adjustments = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const query = {
    page,
    pageSize: 10,
    type: typeFilter,
    date: dateFilter,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adjustments", query],
    queryFn: () => adjustmentApi.getStockAdjustment(query),
  });

  const adjustments = data?.data || [];
  const pagination = data?.pagination;

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (adjustment: any) =>
        adjustment.date ? new Date(adjustment.date).toLocaleDateString() : "-",
      width: "w-32",
    },
    {
      key: "itemName",
      header: "Item",
      cell: (adjustment: any) => adjustment.itemName || "-",
      width: "w-48",
    },
    {
      key: "adjustmentType",
      header: "Adjustment Type",
      cell: (adjustment: any) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            adjustment.adjustmentType === "SURPLUS"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {adjustment.adjustmentType}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (adjustment: any) =>
        Number(adjustment.quantity || 0).toLocaleString(),
      width: "w-24",
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (adjustment: any) => adjustment.warehouse || "-",
      width: "w-40",
    },
    {
      key: "createdBy",
      header: "Posted By",
      cell: (adjustment: any) => adjustment.createdBy || "-",
      width: "w-40",
    },
  ];

  // const actions = (adjustment: any) => (
  //   <button
  //     className="text-blue-600 hover:text-blue-900"
  //     title="View Adjustment"
  //     onClick={() => console.log(adjustment)} // replace with modal later
  //   >
  //     <Eye className="h-4 w-4" />
  //   </button>
  // );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">
            Stock Adjustments
          </h1>
          <p className="text-gray-600">Manage inventory stock adjustments</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">All</option>
              <option value="IN">Increase</option>
              <option value="OUT">Decrease</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={adjustments}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        // actions={actions}
      />

      {/* Modal */}
      {isModalOpen && (
        <CreateAdjustmentModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};
