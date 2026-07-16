import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  Clock,
  Users,
  Package,
} from "lucide-react";
import { posApi, inventoryApi, cashApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import CreatePosSessionModal from "./CreatePosSessionModal";
import PosTerminal from "./PosTerminal";
import PosReturnsModal from "./PosReturnsModal";

const PosDashboard = () => {
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const { user } = useAuthStore();

  const { data: currentSession, refetch: refetchSession } = useQuery({
    queryKey: ["current-pos-session"],
    queryFn: () => posApi.getCurrentSession(),
  });

  // console.log("Current User ", user);

  const today = new Date().toISOString().split("T")[0]; // "2025-09-03"

  const { data: todaySales } = useQuery({
    queryKey: ["today-pos-sales"],
    queryFn: () =>
      posApi.getSales({
        dateFrom: `${today}T00:00:00.000Z`,
        dateTo: `${today}T23:59:59.999Z`,
        status: "COMPLETED",
      }),
  });

  //Filter today's sales to only those created by the user if they don't have permission to view all sales
  const canviewall = user?.permissions?.includes("VIEW_ALL_SALES");
  if (todaySales && !canviewall) {
    todaySales.sales = todaySales.sales.filter(
      (sale: any) => sale.user?.name === user?.name,
    );
  }

  // const { data: warehouseItems } = useQuery({
  //   queryKey: ["warehouse-items", user?.warehouseId],
  //   queryFn: () =>
  //     inventoryApi.getItems({
  //       type: "FINISHED_GOODS",
  //       limit: 100,
  //       includeStock: "true",
  //     }),
  //   enabled: !!user?.warehouseId,
  // });

  // console.log(warehouseItems);
  const { data: cashAccounts } = useQuery({
    queryKey: ["pos-cash-accounts"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const handleCreateSession = () => {
    refetchSession();
    setShowCreateSessionModal(false);
  };

  const handleCloseSession = async () => {
    if (
      currentSession?.session &&
      confirm("Are you sure you want to close the current session?")
    ) {
      try {
        const closingBalance = prompt("Enter closing balance:");
        if (closingBalance) {
          await posApi.closeSession(currentSession.session.id, {
            closingBalance: parseFloat(closingBalance),
          });
          refetchSession();
        }
      } catch (error) {
        console.error("Close session error:", error);
      }
    }
  };

  const stats = [
    {
      name: "Today's Sales",
      value: todaySales?.sales?.length || 0,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      name: "Today's Revenue",
      value: `₦${todaySales?.sales?.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0).toLocaleString() || "0"}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    // {
    //   name: "Available Items",
    //   value: warehouseItems?.items?.length || 0,
    //   icon: Package,
    //   color: "text-purple-600",
    // },
    {
      name: "Session Status",
      value: currentSession?.session ? "OPEN" : "CLOSED",
      icon: Clock,
      color: currentSession?.session ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 space-y-6">
      {/* HERO HEADER */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-emerald-600 text-sm font-medium mb-2">
              POS Dashboard
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Retail Command Center
            </h1>
            <p className="text-gray-600 mt-2">
              Manage sales, returns, sessions and inventory in real-time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!currentSession?.session ? (
              <button
                onClick={() => setShowCreateSessionModal(true)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start Session
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowTerminal(true)}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium flex items-center"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  New Sale
                </button>

                <button
                  onClick={() => setShowReturnsModal(true)}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-medium flex items-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Returns
                </button>

                <button
                  onClick={handleCloseSession}
                  className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-2xl font-medium flex items-center text-gray-700"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Close Session
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE SESSION */}
      {currentSession?.session && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div>
              <p className="text-emerald-700 text-sm font-medium">
                ACTIVE SESSION
              </p>

              <h3 className="text-2xl font-bold mt-1 text-gray-900">
                {currentSession.session.sessionNo}
              </h3>

              <p className="text-gray-600 mt-2">
                Opened:{" "}
                {new Date(currentSession.session.openedAt).toLocaleString()}
              </p>

              <p className="text-gray-500 text-sm mt-1">
                Opening Balance: ₦
                {currentSession.session.openingBalance.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">Total Sales</p>
                <h4 className="text-2xl font-bold text-emerald-600 mt-2">
                  ₦{currentSession.session.totalSales.toLocaleString()}
                </h4>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">Returns</p>
                <h4 className="text-2xl font-bold text-red-500 mt-2">
                  ₦{currentSession.session.totalReturns.toLocaleString()}
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">{stat.name}</p>
                <h3 className="text-3xl font-bold mt-3 text-gray-900">
                  {stat.value}
                </h3>
              </div>

              <div className="p-3 rounded-2xl bg-gray-100">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">
            Quick Actions
          </h3>

          <div className="space-y-4">
            <button
              onClick={() => setShowTerminal(true)}
              disabled={!currentSession?.session}
              className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl disabled:opacity-50"
            >
              <div className="flex items-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600 mr-4" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">New Sale</p>
                  <p className="text-sm text-gray-500">
                    Process walk-in customer sale
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowReturnsModal(true)}
              disabled={!currentSession?.session}
              className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl disabled:opacity-50"
            >
              <div className="flex items-center">
                <RotateCcw className="w-6 h-6 text-amber-500 mr-4" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Process Return</p>
                  <p className="text-sm text-gray-500">
                    Handle customer returns
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">
            Operations
          </h3>

          <div className="space-y-4">
            <a
              href="/sales/customers"
              className="flex items-center bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl"
            >
              <Users className="w-6 h-6 text-blue-500 mr-4" />
              <div>
                <p className="font-medium text-gray-900">Manage Customers</p>
                <p className="text-sm text-gray-500">Add/edit customers</p>
              </div>
            </a>

            <a
              href="/inventory/items"
              className="flex items-center bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl"
            >
              <Package className="w-6 h-6 text-purple-500 mr-4" />
              <div>
                <p className="font-medium text-gray-900">Inventory</p>
                <p className="text-sm text-gray-500">Monitor stock levels</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* MODALS (unchanged) */}
      {showCreateSessionModal && (
        <CreatePosSessionModal
          onClose={() => setShowCreateSessionModal(false)}
          onSuccess={handleCreateSession}
        />
      )}

      {showTerminal && currentSession?.session && (
        <PosTerminal
          session={currentSession.session}
          onClose={() => setShowTerminal(false)}
          onSaleComplete={() => {
            setShowTerminal(false);
            refetchSession();
          }}
        />
      )}

      {showReturnsModal && currentSession?.session && (
        <PosReturnsModal
          session={currentSession.session}
          onClose={() => setShowReturnsModal(false)}
          onReturnComplete={() => {
            setShowReturnsModal(false);
            refetchSession();
          }}
        />
      )}
    </div>
  );

  // return (
  //   <div className="space-y-6">
  //     {/* Header */}
  //     <div className="flex justify-between items-center">
  //       <div>
  //         <h1 className="text-2xl font-bold text-gray-900">Point of Sales</h1>
  //         <p className="text-gray-600">
  //           Fast sales processing for walk-in customers
  //         </p>
  //       </div>
  //       <div className="flex space-x-2">
  //         {!currentSession?.session ? (
  //           <button
  //             onClick={() => setShowCreateSessionModal(true)}
  //             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //           >
  //             <Plus className="h-4 w-4 mr-2" />
  //             Start Session
  //           </button>
  //         ) : (
  //           <>
  //             <button
  //               onClick={() => setShowTerminal(true)}
  //               className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
  //             >
  //               <ShoppingCart className="h-4 w-4 mr-2" />
  //               New Sale
  //             </button>
  //             <button
  //               onClick={() => setShowReturnsModal(true)}
  //               className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //             >
  //               <RotateCcw className="h-4 w-4 mr-2" />
  //               Process Return
  //             </button>
  //             <button
  //               onClick={handleCloseSession}
  //               className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //             >
  //               <Clock className="h-4 w-4 mr-2" />
  //               Close Session
  //             </button>
  //           </>
  //         )}
  //       </div>
  //     </div>

  //     {/* Current Session Info */}
  //     {currentSession?.session && (
  //       <div className="bg-green-50 border border-green-200 rounded-lg p-4">
  //         <div className="flex items-center justify-between">
  //           <div>
  //             <h3 className="text-lg font-medium text-green-900">
  //               Active Session: {currentSession.session.sessionNo}
  //             </h3>
  //             <p className="text-green-700">
  //               Started:{" "}
  //               {new Date(currentSession.session.openedAt).toLocaleString()} |
  //               Opening Balance: ₦
  //               {currentSession.session.openingBalance.toLocaleString()}
  //             </p>
  //           </div>
  //           <div className="text-right">
  //             <div className="text-lg font-semibold text-green-900">
  //               Sales: ₦{currentSession.session.totalSales.toLocaleString()}
  //             </div>
  //             <div className="text-sm text-green-700">
  //               Returns: ₦{currentSession.session.totalReturns.toLocaleString()}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     )}

  //     {/* Stats */}
  //     <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
  //       {stats.map((stat) => (
  //         <div
  //           key={stat.name}
  //           className="bg-white overflow-hidden shadow rounded-lg"
  //         >
  //           <div className="p-5">
  //             <div className="flex items-center">
  //               <div className="flex-shrink-0">
  //                 <stat.icon className={`h-6 w-6 ${stat.color}`} />
  //               </div>
  //               <div className="ml-5 w-0 flex-1">
  //                 <dl>
  //                   <dt className="text-sm font-medium text-gray-500 truncate">
  //                     {stat.name}
  //                   </dt>
  //                   <dd className="text-2xl font-semibold text-gray-900">
  //                     {stat.value}
  //                   </dd>
  //                 </dl>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       ))}
  //     </div>

  //     {/* Quick Actions */}
  //     <div className="bg-white shadow rounded-lg">
  //       <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
  //         <h3 className="text-lg leading-6 font-medium text-gray-900">
  //           Quick Actions
  //         </h3>
  //       </div>
  //       <div className="p-6">
  //         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  //           <button
  //             onClick={() => setShowTerminal(true)}
  //             disabled={!currentSession?.session}
  //             className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  //           >
  //             <ShoppingCart className="h-8 w-8 text-gray-400 mr-3" />
  //             <div className="text-left">
  //               <div className="font-medium text-gray-900">New Sale</div>
  //               <div className="text-sm text-gray-500">
  //                 Process customer sale
  //               </div>
  //             </div>
  //           </button>

  //           <button
  //             onClick={() => setShowReturnsModal(true)}
  //             disabled={!currentSession?.session}
  //             className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
  //           >
  //             <RotateCcw className="h-8 w-8 text-gray-400 mr-3" />
  //             <div className="text-left">
  //               <div className="font-medium text-gray-900">Process Return</div>
  //               <div className="text-sm text-gray-500">Handle returns</div>
  //             </div>
  //           </button>

  //           <a
  //             href="/sales/customers"
  //             className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //           >
  //             <Users className="h-8 w-8 text-gray-400 mr-3" />
  //             <div className="text-left">
  //               <div className="font-medium text-gray-900">
  //                 Manage Customers
  //               </div>
  //               <div className="text-sm text-gray-500">Add/edit customers</div>
  //             </div>
  //           </a>

  //           <a
  //             href="/inventory/items"
  //             className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
  //           >
  //             <Package className="h-8 w-8 text-gray-400 mr-3" />
  //             <div className="text-left">
  //               <div className="font-medium text-gray-900">View Inventory</div>
  //               <div className="text-sm text-gray-500">Check stock levels</div>
  //             </div>
  //           </a>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Modals */}
  //     {showCreateSessionModal && (
  //       <CreatePosSessionModal
  //         onClose={() => setShowCreateSessionModal(false)}
  //         onSuccess={handleCreateSession}
  //       />
  //     )}

  //     {showTerminal && currentSession?.session && (
  //       <PosTerminal
  //         session={currentSession.session}
  //         onClose={() => setShowTerminal(false)}
  //         onSaleComplete={() => {
  //           setShowTerminal(false);
  //           refetchSession();
  //         }}
  //       />
  //     )}

  //     {showReturnsModal && currentSession?.session && (
  //       <PosReturnsModal
  //         session={currentSession.session}
  //         onClose={() => setShowReturnsModal(false)}
  //         onReturnComplete={() => {
  //           setShowReturnsModal(false);
  //           refetchSession();
  //         }}
  //       />
  //     )}
  //   </div>
  // );
};

export default PosDashboard;
