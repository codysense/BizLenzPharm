import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Calendar, TrendingDown } from "lucide-react";
import { assetsApi } from "../../lib/api";
import { Asset, AssetDepreciation } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";

interface DepreciationScheduleModalProps {
  asset: Asset;
  onClose: () => void;
}

const DepreciationScheduleModal = ({
  asset,
  onClose,
}: DepreciationScheduleModalProps) => {
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["depreciation-schedule", asset.id],
    queryFn: () => assetsApi.getDepreciationSchedule(asset.id),
  });

  const columns = [
    {
      key: "period",
      header: "Period",
      cell: (entry: AssetDepreciation) =>
        `${entry.periodYear}-${String(entry.periodMonth).padStart(2, "0")}`,
      width: "w-24",
    },
    {
      key: "depreciationAmount",
      header: "Depreciation",
      cell: (entry: AssetDepreciation) =>
        `₦${entry.depreciationAmount.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "accumulatedDepreciation",
      header: "Accumulated",
      cell: (entry: AssetDepreciation) =>
        `₦${entry.accumulatedDepreciation.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "netBookValue",
      header: "Net Book Value",
      cell: (entry: AssetDepreciation) => (
        <span className="font-semibold text-blue-600">
          ₦{entry.netBookValue.toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "isPosted",
      header: "Status",
      cell: (entry: AssetDepreciation) => (
        <StatusBadge status={entry.isPosted ? "Posted" : "Calculated"} />
      ),
      width: "w-24",
    },
    {
      key: "postedAt",
      header: "Posted Date",
      cell: (entry: AssetDepreciation) =>
        entry.postedAt ? new Date(entry.postedAt).toLocaleDateString() : "-",
      width: "w-32",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Wrapper */}
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
          {/* HEADER (Blue Gradient) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">
              Depreciation Schedule
              <span className="ml-2 text-blue-100 font-normal">
                ({asset.assetNo})
              </span>
            </h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Asset Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Details Card */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Asset Details
                </h4>

                <div className="space-y-2 text-sm">
                  <Row label="Asset Name" value={asset.name} />
                  <Row label="Category" value={asset.category?.name} />
                  <Row
                    label="Acquisition Date"
                    value={new Date(asset.acquisitionDate).toLocaleDateString()}
                  />
                  <Row
                    label="Acquisition Cost"
                    value={`₦${asset.acquisitionCost?.toLocaleString()}`}
                  />
                </div>
              </div>

              {/* Depreciation Settings */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Depreciation Settings
                </h4>

                <div className="space-y-2 text-sm">
                  <Row
                    label="Method"
                    value={asset.depreciationMethod?.replace("_", " ")}
                  />
                  <Row
                    label="Useful Life"
                    value={`${asset.usefulLife} years`}
                  />
                  <Row
                    label="Residual Value"
                    value={`₦${asset.residualValue?.toLocaleString()}`}
                  />
                  <Row
                    label="Current NBV"
                    value={`₦${(
                      asset.netBookValue || asset.acquisitionCost
                    )?.toLocaleString()}`}
                    highlight
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  Depreciation History
                </h4>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <DataTable
                  data={scheduleData?.schedule || []}
                  columns={columns}
                  loading={isLoading}
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* Helper UI row component */
  function Row({ label, value, highlight }) {
    return (
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">{label}</span>
        <span
          className={`font-medium ${
            highlight ? "text-blue-600" : "text-gray-900"
          }`}
        >
          {value || "—"}
        </span>
      </div>
    );
  }
};

export default DepreciationScheduleModal;
