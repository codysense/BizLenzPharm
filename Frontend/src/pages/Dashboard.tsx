import React from "react";
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
  Users,
  BarChart3,
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

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const COLORS = ["#096828", "#15ad07", "#C8B6D9", "#EDE7F6"];

const Dashboard = () => {
  // Executive Summary
  const { data: executive } = useQuery({
    queryKey: ["executive-summary"],
    queryFn: dashboardApi.getExecutiveSummary,
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

  // Charts + insights
  // const { data: expenseBreakdown } = useQuery({
  //   queryKey: ["expense-breakdown"],
  //   queryFn: dashboardApi.getExpenseBreakdown,
  // });

  // console.log(
  //   executive?.breakDownExpense.filter((e: any) => e.amount > 0),
  //   "expenses",
  // );

  const realExpenses =
    executive?.breakDownExpense.filter((e: any) => e.amount > 0) || [];
  console.log("Non Zero Expenses ", realExpenses);

  const formattedExpenseBreakdown = realExpenses.map((item: any) => ({
    ...item,
    amount: Number(item.amount),
  }));

  console.log("Formatted Expense Breakdown: ", formattedExpenseBreakdown);

  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: dashboardApi.getTopProducts,
  });

  //console.log("Top Products: ", topProducts);

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers"],
    queryFn: dashboardApi.getTopCustomers,
  });

  const { data: alerts } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: dashboardApi.getAlerts,
  });
  // console.log("alerts: ", alerts);

  const { data: productionOrders } = useQuery({
    queryKey: ["production-orders", { limit: 10 }],
    queryFn: () => productionApi.getProductionOrders({ limit: 10 }),
  });

  const kpis = [
    { name: "Revenue", value: executive?.revenue, icon: DollarSign },
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
      <div>
        <h1 className="text-2xl font-bold text-black/80">Dashboard Overview</h1>
        <p className="text-gray-600">
          Financial intelligence for smarter business decisions
        </p>
      </div>

      {/* Row 1 Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {kpis.map((item) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition border border-gray-100"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">{item.name}</p>
                <h2 className="text-xl font-bold text-black/80 mt-2">
                  {formatCurrency(item.value)}
                </h2>
              </div>
              <item.icon className="text-gray-600 h-8 w-8" />
            </div>
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
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.name}</p>
                <h3 className="text-xl font-bold text-gray-900 mt-2">
                  {typeof item.value === "number" && item.name.includes("Value")
                    ? formatCurrency(item.value)
                    : item.value}
                </h3>
              </div>
              <item.icon className="h-7 w-7 text-gray-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">
            Expense Breakdown
          </h3>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedExpenseBreakdown}
                  dataKey="amount"
                  nameKey="accountName"
                  outerRadius={100}
                  label
                >
                  {formattedExpenseBreakdown.map((_: any, index: string) => (
                    <Cell
                      key={index}
                      fill={COLORS[Number(index) % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue vs Expense */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">
            Revenue vs Expenses
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                {
                  name: "This Month",
                  revenue: executive?.revenue || 0,
                  expenses: executive?.expenses || 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#0b831f" />
              <Bar dataKey="expenses" fill="#9ca3af" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4 Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>

          {topProducts?.map((product: any) => (
            <div
              key={product.itemname}
              className="flex justify-between py-3 border-b border-gray-100"
            >
              <span className="text-gray-700">{product.itemname}</span>
              <span className="font-medium text-gray-900">
                {product.qtysold}
              </span>
              <span className="font-medium text-gray-900">@</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(product.revenue)}
              </span>
            </div>
          ))}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top Customers</h3>

          {topCustomers?.map((customer: any) => (
            <div
              key={customer.customerName}
              className="flex justify-between py-3 border-b border-gray-100"
            >
              <span className="text-gray-700">{customer.customerName}</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(customer.totalPurchased)}
              </span>
            </div>
          ))}
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
  // return (
  //   <div className="space-y-6 bg-light-lavender min-h-screen p-6">
  //     {/* Header */}
  //     <div>
  //       <h1 className="text-2xl font-bold text-velvet">Dashboard Overview</h1>
  //       <p className="text-light-velvet">
  //         Financial intelligence for smarter business decisions
  //       </p>
  //     </div>

  //     {/* Row 1 Executive KPIs */}
  //     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
  //       {kpis.map((item) => (
  //         <div
  //           key={item.name}
  //           className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition"
  //         >
  //           <div className="flex justify-between items-center">
  //             <div>
  //               <p className="text-sm text-light-velvet">{item.name}</p>
  //               <h2 className="text-xl font-bold text-velvet mt-2">
  //                 {formatCurrency(item.value)}
  //               </h2>
  //             </div>
  //             <item.icon className="text-velvet h-8 w-8" />
  //           </div>
  //         </div>
  //       ))}
  //     </div>

  //     {/* Row 2 Operational KPIs */}
  //     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
  //       {operational.map((item) => (
  //         <div key={item.name} className="bg-white rounded-2xl p-5 shadow-sm">
  //           <div className="flex justify-between">
  //             <div>
  //               <p className="text-sm text-light-velvet">{item.name}</p>
  //               <h3 className="text-xl font-bold text-dark-velvet mt-2">
  //                 {typeof item.value === "number" && item.name.includes("Value")
  //                   ? formatCurrency(item.value)
  //                   : item.value}
  //               </h3>
  //             </div>
  //             <item.icon className="h-7 w-7 text-velvet" />
  //           </div>
  //         </div>
  //       ))}
  //     </div>

  //     {/* Row 3 Charts */}
  //     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  //       {/* Expense Breakdown */}
  //       <div className="bg-white rounded-2xl shadow-sm p-6">
  //         <h3 className="font-semibold text-velvet mb-4">Expense Breakdown</h3>
  //         <div className="h-[300px] w-full">
  //           <ResponsiveContainer width="100%" height="100%">
  //             <PieChart>
  //               <Pie
  //                 data={formattedExpenseBreakdown}
  //                 dataKey="amount"
  //                 nameKey="category"
  //                 outerRadius={100}
  //                 label
  //               >
  //                 {formattedExpenseBreakdown.map((_: any, index: number) => (
  //                   <Cell key={index} fill={COLORS[index % COLORS.length]} />
  //                 ))}
  //               </Pie>

  //               <Tooltip />
  //               {/* <Legend /> */}
  //             </PieChart>
  //           </ResponsiveContainer>
  //         </div>
  //       </div>

  //       {/* Revenue vs Expense */}
  //       <div className="bg-white rounded-2xl shadow-sm p-6">
  //         <h3 className="font-semibold text-velvet mb-4">
  //           Revenue vs Expenses
  //         </h3>
  //         <ResponsiveContainer width="100%" height={300}>
  //           <BarChart
  //             data={[
  //               {
  //                 name: "This Month",
  //                 revenue: executive?.revenue || 0,
  //                 expenses: executive?.expenses || 0,
  //               },
  //             ]}
  //           >
  //             <CartesianGrid strokeDasharray="3 3" />
  //             <XAxis dataKey="name" />
  //             <YAxis />
  //             <Tooltip />
  //             <Bar dataKey="revenue" fill="#5B3B6F" />
  //             <Bar dataKey="expenses" fill="#C8B6D9" />
  //           </BarChart>
  //         </ResponsiveContainer>
  //       </div>
  //     </div>

  //     {/* Row 4 Insights */}
  //     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  //       <div className="bg-white rounded-2xl shadow-sm p-6">
  //         <h3 className="font-semibold text-velvet mb-4">Top Products</h3>
  //         {topProducts?.map((product: any) => (
  //           <div
  //             key={product.itemname}
  //             className="flex justify-between py-3 border-b"
  //           >
  //             <span>{product.itemname}</span>
  //             <span className="font-medium">
  //               {formatCurrency(product.revenue)}
  //             </span>
  //           </div>
  //         ))}
  //       </div>

  //       <div className="bg-white rounded-2xl shadow-sm p-6">
  //         <h3 className="font-semibold text-velvet mb-4">Top Customers</h3>
  //         {topCustomers?.map((customer: any) => (
  //           <div
  //             key={customer.customerName}
  //             className="flex justify-between py-3 border-b"
  //           >
  //             <span>{customer.customerName}</span>
  //             <span className="font-medium">
  //               {formatCurrency(customer.totalPurchased)}
  //             </span>
  //           </div>
  //         ))}
  //       </div>
  //     </div>

  //     {/* Row 5 Alerts */}
  //     <div className="bg-white rounded-2xl shadow-sm p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
  //       {/* <h3 className="font-semibold text-velvet mb-4">Alerts</h3> */}
  //       {/* {alerts?.lowStockItems?.map((item: any) => ( */}

  //       {/* <div key={item.itemId} className="flex items-center gap-3 py-2">
  //         // <AlertTriangle className="text-yellow-500 h-5 w-5" />
  //         // <span>{item.itemName} is low on stock</span>
  //         //{" "}
  //       </div> */}
  //       {/* Inventory Alerts */}
  //       <div className="bg-white shadow rounded-lg">
  //         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
  //           <h3 className="text-lg leading-6 font-medium text-gray-900">
  //             Inventory Alerts
  //           </h3>
  //         </div>
  //         <div className="px-4 py-4 sm:px-6">
  //           {alerts?.lowStockItems?.map((item: any) => (
  //             <div
  //               key={item.itemId}
  //               className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
  //             >
  //               <div className="flex items-center">
  //                 <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
  //                 <div>
  //                   <p className="text-sm font-medium text-gray-900">
  //                     {item.sku}
  //                   </p>
  //                   <p className="text-sm text-gray-500">{item.itemName}</p>
  //                 </div>
  //               </div>
  //               <div className="text-right">
  //                 <p className="text-sm font-medium text-red-600">
  //                   {item.quantity} remaining
  //                 </p>
  //                 <p className="text-xs text-gray-500">Low stock</p>
  //               </div>
  //             </div>
  //           )) || (
  //             <p className="text-sm text-gray-500 py-4">No inventory alerts</p>
  //           )}
  //         </div>
  //       </div>
  //       {/* ))} */}

  //       {/* Receivables Alerts */}
  //       <div className="bg-white shadow rounded-lg">
  //         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
  //           <h3 className="text-lg leading-6 font-medium text-gray-900">
  //             Receivables Alerts
  //           </h3>
  //         </div>
  //         <div className="px-4 py-4 sm:px-6">
  //           {alerts?.overdueReceivables?.map((alert: any) => (
  //             <div
  //               key={alert.customerId}
  //               className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
  //             >
  //               <div className="flex items-center">
  //                 <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
  //                 <div>
  //                   <p className="text-sm font-medium text-gray-900">
  //                     {alert.customercode}
  //                   </p>
  //                   <p className="text-sm text-gray-500">
  //                     {alert.customername}
  //                   </p>
  //                 </div>
  //               </div>
  //               <div className="text-right">
  //                 <p className="text-sm font-medium text-red-600">
  //                   {formatCurrency(alert.outstandingamount)}
  //                 </p>
  //                 <p className="text-xs text-gray-500">
  //                   {new Date(alert.orderdate).toLocaleDateString()}
  //                 </p>
  //               </div>
  //             </div>
  //           )) || (
  //             <p className="text-sm text-gray-500 py-4">
  //               No receivables alerts
  //             </p>
  //           )}
  //         </div>
  //       </div>
  //     </div>

  //     {/* Row 6 Recent Activities */}
  //     <div className="bg-white rounded-2xl shadow-sm p-6">
  //       <h3 className="font-semibold text-velvet mb-4">Recent Activities</h3>
  //       <div className="text-sm text-gray-600">
  //         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  //           {/* Recent Production Orders */}
  //           <div className="bg-white shadow rounded-lg">
  //             <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
  //               <h3 className="text-lg leading-6 font-medium text-gray-900">
  //                 Recent Production Orders
  //               </h3>
  //             </div>
  //             <div className="px-4 py-4 sm:px-6">
  //               {productionOrders?.orders?.slice(0, 5).map((order: any) => (
  //                 <div
  //                   key={order.id}
  //                   className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
  //                 >
  //                   <div>
  //                     <p className="text-sm font-medium text-gray-900">
  //                       {order.orderNo}
  //                     </p>
  //                     <p className="text-sm text-gray-500">{order.item.name}</p>
  //                   </div>
  //                   <div className="text-right">
  //                     <p className="text-sm font-medium">
  //                       {order.qtyTarget} {order.item.type}
  //                     </p>
  //                     <span
  //                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  //                         order.status === "FINISHED"
  //                           ? "bg-velvet text-lavender"
  //                           : order.status === "IN_PROGRESS"
  //                             ? "bg-blue-100 text-blue-800"
  //                             : "bg-yellow-100 text-yellow-800"
  //                       }`}
  //                     >
  //                       {order.status}
  //                     </span>
  //                   </div>
  //                 </div>
  //               )) || (
  //                 <p className="text-sm text-gray-500 py-4">
  //                   No production orders found
  //                 </p>
  //               )}
  //             </div>
  //           </div>

  //           {/* Recent Sales */}
  //           <div className="bg-white shadow rounded-lg">
  //             <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
  //               <h3 className="text-lg leading-6 font-medium text-gray-900">
  //                 Recent Sales Orders
  //               </h3>
  //             </div>
  //             <div className="px-4 py-4 sm:px-6">
  //               {sales?.sales?.slice(0, 5).map((sale: any) => (
  //                 <div
  //                   key={sale.id}
  //                   className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
  //                 >
  //                   <div>
  //                     <p className="text-sm font-medium text-gray-900">
  //                       {sale.orderNo}
  //                     </p>
  //                     <p className="text-sm text-gray-500">
  //                       {sale.customer.name}
  //                     </p>
  //                   </div>
  //                   <div className="text-right">
  //                     <p className="text-sm font-medium">
  //                       ₦
  //                       {Number(sale.totalAmount).toLocaleString(undefined, {
  //                         minimumFractionDigits: 2,
  //                         maximumFractionDigits: 2,
  //                       })}
  //                     </p>
  //                     <span
  //                       className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  //                         sale.status === "PAID"
  //                           ? "bg-green-100 text-green-800"
  //                           : sale.status === "INVOICED"
  //                             ? "bg-velvet text-lavender"
  //                             : "bg-yellow-100 text-yellow-800"
  //                       }`}
  //                     >
  //                       {sale.status}
  //                     </span>
  //                   </div>
  //                 </div>
  //               )) || (
  //                 <p className="text-sm text-gray-500 py-4">
  //                   No sales orders found
  //                 </p>
  //               )}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default Dashboard;

// import React from "react";
// import { useQuery } from "@tanstack/react-query";
// import {
//   Package,
//   Factory,
//   ShoppingCart,
//   TrendingUp,
//   DollarSign,
//   Clock,
//   Users,
//   AlertTriangle,
//   CircleEllipsis,
//   Container,
// } from "lucide-react";
// import {
//   inventoryApi,
//   productionApi,
//   purchaseApi,
//   salesApi,
//   cashApi,
//   posApi,
// } from "../lib/api";

// import { useAuthStore } from "../store/authStore";
// const Dashboard = () => {
//   const { data: inventory } = useQuery({
//     queryKey: ["inventory-valuation"],
//     queryFn: () => inventoryApi.getInventoryValuation(),
//   });

//   const { user } = useAuthStore();
//   const canviewall =
//     user?.roles.includes("Senior Accountant") ||
//     user?.roles.includes("General Manager") ||
//     user?.roles.includes("Manager");

// const { data: productionOrders } = useQuery({
//   queryKey: ["production-orders", { limit: 10 }],
//   queryFn: () => productionApi.getProductionOrders({ limit: 10 }),
// });

//   const { data: purchases } = useQuery({
//     queryKey: ["purchases", { limit: 10 }],
//     queryFn: () => purchaseApi.getPurchases({ limit: 10 }),
//   });

//   const { data: sales } = useQuery({
//     queryKey: ["sales", { limit: 10 }],
//     queryFn: () => salesApi.getSales({ limit: 10, status: "INVOICED" }),
//   });

//   //FILTER SALES TO ONLY THIS MONTH
//   const filteredSales = sales?.sales.filter((sale: any) => {
//     const saleDate = new Date(sale.orderDate);
//     const now = new Date();
//     return (
//       saleDate.getMonth() === now.getMonth() &&
//       saleDate.getFullYear() === now.getFullYear()
//     );
//   });

//   //get pos sales for this month
//   const { data: posSales } = useQuery({
//     queryKey: ["pos-sales"],
//     queryFn: () =>
//       posApi.getSalesForDashboard({
//         status: "COMPLETED",
//         dateFrom: new Date(
//           new Date().getFullYear(),
//           new Date().getMonth(),
//           1,
//         ).toISOString(),
//         dateTo: new Date(
//           new Date().getFullYear(),
//           new Date().getMonth() + 1,
//           0,
//         ).toISOString(),
//       }),
//   });
//   // console.log("POS Sales Data:", posSales);

//   //Filter pos sales to only this
//   // if (posSales) {
//   //   posSales.sales = posSales.sales.filter((sale: any) => {
//   //     const saleDate = new Date(sale.createdAt);
//   //     const now = new Date();
//   //     return (
//   //       saleDate.getMonth() === now.getMonth() &&
//   //       saleDate.getFullYear() === now.getFullYear()
//   //     );
//   //   });
//   // }

//   // console.log("Filtered POS Sales for this month:", posSales);

//   //if user is not accountant or gm, filter pos sales to only those created by the user
//   if (posSales && !canviewall) {
//     posSales.sales = posSales.sales.filter(
//       (sale: any) => sale.user?.name === user?.name,
//     );
//   }

//   //calculate total pos sales amount for the month
//   const totalPosSalesAmount = posSales?.sales?.reduce(
//     (sum: number, sale: any) => sum + Number(sale.totalAmount || 0),
//     0,
//   );

//   //if user is not accountant or gm, filter sales orders to only those created by the user
//   if (filteredSales && !canviewall) {
//     sales.sales = filteredSales.filter(
//       (sale: any) => sale.preparer?.name === user?.name,
//     );
//   }

//   //calculate total sales amount for the month
//   const totalSalesAmount = sales?.sales?.reduce(
//     (sum: number, sale: any) => sum + Number(sale.totalAmount || 0),
//     0,
//   );

//   const { data: cashAccounts } = useQuery({
//     queryKey: ["cash-accounts"],
//     queryFn: () => cashApi.getCashAccounts(),
//   });

//   // const filteredAccounts = cashAccounts?.accounts?.filter((account: any) => account.name !== 'Memo Clearing');

//   const stats = [
//     {
//       name: "Stock Value",
//       value: inventory
//         ? `₦${
//             inventory.totalValue?.toLocaleString(undefined, {
//               minimumFractionDigits: 2,
//               maximumFractionDigits: 2,
//             }) || "0"
//           }`
//         : "₦0",
//       icon: Container,
//       // change: '+4.75%',
//       // changeType: 'increase'
//     },
//     {
//       name: "Active Production Orders",
//       value:
//         productionOrders?.orders?.filter(
//           (po: any) => po.status === "IN_PROGRESS",
//         ).length || 0,
//       icon: Factory,
//       // change: '+8.2%',
//       // changeType: 'increase'
//     },
//     {
//       name: "Pending Purchases",
//       value:
//         purchases?.purchases?.filter((p: any) => p.status === "ORDERED")
//           .length || 0,
//       icon: ShoppingCart,
//       // change: '-2.1%',
//       // changeType: 'decrease'
//     },
//     {
//       name: "Sales This Month",
//       value: `₦${
//         (totalSalesAmount + (totalPosSalesAmount || 0)).toLocaleString(
//           undefined,
//           {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//           },
//         ) || "0"
//       }`,
//       icon: TrendingUp,
//       // change: '+12.5%',
//       // changeType: 'increase'
//     },
//   ];

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div>
//         <h1 className="text-2xl font-bold text-velvet">Dashboard</h1>
//         <p className="text-light-velvet">
//           Welcome to BizLenZ Accounting Software
//         </p>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
//         {stats.map((stat) => (
//           <div
//             key={stat.name}
//             className="bg-white overflow-hidden shadow rounded-lg"
//           >
//             <div className="p-5">
//               <div className="flex items-center">
//                 <div className="flex-shrink-0">
//                   <stat.icon className="h-6 w-6 text-light-velvet" />
//                 </div>
//                 <div className="ml-5 w-0 flex-1">
//                   <dl>
//                     <dt className="text-sm font-medium text-light-velvet truncate">
//                       {stat.name}
//                     </dt>
//                     <dd className="flex items-baseline">
//                       <div className="text-2xl font-semibold text-velvet">
//                         {stat.value}
//                       </div>
//                       <div
//                         className={`ml-2 flex items-baseline text-sm font-semibold ${
//                           stat.changeType === "increase"
//                             ? "text-green-600"
//                             : "text-red-600"
//                         }`}
//                       >
//                         {stat.change}
//                       </div>
//                     </dd>
//                   </dl>
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Cash Account Balances */}
//       {canviewall && (
//         <div className="bg-white shadow rounded-lg">
//           <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//             <h3 className="text-lg leading-6 font-medium text-gray-900">
//               Cash Account Balances
//             </h3>
//           </div>
//           <div className="px-4 py-4 sm:px-6">
//             {cashAccounts?.accounts.length > 0 ? (
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//                 {cashAccounts?.accounts.map((account: any) => (
//                   <div key={account.id} className="bg-gray-50 p-4 rounded-lg">
//                     <div className="flex items-center justify-between">
//                       <div>
//                         <div className="font-medium text-gray-900">
//                           {account.name}
//                         </div>
//                         <div className="text-sm text-gray-500">
//                           {account.code}
//                         </div>
//                         <div className="text-xs text-gray-400 flex items-center mt-1">
//                           <DollarSign className="h-3 w-3 mr-1" />
//                           {account.accountType}
//                           {account.bankName && ` - ${account.bankName}`}
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div
//                           className={`text-lg font-semibold ${
//                             account.balance >= 0 ? "text-velvet" : "text-rose"
//                           }`}
//                         >
//                           {Number(account.balance).toLocaleString("en-NG", {
//                             style: "currency",
//                             currency: "NGN",
//                           })}
//                         </div>
//                         <div
//                           className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                             account.isActive
//                               ? "bg-velvet text-lavender"
//                               : "bg-gray-100 text-light-rose"
//                           }`}
//                         >
//                           {account.isActive ? "Active" : "Inactive"}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-8">
//                 <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <p className="text-sm text-gray-500">No cash accounts found</p>
//                 <p className="text-xs text-gray-400 mt-1">
//                   Cash accounts will appear here once created
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

{
  /* Recent Activity Grid */
}
// <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//   {/* Recent Production Orders */}
//   <div className="bg-white shadow rounded-lg">
//     <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//       <h3 className="text-lg leading-6 font-medium text-gray-900">
//         Recent Production Orders
//       </h3>
//     </div>
//     <div className="px-4 py-4 sm:px-6">
//       {productionOrders?.orders?.slice(0, 5).map((order: any) => (
//         <div
//           key={order.id}
//           className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
//         >
//           <div>
//             <p className="text-sm font-medium text-gray-900">
//               {order.orderNo}
//             </p>
//             <p className="text-sm text-gray-500">{order.item.name}</p>
//           </div>
//           <div className="text-right">
//             <p className="text-sm font-medium">
//               {order.qtyTarget} {order.item.type}
//             </p>
//             <span
//               className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                 order.status === "FINISHED"
//                   ? "bg-velvet text-lavender"
//                   : order.status === "IN_PROGRESS"
//                     ? "bg-blue-100 text-blue-800"
//                     : "bg-yellow-100 text-yellow-800"
//               }`}
//             >
//               {order.status}
//             </span>
//           </div>
//         </div>
//       )) || (
//         <p className="text-sm text-gray-500 py-4">
//           No production orders found
//         </p>
//       )}
//     </div>
//   </div>

// {/* Inventory Alerts */}
// <div className="bg-white shadow rounded-lg">
//   <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//     <h3 className="text-lg leading-6 font-medium text-gray-900">
//       Inventory Alerts
//     </h3>
//   </div>
//   <div className="px-4 py-4 sm:px-6">
//     {inventory?.valuation
//       ?.filter((item: any) => item.qty < item.minimumStockLevel)
//       .slice(0, 5)
//       .map((item: any) => (
//         <div
//           key={item.itemId}
//           className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
//         >
//           <div className="flex items-center">
//             <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
//             <div>
//               <p className="text-sm font-medium text-gray-900">
//                 {item.sku}
//               </p>
//               <p className="text-sm text-gray-500">{item.name}</p>
//             </div>
//           </div>
//           <div className="text-right">
//             <p className="text-sm font-medium text-red-600">
//               {item.qty} remaining
//             </p>
//             <p className="text-xs text-gray-500">Low stock</p>
//           </div>
//         </div>
//       )) || (
//       <p className="text-sm text-gray-500 py-4">No inventory alerts</p>
//     )}
//   </div>
// </div>

//         {/* Pending Purchases */}
//         <div className="bg-white shadow rounded-lg">
//           <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//             <h3 className="text-lg leading-6 font-medium text-gray-900">
//               Pending Purchase Orders
//             </h3>
//           </div>
//           <div className="px-4 py-4 sm:px-6">
//             {purchases?.purchases
//               ?.filter((p: any) => p.status === "ORDERED")
//               .slice(0, 5)
//               .map((purchase: any) => (
//                 <div
//                   key={purchase.id}
//                   className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
//                 >
//                   <div>
//                     <p className="text-sm font-medium text-gray-900">
//                       {purchase.orderNo}
//                     </p>
//                     <p className="text-sm text-gray-500">
//                       {purchase.vendor.name}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-sm font-medium">
//                       ₦{purchase.totalAmount.toLocaleString()}
//                     </p>
//                     <p className="text-xs text-gray-500">
//                       {new Date(purchase.orderDate).toLocaleDateString()}
//                     </p>
//                   </div>
//                 </div>
//               )) || (
//               <p className="text-sm text-gray-500 py-4">No pending purchases</p>
//             )}
//           </div>
//         </div>

// {/* Recent Sales */}
// <div className="bg-white shadow rounded-lg">
//   <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//     <h3 className="text-lg leading-6 font-medium text-gray-900">
//       Recent Sales Orders
//     </h3>
//   </div>
//   <div className="px-4 py-4 sm:px-6">
//     {sales?.sales?.slice(0, 5).map((sale: any) => (
//       <div
//         key={sale.id}
//         className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
//       >
//         <div>
//           <p className="text-sm font-medium text-gray-900">
//             {sale.orderNo}
//           </p>
//           <p className="text-sm text-gray-500">{sale.customer.name}</p>
//         </div>
//         <div className="text-right">
//           <p className="text-sm font-medium">
//             ₦
//             {Number(sale.totalAmount).toLocaleString(undefined, {
//               minimumFractionDigits: 2,
//               maximumFractionDigits: 2,
//             })}
//           </p>
//           <span
//             className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//               sale.status === "PAID"
//                 ? "bg-green-100 text-green-800"
//                 : sale.status === "INVOICED"
//                   ? "bg-blue-100 text-blue-800"
//                   : "bg-yellow-100 text-yellow-800"
//             }`}
//           >
//             {sale.status}
//           </span>
//         </div>
//       </div>
//     )) || (
//       <p className="text-sm text-gray-500 py-4">
//         No sales orders found
//       </p>
//     )}
//   </div>
// </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;
