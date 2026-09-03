import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  Package,
  Factory,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  RotateCcw,
  Calendar,
} from "lucide-react";
import {
  dashboardApi,
  inventoryApi,
  productionApi,
  purchaseApi,
  salesApi,
} from "../lib/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type PeriodType = "today" | "this_week" | "this_month" | "this_year";

const PERIOD_LABELS: Record<PeriodType, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  this_year: "This Year",
};

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const COLORS = ["#096828", "#15ad07", "#C8B6D9", "#EDE7F6", "#F59E0B", "#EF4444"];

const Dashboard = () => {
  const [period, setPeriod] = useState<PeriodType>("this_month");

  // Executive Summary
  const { data: executive } = useQuery({
    queryKey: ["executive-summary", period],
    queryFn: () => dashboardApi.getExecutiveSummary({ period }),
  });

  // Operational
  const { data: inventory } = useQuery({
    queryKey: ["inventory-value"],
    queryFn: () => inventoryApi.getInventoryValuation(),
  });

  const { data: production } = useQuery({
    queryKey: ["production-orders"],
    queryFn: () => productionApi.getProductionOrders({ limit: 10 }),
  });

  const { data: purchases } = useQuery({
    queryKey: ["pending-purchases"],
    queryFn: () => purchaseApi.getPurchases({ limit: 10, status: "ORDERED" }),
  });

  const { data: sales } = useQuery({
    queryKey: ["sales-orders"],
    queryFn: () => salesApi.getSales({ limit: 10 }),
  });

  const realExpenses =
    executive?.breakDownExpense?.filter((e: any) => e.amount > 0) || [];

  const formattedExpenseBreakdown = realExpenses.map((item: any) => ({
    ...item,
    amount: Number(item.amount),
  }));

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", period],
    queryFn: () => dashboardApi.getTopProducts({ period }),
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers", period],
    queryFn: () => dashboardApi.getTopCustomers({ period }),
  });

  const { data: alerts } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: dashboardApi.getAlerts,
  });

  const { data: productionOrders } = useQuery({
    queryKey: ["production-orders", { limit: 10 }],
    queryFn: () => productionApi.getProductionOrders({ limit: 10 }),
  });

  const kpis = [
    {
      name: "Net Revenue",
      value: executive?.revenue,
      subtext: executive?.totalReturns
        ? `Gross: ${formatCurrency(executive?.grossSales || 0)} | Returns: -${formatCurrency(executive?.totalReturns || 0)}`
        : undefined,
      icon: DollarSign,
    },
    {
      name: "Sales Returns",
      value: executive?.totalReturns || 0,
      icon: RotateCcw,
      textColor: "text-amber-700",
    },
    { name: "Net Profit", value: executive?.netProfit, icon: TrendingUp },
    { name: "Receivables", value: executive?.receivables, icon: Wallet },
    { name: "Payables", value: executive?.payables, icon: CreditCard },
    { name: "Cash Flow", value: executive?.netCashFlow, icon: BarChart3 },
  ];

  const operational = [
    {
      name: "Inventory Value",
      value: inventory?.totalValue,
      icon: Package,
    },
    {
      name: "Production Orders",
      value: production?.orders?.length || 0,
      icon: Factory,
    },
    {
      name: "Pending Purchases",
      value: purchases?.purchases?.length || 0,
      icon: ShoppingCart,
    },
    {
      name: "Sales Orders",
      value: sales?.sales?.length || 0,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black/80">Dashboard Overview</h1>
          <p className="text-gray-600">
            Financial intelligence for smarter business decisions
          </p>
        </div>

        {/* Period Filter Dropdown */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Period:
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="text-sm font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-2"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
          </select>
        </div>
      </div>

      {/* Row 1 Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {kpis.map((item) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition border border-gray-100 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">{item.name}</p>
                <h2
                  className={`text-lg font-bold mt-2 ${
                    item.textColor || "text-black/80"
                  }`}
                >
                  {formatCurrency(item.value)}
                </h2>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl">
                <item.icon className="text-gray-600 h-5 w-5" />
              </div>
            </div>
            {item.subtext && (
              <p className="text-xs text-gray-400 mt-2 font-mono truncate" title={item.subtext}>
                {item.subtext}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Row 2 Operational KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {operational.map((item) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{item.name}</p>
                <h3 className="text-xl font-bold text-gray-900 mt-2">
                  {typeof item.value === "number" && item.name.includes("Value")
                    ? formatCurrency(item.value)
                    : item.value}
                </h3>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl">
                <item.icon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales & Purchases Return Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Sales & Returns Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Sales & Returns Summary ({PERIOD_LABELS[period]})
            </h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Gross Sales (SO + POS):</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(executive?.grossSales || 0)}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span className="flex items-center">
                <RotateCcw className="h-3.5 w-3.5 mr-1 text-red-500" />
                Sales Returns (SO + POS):
              </span>
              <span className="font-medium">
                -{formatCurrency(executive?.totalReturns || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
              <span>Net Sales:</span>
              <span
                className={
                  (executive?.revenue || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {formatCurrency(executive?.revenue || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Purchases & Returns Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2 text-blue-600" />
              Purchases & Returns Summary ({PERIOD_LABELS[period]})
            </h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Gross Purchases:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(executive?.grossPurchases || 0)}
              </span>
            </div>
            <div className="flex justify-between text-green-600">
              <span className="flex items-center">
                <RotateCcw className="h-3.5 w-3.5 mr-1 text-green-500" />
                Purchase Returns:
              </span>
              <span className="font-medium">
                -{formatCurrency(executive?.totalPurchaseReturns || 0)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
              <span>Net Purchases:</span>
              <span className="text-blue-600">
                {formatCurrency(executive?.netPurchases || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Expense Breakdown</h3>
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
              {PERIOD_LABELS[period]}
            </span>
          </div>

          <div className="h-[300px] w-full">
            {formattedExpenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedExpenseBreakdown}
                    dataKey="amount"
                    nameKey="accountName"
                    outerRadius={100}
                    label
                  >
                    {formattedExpenseBreakdown.map((_: any, index: number) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No expense data for {PERIOD_LABELS[period].toLowerCase()}
              </div>
            )}
          </div>
        </div>

        {/* Revenue vs Expense */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Revenue vs Expenses</h3>
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
              {PERIOD_LABELS[period]}
            </span>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                {
                  name: PERIOD_LABELS[period],
                  revenue: executive?.revenue || 0,
                  expenses: executive?.expenses || 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#0b831f" name="Net Revenue" />
              <Bar dataKey="expenses" fill="#9ca3af" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4 Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Top Products</h3>
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
              {PERIOD_LABELS[period]} (Net Sold)
            </span>
          </div>

          {topProducts && topProducts.length > 0 ? (
            topProducts.map((product: any) => (
              <div
                key={product.itemname}
                className="flex justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-700 font-medium">{product.itemname}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-600">
                    {product.qtysold} sold
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">
              No sales data for {PERIOD_LABELS[period].toLowerCase()}
            </p>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Top Customers</h3>
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
              {PERIOD_LABELS[period]}
            </span>
          </div>

          {topCustomers && topCustomers.length > 0 ? (
            topCustomers.map((customer: any) => (
              <div
                key={customer.customerName}
                className="flex justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-700 font-medium">{customer.customerName}</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(customer.totalPurchased)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">
              No customer purchases for {PERIOD_LABELS[period].toLowerCase()}
            </p>
          )}
        </div>
      </div>

      {/* Row 5 Alerts */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Alerts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inventory Alerts
          </h3>

          {alerts?.lowStockItems?.map((item: any) => (
            <div
              key={item.itemId}
              className="flex items-center justify-between py-3 border-b border-gray-100"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.sku}
                  </p>
                  <p className="text-sm text-gray-500">{item.itemName}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-red-600">
                  {item.quantity} remaining
                </p>
                <p className="text-xs text-gray-500">Low stock</p>
              </div>
            </div>
          )) || (
            <p className="text-sm text-gray-500 py-4">No inventory alerts</p>
          )}
        </div>

        {/* Receivables */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Receivables Alerts
          </h3>

          {alerts?.overdueReceivables?.map((alert: any) => (
            <div
              key={alert.customerId}
              className="flex items-center justify-between py-3 border-b border-gray-100"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {alert.customercode}
                </p>
                <p className="text-sm text-gray-500">{alert.customername}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-red-600">
                  {formatCurrency(alert.outstandingamount)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(alert.orderdate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )) || (
            <p className="text-sm text-gray-500 py-4">No receivables alerts</p>
          )}
        </div>
      </div>

      {/* Row 6 Recent Activities */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activities</h3>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Production Orders */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Recent Production Orders
            </h4>

            {productionOrders?.orders?.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="flex justify-between py-3 border-b border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.orderNo}
                  </p>
                  <p className="text-sm text-gray-500">{order.item.name}</p>
                </div>

                <span className="text-sm text-gray-700">{order.qtyTarget}</span>
              </div>
            ))}
          </div>

          {/* Sales Orders */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Recent Sales Orders
            </h4>

            {sales?.sales?.slice(0, 5).map((sale: any) => (
              <div
                key={sale.id}
                className="flex justify-between py-3 border-b border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sale.orderNo}
                  </p>
                  <p className="text-sm text-gray-500">{sale.customer.name}</p>
                </div>

                <span className="text-sm font-medium text-gray-900">
                  ₦{Number(sale.totalAmount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
