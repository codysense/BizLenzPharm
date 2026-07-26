import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ShoppingCart,
  RotateCcw,
  DollarSign,
  Clock,
  Users,
  Package,
  ListRestart,
} from "lucide-react";
import { posApi, inventoryApi, cashApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import CreatePosSessionModal from "./CreatePosSessionModal";
import PosTerminal from "./PosTerminal";
import PosReturnsModal from "./PosReturnsModal";
import PendingPOSSales from "./PendingPOSSales";

const PosDashboard = () => {
  const queryClient = useQueryClient();
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "terminal" | "pending" | "history"
  >("terminal");
  const [resumedSale, setResumedSale] = useState<any>(null);

  const { user } = useAuthStore();

  const { data: currentSession, refetch: refetchSession } = useQuery({
    queryKey: ["current-pos-session"],
    queryFn: () => posApi.getCurrentSession(),
  });

  const today = new Date().toISOString().split("T")[0];

  const { data: todaySales } = useQuery({
    queryKey: ["today-pos-sales"],
    queryFn: () =>
      posApi.getSales({
        dateFrom: `${today}T00:00:00.000Z`,
        dateTo: `${today}T23:59:59.999Z`,
        status: "COMPLETED",
      }),
  });

  // Filter today's sales to only those created by the user if they don't have permission to view all sales
  const canviewall = user?.permissions?.includes("VIEW_ALL_SALES");
  if (todaySales && !canviewall) {
    todaySales.sales = todaySales.sales.filter(
      (sale: any) => sale.user?.name === user?.name,
    );
  }

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

  // Simplified and clean terminal launch handlers
  const handleNewSale = () => {
    setResumedSale(null);
    setShowTerminal(true);
  };

  const handleResumeSale = (sale: any) => {
    setResumedSale(sale);
    setShowTerminal(true);
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
                  onClick={handleNewSale}
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

      {/* TAB NAVIGATION */}
      {currentSession?.session && (
        <div className="flex border-b border-gray-200 gap-4">
          <button
            onClick={() => setActiveTab("terminal")}
            className={`pb-4 px-2 font-medium text-sm border-b-2 transition ${
              activeTab === "terminal"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-4 px-2 font-medium text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === "pending"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ListRestart className="w-4 h-4" />
            Paused Sales
          </button>
        </div>
      )}

      {/* ACTIVE SESSION */}
      {currentSession?.session && activeTab === "terminal" && (
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
      {activeTab === "terminal" && (
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
      )}

      {/* QUICK ACTIONS & OPERATIONS */}
      {activeTab === "terminal" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">
              Quick Actions
            </h3>

            <div className="space-y-4">
              <button
                onClick={handleNewSale}
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
      )}

      {/* PENDING SALES TAB CONTENT */}
      {activeTab === "pending" && currentSession?.session && (
        <PendingPOSSales
          session={currentSession.session}
          onResumeSale={handleResumeSale}
        />
      )}

      {/* MODALS */}
      {showCreateSessionModal && (
        <CreatePosSessionModal
          onClose={() => setShowCreateSessionModal(false)}
          onSuccess={handleCreateSession}
        />
      )}

      {/* SINGLE COMBINED TERMINAL MODAL - Handles both new sales and resumed/paused sales */}
      {showTerminal && currentSession?.session && (
        <PosTerminal
          session={currentSession.session}
          resumedSale={resumedSale}
          onClose={() => {
            setShowTerminal(false);
            setResumedSale(null);
          }}
          onSaleComplete={() => {
            setShowTerminal(false);
            setResumedSale(null);
            refetchSession();
            // Invalidate pending sales query so the restored sale vanishes from the pending list
            queryClient.invalidateQueries({ queryKey: ["pendingPOSSales"] });
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
};

export default PosDashboard;

// import React, { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import {
//   Plus,
//   ShoppingCart,
//   RotateCcw,
//   DollarSign,
//   Clock,
//   Users,
//   Package,
// } from "lucide-react";
// import { posApi, inventoryApi, cashApi } from "../../lib/api";
// import { useAuthStore } from "../../store/authStore";
// import CreatePosSessionModal from "./CreatePosSessionModal";
// import PosTerminal from "./PosTerminal";
// import PosReturnsModal from "./PosReturnsModal";
// import PendingPOSSales from "./PendingPOSSales";

// const PosDashboard = () => {
//   const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
//   const [showTerminal, setShowTerminal] = useState(false);
//   const [showReturnsModal, setShowReturnsModal] = useState(false);
//   const [activeTab, setActiveTab] = useState<
//     "terminal" | "pending" | "history"
//   >("terminal");
//   const [resumedSale, setResumedSale] = useState<any>(null);
//   const [isTerminalOpen, setIsTerminalOpen] = useState(false);
//   const { user } = useAuthStore();

//   const { data: currentSession, refetch: refetchSession } = useQuery({
//     queryKey: ["current-pos-session"],
//     queryFn: () => posApi.getCurrentSession(),
//   });

//   // console.log("Current User ", user);

//   const today = new Date().toISOString().split("T")[0]; // "2025-09-03"

//   const { data: todaySales } = useQuery({
//     queryKey: ["today-pos-sales"],
//     queryFn: () =>
//       posApi.getSales({
//         dateFrom: `${today}T00:00:00.000Z`,
//         dateTo: `${today}T23:59:59.999Z`,
//         status: "COMPLETED",
//       }),
//   });

//   //Filter today's sales to only those created by the user if they don't have permission to view all sales
//   const canviewall = user?.permissions?.includes("VIEW_ALL_SALES");
//   if (todaySales && !canviewall) {
//     todaySales.sales = todaySales.sales.filter(
//       (sale: any) => sale.user?.name === user?.name,
//     );
//   }

//   // const { data: warehouseItems } = useQuery({
//   //   queryKey: ["warehouse-items", user?.warehouseId],
//   //   queryFn: () =>
//   //     inventoryApi.getItems({
//   //       type: "FINISHED_GOODS",
//   //       limit: 100,
//   //       includeStock: "true",
//   //     }),
//   //   enabled: !!user?.warehouseId,
//   // });

//   // console.log(warehouseItems);
//   const { data: cashAccounts } = useQuery({
//     queryKey: ["pos-cash-accounts"],
//     queryFn: () => cashApi.getCashAccounts(),
//   });

//   const handleCreateSession = () => {
//     refetchSession();
//     setShowCreateSessionModal(false);
//   };

//   const handleCloseSession = async () => {
//     if (
//       currentSession?.session &&
//       confirm("Are you sure you want to close the current session?")
//     ) {
//       try {
//         const closingBalance = prompt("Enter closing balance:");
//         if (closingBalance) {
//           await posApi.closeSession(currentSession.session.id, {
//             closingBalance: parseFloat(closingBalance),
//           });
//           refetchSession();
//         }
//       } catch (error) {
//         console.error("Close session error:", error);
//       }
//     }
//   };

//   const handleResumeSale = (sale: any) => {
//     setResumedSale(sale);
//     setIsTerminalOpen(true);
//   };

//   const stats = [
//     {
//       name: "Today's Sales",
//       value: todaySales?.sales?.length || 0,
//       icon: ShoppingCart,
//       color: "text-blue-600",
//     },
//     {
//       name: "Today's Revenue",
//       value: `₦${todaySales?.sales?.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0).toLocaleString() || "0"}`,
//       icon: DollarSign,
//       color: "text-green-600",
//     },
//     // {
//     //   name: "Available Items",
//     //   value: warehouseItems?.items?.length || 0,
//     //   icon: Package,
//     //   color: "text-purple-600",
//     // },
//     {
//       name: "Session Status",
//       value: currentSession?.session ? "OPEN" : "CLOSED",
//       icon: Clock,
//       color: currentSession?.session ? "text-green-600" : "text-red-600",
//     },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-900 p-6 space-y-6">
//       {/* HERO HEADER */}
//       <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
//         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
//           <div>
//             <p className="text-emerald-600 text-sm font-medium mb-2">
//               POS Dashboard
//             </p>
//             <h1 className="text-3xl font-bold text-gray-900">
//               Retail Command Center
//             </h1>
//             <p className="text-gray-600 mt-2">
//               Manage sales, returns, sessions and inventory in real-time.
//             </p>
//           </div>

//           <div className="flex flex-wrap gap-3">
//             {!currentSession?.session ? (
//               <button
//                 onClick={() => setShowCreateSessionModal(true)}
//                 className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium flex items-center"
//               >
//                 <Plus className="w-5 h-5 mr-2" />
//                 Start Session
//               </button>
//             ) : (
//               <>
//                 <button
//                   onClick={() => setShowTerminal(true)}
//                   className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium flex items-center"
//                 >
//                   <ShoppingCart className="w-5 h-5 mr-2" />
//                   New Sale
//                 </button>

//                 <button
//                   onClick={() => setShowReturnsModal(true)}
//                   className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-medium flex items-center"
//                 >
//                   <RotateCcw className="w-5 h-5 mr-2" />
//                   Returns
//                 </button>

//                 <button
//                   onClick={handleCloseSession}
//                   className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-2xl font-medium flex items-center text-gray-700"
//                 >
//                   <Clock className="w-5 h-5 mr-2" />
//                   Close Session
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ACTIVE SESSION */}
//       {currentSession?.session && (
//         <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
//           <div className="flex flex-col lg:flex-row justify-between gap-4">
//             <div>
//               <p className="text-emerald-700 text-sm font-medium">
//                 ACTIVE SESSION
//               </p>

//               <h3 className="text-2xl font-bold mt-1 text-gray-900">
//                 {currentSession.session.sessionNo}
//               </h3>

//               <p className="text-gray-600 mt-2">
//                 Opened:{" "}
//                 {new Date(currentSession.session.openedAt).toLocaleString()}
//               </p>

//               <p className="text-gray-500 text-sm mt-1">
//                 Opening Balance: ₦
//                 {currentSession.session.openingBalance.toLocaleString()}
//               </p>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div className="bg-white border border-gray-200 rounded-2xl p-4">
//                 <p className="text-gray-500 text-sm">Total Sales</p>
//                 <h4 className="text-2xl font-bold text-emerald-600 mt-2">
//                   ₦{currentSession.session.totalSales.toLocaleString()}
//                 </h4>
//               </div>

//               <div className="bg-white border border-gray-200 rounded-2xl p-4">
//                 <p className="text-gray-500 text-sm">Returns</p>
//                 <h4 className="text-2xl font-bold text-red-500 mt-2">
//                   ₦{currentSession.session.totalReturns.toLocaleString()}
//                 </h4>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* STATS GRID */}
//       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
//         {stats.map((stat) => (
//           <div
//             key={stat.name}
//             className="bg-white border border-gray-200 rounded-3xl p-6 hover:shadow-md transition"
//           >
//             <div className="flex justify-between items-start">
//               <div>
//                 <p className="text-gray-500 text-sm">{stat.name}</p>
//                 <h3 className="text-3xl font-bold mt-3 text-gray-900">
//                   {stat.value}
//                 </h3>
//               </div>

//               <div className="p-3 rounded-2xl bg-gray-100">
//                 <stat.icon className={`h-6 w-6 ${stat.color}`} />
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//       {/* Pending Sales */}

//       {/* QUICK ACTIONS */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* LEFT */}
//         <div className="bg-white border border-gray-200 rounded-3xl p-6">
//           <h3 className="text-xl font-semibold mb-6 text-gray-900">
//             Quick Actions
//           </h3>

//           <div className="space-y-4">
//             <button
//               onClick={() => setShowTerminal(true)}
//               disabled={!currentSession?.session}
//               className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl disabled:opacity-50"
//             >
//               <div className="flex items-center">
//                 <ShoppingCart className="w-6 h-6 text-emerald-600 mr-4" />
//                 <div className="text-left">
//                   <p className="font-medium text-gray-900">New Sale</p>
//                   <p className="text-sm text-gray-500">
//                     Process walk-in customer sale
//                   </p>
//                 </div>
//               </div>
//             </button>

//             <button
//               onClick={() => setShowReturnsModal(true)}
//               disabled={!currentSession?.session}
//               className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl disabled:opacity-50"
//             >
//               <div className="flex items-center">
//                 <RotateCcw className="w-6 h-6 text-amber-500 mr-4" />
//                 <div className="text-left">
//                   <p className="font-medium text-gray-900">Process Return</p>
//                   <p className="text-sm text-gray-500">
//                     Handle customer returns
//                   </p>
//                 </div>
//               </div>
//             </button>
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="bg-white border border-gray-200 rounded-3xl p-6">
//           <h3 className="text-xl font-semibold mb-6 text-gray-900">
//             Operations
//           </h3>

//           <div className="space-y-4">
//             <a
//               href="/sales/customers"
//               className="flex items-center bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl"
//             >
//               <Users className="w-6 h-6 text-blue-500 mr-4" />
//               <div>
//                 <p className="font-medium text-gray-900">Manage Customers</p>
//                 <p className="text-sm text-gray-500">Add/edit customers</p>
//               </div>
//             </a>

//             <a
//               href="/inventory/items"
//               className="flex items-center bg-gray-50 hover:bg-gray-100 p-5 rounded-2xl"
//             >
//               <Package className="w-6 h-6 text-purple-500 mr-4" />
//               <div>
//                 <p className="font-medium text-gray-900">Inventory</p>
//                 <p className="text-sm text-gray-500">Monitor stock levels</p>
//               </div>
//             </a>
//           </div>
//         </div>
//       </div>

//       {/* MODALS (unchanged) */}
//       {showCreateSessionModal && (
//         <CreatePosSessionModal
//           onClose={() => setShowCreateSessionModal(false)}
//           onSuccess={handleCreateSession}
//         />
//       )}

//       {showTerminal && currentSession?.session && (
//         <PosTerminal
//           session={currentSession.session}
//           onClose={() => setShowTerminal(false)}
//           onSaleComplete={() => {
//             setShowTerminal(false);
//             refetchSession();
//           }}
//         />
//       )}

//       {showReturnsModal && currentSession?.session && (
//         <PosReturnsModal
//           session={currentSession.session}
//           onClose={() => setShowReturnsModal(false)}
//           onReturnComplete={() => {
//             setShowReturnsModal(false);
//             refetchSession();
//           }}
//         />
//       )}

//       <div>
//         {isTerminalOpen &&
//           currentSession?.session(
//             <PosTerminal
//               session={currentSession.session}
//               resumedSale={resumedSale}
//               onClose={() => {
//                 setIsTerminalOpen(false);
//                 setResumedSale(null);
//               }}
//               onSaleComplete={() => {
//                 setIsTerminalOpen(false);
//                 setResumedSale(null);
//                 // refresh queries ...
//               }}
//             />,
//           )}
//         // Render Pending POS Sales List
//         {activeTab === "pending" &&
//           currentSession?.session(
//             <PendingPOSSales
//               session={currentSession.session}
//               onResumeSale={handleResumeSale}
//             />,
//           )}
//       </div>
//     </div>
//   );
// };

// export default PosDashboard;
