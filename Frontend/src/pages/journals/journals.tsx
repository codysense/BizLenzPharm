import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { journalApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import { Eye, Plus } from "lucide-react";
import CreateJournalModal from "./createJournalModal";
import DetailJournalModal from "./DetailJournalModal";

export const Journals = () => {
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const query = {
    page,
    pageSize: 10,
    date: dateFilter,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["journals", query],
    queryFn: () => journalApi.getJournal(query),
  });

  console.log("Fetched journals data:", data);

  const journals = data?.data || [];
  const pagination = data?.pagination;

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (journal: any) =>
        journal.date ? new Date(journal.date).toLocaleDateString() : "-",
      width: "w-32",
    },
    {
      key: "refType",
      header: "Reference",
      cell: (journal: any) => journal.refType || "-",
      width: "w-40",
    },
    {
      key: "note",
      header: "Reason",
      cell: (journal: any) => journal.note || "-",
      width: "w-64",
    },
    {
      key: "accountName",
      header: "Account Name",
      cell: (journal: any) => journal.accountName || "-",
      width: "w-48",
    },
    {
      key: "debit",
      header: "Total Debit",
      cell: (journal: any) => `₦${Number(journal.debit || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "credit",
      header: "Total Credit",
      cell: (journal: any) =>
        `₦${Number(journal.credit || 0).toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "postedBy",
      header: "Posted By",
      cell: (journal: any) => journal.postedBy || "-",
      width: "w-40",
    },
  ];

  // const actions = (journal: any) => (
  //   <button
  //     onClick={(() => setSelectedJournal(journal), setShowDetailModal(true))}
  //     className="text-blue-600 hover:text-blue-900"
  //     title="View Journal"
  //   >
  //     <Eye className="h-4 w-4" />
  //   </button>
  // );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Journals</h1>
          <p className="text-gray-600">Manage general journal entries</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Journal
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        data={journals}
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        // actions={actions}
      />

      {/* Create Modal */}
      {isModalOpen && (
        <CreateJournalModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedJournal && (
        <DetailJournalModal
          journal={selectedJournal}
          onClose={() => setSelectedJournal(null)}
        />
      )}
    </div>
  );
};
