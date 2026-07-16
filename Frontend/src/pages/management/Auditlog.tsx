import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Filter,
  Download,
  Calendar,
  User,
  FileText,
  X,
  Eye,
} from "lucide-react";
import { api, managementApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import { ReportExporter } from "../../utils/reportExport";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  beforeJson?: any;
  afterJson?: any;
  ipAddress?: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

const AuditLog = () => {
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { user } = useAuthStore();

  // Only GM can access audit logs
  const canViewAuditLogs = user?.roles.includes("General Manager");

  const { data: auditData, isLoading } = useQuery({
    queryKey: [
      "audit-logs",
      {
        page,
        userId: userFilter,
        action: actionFilter,
        entity: entityFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
      },
    ],

    queryFn: () => {
      const params = {
        page,
        limit: 20,
        ...(userFilter && { userId: userFilter }),
        ...(actionFilter && { action: actionFilter }),
        ...(entityFilter && { entity: entityFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
      };

      console.log("Params sent to backend:", params);

      return managementApi.getAuditLogs(params);
    },
    // api.get('/management/audit-logs?page=1&limit=20&action=UPDATE&entity=COMPANY_SETTINGS')
    //   .then(res => console.log(res.data))
    //   .catch(err => console.error(err));

    // queryFn: () => managementApi.getAuditLogs({
    //   page,
    //   limit: 20,
    //   ...(userFilter && { userId: userFilter }),
    //   ...(actionFilter && { action: actionFilter }),
    //   ...(entityFilter && { entity: entityFilter }),
    //   ...(dateFromFilter && { dateFrom: dateFromFilter }),
    //   ...(dateToFilter && { dateTo: dateToFilter })
    // }),
    // enabled: canViewAuditLogs
  });

  const { data: users } = useQuery({
    queryKey: ["users-for-audit-filter"],
    queryFn: () => managementApi.getUsersWithDetails({ limit: 100 }),
    enabled: canViewAuditLogs,
  });

  if (!canViewAuditLogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only General Managers can access audit logs.
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "createdAt",
      header: "Date & Time",
      cell: (entry: AuditLogEntry) => (
        <div>
          <div className="text-sm font-medium">
            {new Date(entry.createdAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">
            {" "}
            {new Date(entry.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
      width: "w-32",
    },
    {
      key: "user.name",
      header: "User",
      cell: (entry: AuditLogEntry) => (
        <div>
          <div className="text-sm font-medium">{entry.user.name}</div>
          <div className="text-xs text-gray-500">{entry.user.email}</div>
        </div>
      ),
      width: "w-48",
    },
    {
      key: "action",
      header: "Action",
      cell: (entry: AuditLogEntry) => (
        <StatusBadge status={entry.action} variant="info" />
      ),
      width: "w-24",
    },
    {
      key: "entity",
      header: "Entity",
      cell: (entry: AuditLogEntry) => (
        <StatusBadge status={entry.entity.replace("_", " ")} />
      ),
      width: "w-32",
    },
    {
      key: "entityId",
      header: "Entity ID",
      cell: (entry: AuditLogEntry) => (
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
          {entry.entityId.substring(0, 8)}...
        </span>
      ),
      width: "w-24",
    },
    // {
    //   key: 'ipAddress',
    //   header: 'IP Address',
    //   cell: (entry: AuditLogEntry) => (
    //     <span className="text-xs font-mono">{entry.ipAddress || '-'}</span>
    //   ),
    //   width: 'w-32'
    // },
    {
      key: "changes",
      header: "Changes",
      cell: (entry: AuditLogEntry) => (
        <div className="text-xs">
          {entry.beforeJson && entry.afterJson ? (
            <span className="text-blue-600">Modified</span>
          ) : entry.afterJson ? (
            <span className="text-green-600">Created</span>
          ) : entry.beforeJson ? (
            <span className="text-red-600">Deleted</span>
          ) : (
            <span className="text-gray-500">Action</span>
          )}
        </div>
      ),
      width: "w-20",
    },
  ];

  const clearAllFilters = () => {
    setUserFilter("");
    setActionFilter("");
    setEntityFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters =
    userFilter ||
    actionFilter ||
    entityFilter ||
    dateFromFilter ||
    dateToFilter;

  const handleExportPDF = async () => {
    try {
      // Create audit log report content
      const reportContent = document.createElement("div");
      reportContent.id = "audit-log-report";
      reportContent.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin-bottom: 10px;">AUDIT LOG REPORT</h1>
            <p style="color: #6b7280;">Generated on ${new Date().toLocaleString()}</p>
            ${
              hasActiveFilters
                ? `
              <div style="margin-top: 15px; padding: 10px; background-color: #f3f4f6; border-radius: 5px;">
                <strong>Applied Filters:</strong>
                ${userFilter ? `User: ${users?.users?.find((u: any) => u.id === userFilter)?.name}, ` : ""}
                ${actionFilter ? `Action: ${actionFilter}, ` : ""}
                ${entityFilter ? `Entity: ${entityFilter}, ` : ""}
                ${dateFromFilter ? `From: ${new Date(dateFromFilter).toLocaleDateString()}, ` : ""}
                ${dateToFilter ? `To: ${new Date(dateToFilter).toLocaleDateString()}` : ""}
              </div>
            `
                : ""
            }
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Date & Time</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">User</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Action</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Entity</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Entity ID</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">IP Address</th>
                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Changes</th>
              </tr>
            </thead>
            <tbody>
              ${auditData?.entries
                ?.map(
                  (entry: AuditLogEntry) => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${new Date(entry.createdAt).toLocaleString()}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${entry.user.name}<br><small>${entry.user.email}</small></td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${entry.action}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${entry.entity.replace("_", " ")}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; font-family: monospace;">${entry.entityId}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; font-family: monospace;">${entry.ipAddress || "-"}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">
                    ${
                      entry.beforeJson && entry.afterJson
                        ? "Modified"
                        : entry.afterJson
                          ? "Created"
                          : entry.beforeJson
                            ? "Deleted"
                            : "Action"
                    }
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 10px;">
            <p>This is a confidential audit report. Unauthorized access or distribution is prohibited.</p>
            <p>Bizlens Accounting Software - Audit Log Report</p>
          </div>
        </div>
      `;

      document.body.appendChild(reportContent);

      const filters = hasActiveFilters
        ? `-filtered-${new Date().toISOString().split("T")[0]}`
        : `-${new Date().toISOString().split("T")[0]}`;

      await ReportExporter.exportToPDF(
        "audit-log-report",
        `audit-log-report${filters}.pdf`,
        "Audit Log Report",
      );

      document.body.removeChild(reportContent);
      toast.success("Audit log report exported successfully");
    } catch (error) {
      console.error("Export audit log error:", error);
      toast.error("Failed to export audit log report");
    }
  };

  const actions = (entry: AuditLogEntry) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setSelectedEntry(entry);
          setShowDetailsModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );

  // Get unique values for filters
  const uniqueActions = [
    ...new Set(auditData?.entries?.map((e: AuditLogEntry) => e.action) || []),
  ];
  const uniqueEntities = [
    ...new Set(auditData?.entries?.map((e: AuditLogEntry) => e.entity) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Audit Log</h1>
          <p className="text-gray-600">
            System activity monitoring and compliance tracking
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              showFilters
                ? "border-blue-500 text-blue-700 bg-blue-50"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Active
              </span>
            )}
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Filter Options
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Users</option>
                {users?.users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Entities</option>
                {uniqueEntities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">
                Export Options
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Export will include all filtered results for compliance and audit
              purposes
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Entries
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {auditData?.pagination?.total || 0}
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
                <User className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {auditData?.entries
                      ? new Set(
                          auditData.entries.map((e: AuditLogEntry) => e.userId),
                        ).size
                      : 0}
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
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Activities
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {auditData?.entries?.filter(
                      (e: AuditLogEntry) =>
                        new Date(e.createdAt).toDateString() ===
                        new Date().toDateString(),
                    ).length || 0}
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
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unique Entities
                  </dt>
                  <dd className="text-3xl font-bold text-black/80">
                    {uniqueEntities.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                Active Filters:
              </span>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dateFromFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                From: {new Date(dateFromFilter).toLocaleDateString()}
              </span>
            )}
            {dateToFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                To: {new Date(dateToFilter).toLocaleDateString()}
              </span>
            )}
            {userFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                User:{" "}
                {users?.users?.find((u: any) => u.id === userFilter)?.name}
              </span>
            )}
            {actionFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Action: {actionFilter}
              </span>
            )}
            {entityFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Entity: {entityFilter.replace("_", " ")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={auditData?.entries || []}
        columns={columns}
        loading={isLoading}
        pagination={auditData?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Audit Entry Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDetailsModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Audit Entry Details
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Entry Information */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Entry Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timestamp:</span>
                        <span className="font-medium">
                          {new Date(selectedEntry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">User:</span>
                        <span className="font-medium">
                          {selectedEntry.user.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium">
                          {selectedEntry.user.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">IP Address:</span>
                        <span className="font-mono text-xs">
                          {selectedEntry.ipAddress || "Not recorded"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Action Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Action:</span>
                        <StatusBadge
                          status={selectedEntry.action}
                          variant="info"
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entity:</span>
                        <StatusBadge
                          status={selectedEntry.entity.replace("_", " ")}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entity ID:</span>
                        <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                          {selectedEntry.entityId}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Before/After Data */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {selectedEntry.beforeJson && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3 ">
                        Before (Previous State)
                      </h4>
                      <div className="bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="text-xs text-red-800 whitespace-pre-wrap">
                          {JSON.stringify(selectedEntry.beforeJson, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedEntry.afterJson && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3 ">
                        After (New State)
                      </h4>
                      <div className="bg-green-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="text-xs text-green-800 whitespace-pre-wrap">
                          {JSON.stringify(selectedEntry.afterJson, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {!selectedEntry.beforeJson && !selectedEntry.afterJson && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 text-center">
                      No detailed change data available for this audit entry.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
