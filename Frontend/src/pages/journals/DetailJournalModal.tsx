import React from "react";
import { X } from "lucide-react";

interface JournalLine {
  id: string;
  account: {
    name: string;
    code?: string;
  };
  debit: number;
  credit: number;
}

interface JournalDetail {
  id: string;
  journalDate: string;
  note?: string;
  reference?: string;
  journalLines: JournalLine[];
}

interface DetailJournalModalProps {
  journal: JournalDetail;
  onClose: () => void;
}

const DetailJournalModal = ({ journal, onClose }: DetailJournalModalProps) => {
  const calculateDebitTotal = () => {
    return journal.journalLines.reduce((sum, line) => {
      return sum + (line.debit || 0);
    }, 0);
  };

  const calculateCreditTotal = () => {
    return journal.journalLines.reduce((sum, line) => {
      return sum + (line.credit || 0);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Journal Details
            </h3>
            <p className="text-xs text-blue-100">
              {journal.reference || "No Reference"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Header Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              label="Date"
              value={new Date(journal.journalDate).toLocaleDateString()}
            />
            <InfoCard label="Reference" value={journal.reference || "—"} />
            <InfoCard label="Note" value={journal.note || "—"} />
          </div>

          {/* Journal Lines */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Journal Entries
            </h4>

            <div className="space-y-3">
              {journal.journalLines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Account */}
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Account</p>
                      <p className="font-medium text-gray-900">
                        {line.account.code && `${line.account.code} - `}
                        {line.account.name}
                      </p>
                    </div>

                    {/* Debit */}
                    <div>
                      <p className="text-xs text-gray-500">Debit</p>
                      <p className="font-semibold text-red-600">
                        ₦{(line.debit || 0).toLocaleString()}
                      </p>
                    </div>

                    {/* Credit */}
                    <div>
                      <p className="text-xs text-gray-500">Credit</p>
                      <p className="font-semibold text-blue-600">
                        ₦{(line.credit || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Total Debit</p>
              <p className="text-2xl font-bold text-red-600">
                ₦{calculateDebitTotal().toLocaleString()}
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-2xl font-bold text-blue-600">
                ₦{calculateCreditTotal().toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border hover:bg-gray-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailJournalModal;
