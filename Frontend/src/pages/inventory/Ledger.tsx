import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Package,
  FileText,
  X,
} from "lucide-react";
import { inventoryApi, userApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { InventoryLedgerEntry } from "../../types/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";
import { useAuthStore } from "../../store/authStore";
const InventoryLedger = () => {
  const [page, setPage] = useState(1);
  const [itemFilter, setItemFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [refTypeFilter, setRefTypeFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const userRoles = useAuthStore((state) => state.user?.roles || []);
  const user = useAuthStore((state) => state.user || []);
  console.log("User Roles in Ledger:", userRoles);
  console.log("User in Ledger:", user);

  const { data: ledgerData, isLoading } = useQuery({
    queryKey: [
      "inventory-ledger",
      {
        page,
        itemId: itemFilter,
        warehouseId: warehouseFilter,
        userId: userFilter,
        itemType: itemTypeFilter,
        refType: refTypeFilter,
        direction: directionFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
      },
    ],
    queryFn: () =>
      inventoryApi.getInventoryLedger({
        page,
        limit: 20,
        ...(itemFilter && { itemId: itemFilter }),
        ...(warehouseFilter && { warehouseId: warehouseFilter }),
        ...(userFilter && { userId: userFilter }),
        ...(itemTypeFilter && { itemType: itemTypeFilter }),
        ...(refTypeFilter && { refType: refTypeFilter }),
        ...(directionFilter && { direction: directionFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
      }),
  });
  console.log("Ledger Data:", ledgerData);

  const { data: items } = useQuery({
    queryKey: ["items-for-filter"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-filter"],
    queryFn: () => inventoryApi.getWarehouses(),
  });
  console.log("Warehouses:", warehouses);
  const { data: users } = useQuery({
    queryKey: ["users-for-filter"],
    queryFn: () => userApi.getUsers({ limit: 100 }),
  });

  console.log("Users:", users);

  // if (userRoles.includes("POS User")) {
  //   //filter ledger data with warehouseId of the user's assigned warehouse
  //   const filteredLedgerData = ledgerData?.entries.filter(
  //     (entry: InventoryLedgerEntry) =>
  //       entry.warehouseId === filteredUser[0]?.warehouse?.id,
  //   );
  // }

  // const isPosUser = userRoles.includes("POS User");
  // const displayedLedgerData =
  //   isPosUser && filteredUser[0]?.warehouse
  //     ? ledgerData?.entries.filter(
  //         (entry: InventoryLedgerEntry) =>
  //           entry.warehouseId === filteredUser[0].warehouse.id,
  //       )
  //     : ledgerData?.entries || [];

  // console.log("Displayed Ledger Data:", displayedLedgerData);

  const columns = [
    {
      key: "postedAt",
      header: "Date",
      cell: (entry: InventoryLedgerEntry) =>
        new Date(entry.postedAt).toLocaleDateString(),
      width: "w-24",
    },
    {
      key: "item.sku",
      header: "Item SKU",
      width: "w-32",
    },
    {
      key: "item.name",
      header: "Item Name",
      width: "w-48",
    },
    {
      key: "item.type",
      header: "Item Type",
      cell: (entry: InventoryLedgerEntry) => (
        <StatusBadge
          status={entry.item.type.replace("_", " ")}
          variant="info"
        />
      ),
      width: "w-32",
    },
    {
      key: "warehouse.name",
      header: "Warehouse",
      width: "w-32",
    },
    {
      key: "refType",
      header: "Reference Type",
      cell: (entry: InventoryLedgerEntry) => (
        <StatusBadge status={entry.refType} variant="info" />
      ),
      width: "w-32",
    },
    {
      key: "direction",
      header: "Direction",
      cell: (entry: InventoryLedgerEntry) => (
        <StatusBadge
          status={entry.direction}
          variant={entry.direction === "IN" ? "success" : "warning"}
        />
      ),
      width: "w-24",
    },
    {
      key: "qty",
      header: "Quantity",
      cell: (entry: InventoryLedgerEntry) =>
        `${entry.qty.toLocaleString()} ${entry.item.uom}`,
      width: "w-32",
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      cell: (entry: InventoryLedgerEntry) =>
        `₦${entry.unitCost.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "value",
      header: "Value",
      cell: (entry: InventoryLedgerEntry) => (
        <span
          className={
            entry.direction === "IN" ? "text-green-600" : "text-red-600"
          }
        >
          {entry.direction === "IN" ? "+" : "-"}₦
          {Math.abs(entry.value).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "runningQty",
      header: "Running Qty",
      cell: (entry: InventoryLedgerEntry) => entry.runningQty.toLocaleString(),
      width: "w-32",
    },
    {
      key: "runningAvgCost",
      header: "Avg Cost",
      cell: (entry: InventoryLedgerEntry) =>
        `₦${entry.runningAvgCost.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "user",
      header: "User",
      cell: (entry: InventoryLedgerEntry) => (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm">{entry.user?.name || "System"}</span>
        </div>
      ),
      width: "w-32",
    },
  ];

  const clearAllFilters = () => {
    setItemFilter("");
    setWarehouseFilter("");
    setUserFilter("");
    setItemTypeFilter("");
    setRefTypeFilter("");
    setDirectionFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters =
    itemFilter ||
    warehouseFilter ||
    userFilter ||
    itemTypeFilter ||
    refTypeFilter ||
    directionFilter ||
    dateFromFilter ||
    dateToFilter;

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      const filters = {
        ...(itemFilter && { itemId: itemFilter }),
        ...(warehouseFilter && { warehouseId: warehouseFilter }),
        ...(userFilter && { userId: userFilter }),
        ...(itemTypeFilter && { itemType: itemTypeFilter }),
        ...(refTypeFilter && { refType: refTypeFilter }),
        ...(directionFilter && { direction: directionFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
      };

      await inventoryApi.exportInventoryLedger(format, filters);
      toast.success(`Inventory ledger exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">Stock Register</h1>
          <p className="text-gray-600">
            Track all stock movements and transactions
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
        </div>
      </div>

      {/* Advanced Filters */}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            {/* Item Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <ItemSelect
                value={itemFilter}
                onChange={(value) => setItemFilter(value)}
                // placeholder="Select an item"
              />
              {/* <select
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Items</option>
                {items?.items?.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </option>
                ))}
              </select> */}
            </div>

            {/* Item Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Type
              </label>
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="WORK_IN_PROGRESS">Work in Progress</option>
                <option value="FINISHED_GOODS">Finished Goods</option>
                <option value="CONSUMABLE">Consumable</option>
              </select>
            </div>

            {/* Warehouse Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse
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

            {/* Reference Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Type
              </label>
              <select
                value={refTypeFilter}
                onChange={(e) => setRefTypeFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="PRODUCTION">Production</option>
                <option value="SALE">Sale</option>
                <option value="POS_SALE">POS Sale</option>
                <option value="POS_RETURN">POS Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OPENING_BALANCE">Opening Balance</option>
              </select>
            </div>

            {/* Direction Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direction
              </label>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Directions</option>
                <option value="IN">Inbound</option>
                <option value="OUT">Outbound</option>
              </select>
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
          </div>

          {/* Export Options */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">
                Export Options
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExport("csv")}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                {/* <button
                  onClick={() => handleExport("excel")}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export Excel
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </button> */}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Export will include all filtered results (up to 10,000 records)
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
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Transactions
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {ledgerData?.pagination?.total || 0}
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
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Inbound Transactions
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {ledgerData?.entries?.filter(
                      (e: InventoryLedgerEntry) => e.direction === "IN",
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
                <Package className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Outbound Transactions
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {ledgerData?.entries?.filter(
                      (e: InventoryLedgerEntry) => e.direction === "OUT",
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
                <User className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-4xl font-bold text-black/80">
                    {ledgerData?.entries
                      ? new Set(
                          ledgerData?.entries
                            .filter((e: InventoryLedgerEntry) => e.user)
                            .map((e: InventoryLedgerEntry) => e.user?.name),
                        ).size
                      : 0}
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
            {itemTypeFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Type: {itemTypeFilter.replace("_", " ")}
              </span>
            )}
            {refTypeFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ref: {refTypeFilter}
              </span>
            )}
            {directionFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Direction: {directionFilter}
              </span>
            )}
            {userFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                User:{" "}
                {users?.users?.find((u: any) => u.id === userFilter)?.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={ledgerData?.entries || []}
        columns={columns}
        loading={isLoading}
        pagination={ledgerData?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
};

export default InventoryLedger;
