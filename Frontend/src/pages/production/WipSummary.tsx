import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Factory,
  DollarSign,
  Package,
  TrendingUp,
  Filter,
  BarChart3,
} from "lucide-react";
import { productionApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import { GenericSearchSelect } from "../../components/GenericSearchCombo";

interface WipSummaryItem {
  orderNo: string;
  item: {
    sku: string;
    name: string;
  };
  issues: number;
  labor: number;
  overhead: number;
  receipts: number;
  balance: number;
}

const WipSummary = () => {
  const [productionOrderFilter, setProductionOrderFilter] = useState("");

  const { data: wipData, isLoading } = useQuery({
    queryKey: ["wip-summary", { productionOrderId: productionOrderFilter }],
    queryFn: () =>
      productionApi.getWipSummary(
        productionOrderFilter
          ? { productionOrderId: productionOrderFilter }
          : undefined,
      ),
  });
  console.log("Fetched WIP summary data:", wipData);

  const { data: productionOrders } = useQuery({
    queryKey: ["production-orders-for-wip"],
    queryFn: () => productionApi.getProductionOrders({ limit: 100 }),
  });

  const mappedOrders = [
    {
      id: "",
      orderNo: "All",
      itemName: "Production Orders",
    },
    ...(productionOrders?.orders?.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNo,
      itemName: order.item?.name || "",
    })) || []),
  ];

  const columns = [
    {
      key: "orderNo",
      header: "Production Order",
      width: "w-32",
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
      key: "issues",
      header: "Material Issues",
      cell: (item: WipSummaryItem) => `₦${item.issues.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "labor",
      header: "Labor Cost",
      cell: (item: WipSummaryItem) => `₦${item.labor.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "overhead",
      header: "Overhead",
      cell: (item: WipSummaryItem) => `₦${item.overhead.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "receipts",
      header: "FG Receipts",
      cell: (item: WipSummaryItem) => `₦${item.receipts.toLocaleString()}`,
      width: "w-32",
    },
    {
      key: "balance",
      header: "WIP Balance",
      cell: (item: WipSummaryItem) => (
        <span
          className={`font-semibold ${item.balance > 0 ? "text-blue-600" : "text-gray-500"}`}
        >
          ₦{item.balance.toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
  ];

  // Calculate summary statistics
  const totalIssues =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.issues,
      0,
    ) || 0;
  const totalLabor =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.labor,
      0,
    ) || 0;
  const totalOverhead =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.overhead,
      0,
    ) || 0;
  const totalWipBalance =
    wipData?.reduce(
      (sum: number, item: WipSummaryItem) => sum + item.balance,
      0,
    ) || 0;

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),transparent_30%)]" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
              Manufacturing Analytics
            </p>
            <h1 className="text-3xl font-bold mt-2">
              Work in Progress Summary
            </h1>
            <p className="text-blue-100 mt-2 max-w-xl">
              Track material consumption, labor allocation, overhead expenses,
              and real-time WIP balances across production orders.
            </p>
          </div>

          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl items-center justify-center border border-white/20">
            <Factory className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Premium Filters */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Filter Production Orders
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Production Order
            </label>

            <GenericSearchSelect
              data={mappedOrders}
              value={productionOrderFilter}
              onChange={setProductionOrderFilter}
              valueKey="id"
              searchKeys={["orderNo", "itemName"]}
              placeholder="Search production orders..."
              displayValue={(item) =>
                item ? `${item.orderNo} - ${item.itemName}` : ""
              }
              renderOption={(item) => `${item.orderNo} - ${item.itemName}`}
            />
          </div>
        </div>
      </div>

      {/* Premium Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Material Issues */}
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Material Issues
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ₦{totalIssues.toLocaleString()}
              </h3>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Package className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Labor */}
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Labor Cost</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ₦{totalLabor.toLocaleString()}
              </h3>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <Factory className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </div>

        {/* Overhead */}
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Overhead</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                ₦{totalOverhead.toLocaleString()}
              </h3>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Total WIP */}
        <div className="group bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-100 font-medium">
                Total WIP Balance
              </p>
              <h3 className="text-2xl font-bold mt-2">
                ₦{totalWipBalance.toLocaleString()}
              </h3>
            </div>

            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Premium Table Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                WIP Breakdown
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Detailed breakdown of production order balances and costs
              </p>
            </div>

            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <DataTable
            data={wipData || []}
            columns={columns}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default WipSummary;
