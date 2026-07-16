import React, { useState } from "react";
import { useMemos } from "../../hooks/useMemo";
import { MemoModal } from "./CreateMemoModal";
import { DataTable } from "../../components/DataTable";
import { Eye, Plus, RotateCcw } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import MemoDetailsModal from "./MemoDetailsModal";
import { useQuery } from "@tanstack/react-query";
import { memoApi } from "../../lib/api";

export const Memos = () => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const query = {
    page,
    pageSize: 10,
    type: typeFilter,
    date: dateFilter,
  };

  //fetch memos with react-query, passing filters as query params to the API,

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memos", query],
    queryFn: () => memoApi.getMemos(query),
  });

  // console.log("Fetched memos data:", data);
  //remove memos with  status === returned

  const memos = data?.data || [];

  const filteredMemo = memos.filter((m: any) => m.status !== "REVERSED");

  const pagination = data?.pagination;

  //handle reversal action - this is just a placeholder, you would implement the actual reversal logic in the API
  const handleReverse = (memoId: string) => {
    if (!window.confirm("Are you sure you want to reverse this memo?")) return;

    memoApi.reverseMemo(memoId).then(() => {
      refetch();
    });
    //console.log("Reversing memo with ID:", memoId);
  };

  // Filter customer/vendor locally like your old logic
  const filteredMemos = filteredMemo.filter((memo: any) => {
    if (partyTypeFilter === "CUSTOMER") return memo.customer !== null;
    if (partyTypeFilter === "VENDOR") return memo.vendor !== null;
    return true;
  });

  const [selectedMemo, setSelectedMemo] = useState<any>(null);

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (memo: any) =>
        memo.date ? new Date(memo.date).toLocaleDateString() : "-",
      width: "w-32",
    },
    {
      key: "module",
      header: "Module",
      cell: (memo: any) => <StatusBadge status={memo.module} />,
      width: "w-32",
    },
    {
      key: "memoType",
      header: "Type",
      cell: (memo: any) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            memo.memoType === "CREDIT"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {memo.memoType}
        </span>
      ),
      width: "w-24",
    },
    {
      key: "category",
      header: "Category",
      cell: (memo: any) =>
        memo.saleId
          ? "Sales Return"
          : memo.purchaseId
            ? "Purchase Return"
            : memo.customer
              ? "Customer Adjustment"
              : memo.vendor
                ? "Vendor Adjustment"
                : "General",
      width: "w-40",
    },
    {
      key: "party",
      header: "Customer / Vendor",
      cell: (memo: any) => memo.customer?.name || memo.vendor?.name || "-",
      width: "w-48",
    },
    {
      key: "amount",
      header: "Amount",
      cell: (memo: any) => `₦${Number(memo.amount).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "description",
      header: "Reason",
      width: "w-64",
    },
  ];

  const actions = (memo: any) => (
    <>
      <button
        onClick={() => setSelectedMemo(memo)}
        className="text-blue-600 hover:text-blue-900"
        title="View Memo"
      >
        <Eye className="h-4 w-4" />
      </button>
      {memo.category === "FINANCIAL" && (
        <button
          className="text-red-600 hover:text-red-900 mx-2"
          title="Reverse Memo"
          onClick={() => handleReverse(memo.id)}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Memos</h1>
          <p className="text-gray-600">Manage credit and debit memos</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Memo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party Type
            </label>
            <select
              value={partyTypeFilter}
              onChange={(e) => setPartyTypeFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
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
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredMemos}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Modal */}
      {isModalOpen && (
        <MemoModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}

      {selectedMemo && (
        <MemoDetailsModal
          memo={selectedMemo}
          onClose={() => setSelectedMemo(null)}
        />
      )}
    </div>
  );
};
