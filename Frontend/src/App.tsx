import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";

// Components
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Inventory Pages
import UOMs from "./pages/inventory/UOMs";
import Items from "./pages/inventory/Items";
import BOMs from "./pages/inventory/BOMs";
import Locations from "./pages/inventory/Locations";
import Warehouses from "./pages/inventory/Warehouses";
import OpeningStock from "./pages/inventory/OpeningStocks";
import InventoryTransfer from "./pages/inventory/InventoryTransfer";
import InventoryLedger from "./pages/inventory/Ledger";
import InventoryValuation from "./pages/inventory/Valuation";

// Purchase Pages
import PurchaseOrders from "./pages/purchases/Orders";
import Vendors from "./pages/purchases/Vendors";
// import Memos from './pages/purchases/PurchaseMemosPage';

// Sales Pages
import SalesOrders from "./pages/sales/Orders";
import Customers from "./pages/sales/Customers";
import SalesMemos from "./pages/sales/SalesMemosPage";
import CustomerGroups from "./pages/sales/CustomerGroups";

// Production Pages
import ProductionOrders from "./pages/production/Orders";
import WipSummary from "./pages/production/WipSummary";

// Reports
import Reports from "./pages/Reports";

//metabase
import MetabaseDashboard from "./pages/MetabaseDashboard";

// User Management
import UserManagement from "./pages/UserManagement";

// Cash Management Pages
import Cashbook from "./pages/cash/Cashbook";
import CustomerPayments from "./pages/cash/CustomerPayments";
import CustomerRefunds from "./pages/cash/CustomerRefunds";
import VendorPayments from "./pages/cash/VendorPayments";
import SalesReceipts from "./pages/cash/SalesReceipts";
import PurchasePayments from "./pages/cash/PurchasePayments";
import VendorRefunds from "./pages/cash/VendorRefunds";

// Management Pages
import CompanySettings from "./pages/management/CompanySettings";
import SystemSettings from "./pages/management/SystemSettings";
import FiscalCalendar from "./pages/management/FiscalCalendar";
import ApprovalFlows from "./pages/management/ApprovalFlows";
import RoleManagement from "./pages/management/RoleManagement";
import EnhancedUserManagement from "./pages/management/EnhancedUserManagement";
import ChartOfAccounts from "./pages/management/ChartOfAccounts";
import CashAccountManagement from "./pages/management/CashAccountManagement";
import AuditLog from "./pages/management/Auditlog";

// Asset Pages
import AssetDashboard from "./pages/assets/AssetDashboard";
import AssetRegister from "./pages/assets/AssetRegister";
import AssetCategories from "./pages/assets/AssetCategories";

// POS Pages
import PosDashboard from "./pages/pos/PosDashboard";
import PosSalesHistory from "./pages/pos/PosSalesHistory";
import PosReturnsHistory from "./pages/pos/PosReturnsHistory";

//Memo Pages
import { Memos } from "./pages/memo/Memos";

//Journal Pages
import { Journals } from "./pages/journals/journals";
// import CreateAdjustmentModal from './pages/stockAdjustment/createAdjustmentModal';
import { Adjustments } from "./pages/stockAdjustment/Adjusments";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// src/auth/rolePermissions.ts
const ROLE_PERMISSIONS: Record<string, string[]> = {
  "POS User": ["dashboard", "pos", "sales", "inventory"],

  "Inventory Manager": ["dashboard", "inventory", "purchases"],
  "Assistant Inventory Manager": ["dashboard", "inventory", "purchases"],

  "Production Manager": ["dashboard", "production", "inventory"],

  "General Manager": ["*"],
  "Senior Accountant": ["*"],
  Auditor: ["*"],
  Manager: ["*"],
  Accountant: ["dashboard", "sales", "cash"],
};

// function ProtectedRoute({ children }: { children: React.ReactNode }) {
//   const { isAuthenticated } = useAuthStore();

//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   return <Layout>{children}</Layout>;
// }

function ProtectedRoute({
  children,
  allowedModules,
}: {
  children: React.ReactNode;
  allowedModules: string[];
}) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user?.roles ?? [];

  // console.log("User Roles:", userRoles);

  const hasAccess = userRoles.some((role) => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    if (permissions.includes("*")) return true;
    return permissions.some((p) => allowedModules.includes(p));
  });

  // console.log("Has Access:", hasAccess);

  if (!hasAccess && userRoles.includes("POS User")) {
    return <Navigate to="/pos" replace />;
  } else if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  const userRoles = useAuthStore((state) => state.user?.roles || []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route
              path="/login"
              element={
                userRoles.includes("POS User") ? (
                  <Navigate to="/pos" replace />
                ) : isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login />
                )
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute allowedModules={["dashboard"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Inventory Routes */}
            <Route
              path="/inventory/uoms"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <UOMs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <Items />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/boms"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <BOMs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/locations"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <Locations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/warehouses"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <Warehouses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/openingstock"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <OpeningStock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/transfers"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <InventoryTransfer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/ledger"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <InventoryLedger />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/valuation"
              element={
                <ProtectedRoute allowedModules={["inventory", "production"]}>
                  <InventoryValuation />
                </ProtectedRoute>
              }
            />

            {/* Purchase Routes */}
            <Route
              path="/purchases/orders"
              element={
                <ProtectedRoute allowedModules={["inventory", "purchases"]}>
                  <PurchaseOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases/vendors"
              element={
                <ProtectedRoute allowedModules={["inventory", "purchases"]}>
                  <Vendors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases/memos"
              element={
                <ProtectedRoute allowedModules={["inventory", "purchases"]}>
                  <Memos />
                </ProtectedRoute>
              }
            />

            {/* Sales Routes */}
            <Route
              path="/sales/orders"
              element={
                <ProtectedRoute allowedModules={["sales", "pos"]}>
                  <SalesOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/customers"
              element={
                <ProtectedRoute allowedModules={["sales", "pos"]}>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/customergroups"
              element={
                <ProtectedRoute allowedModules={["sales", "pos"]}>
                  <CustomerGroups />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/memos"
              element={
                <ProtectedRoute allowedModules={["sales", "pos"]}>
                  <SalesMemos />
                </ProtectedRoute>
              }
            />

            {/* Production Routes */}
            <Route
              path="/production/orders"
              element={
                <ProtectedRoute allowedModules={["production", "inventory"]}>
                  <ProductionOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/production/wip"
              element={
                <ProtectedRoute allowedModules={["production", "inventory"]}>
                  <WipSummary />
                </ProtectedRoute>
              }
            />

            {/* Reports Routes */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  allowedModules={[
                    "dashboard",
                    "inventory",
                    "sales",
                    "purchases",
                    "production",
                  ]}
                >
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Metabase Dashboard Route */}
            <Route
              path="/metabase-dashboard"
              element={
                <ProtectedRoute allowedModules={["dashboard"]}>
                  <MetabaseDashboard />
                </ProtectedRoute>
              }
            />

            {/* Cash Management Routes */}
            <Route
              path="/assets"
              element={
                <ProtectedRoute allowedModules={["assets"]}>
                  <AssetDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/register"
              element={
                <ProtectedRoute allowedModules={["assets"]}>
                  <AssetRegister />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/categories"
              element={
                <ProtectedRoute allowedModules={["assets"]}>
                  <AssetCategories />
                </ProtectedRoute>
              }
            />

            {/* POS Routes */}
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedModules={["pos"]}>
                  <PosDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/sales"
              element={
                <ProtectedRoute allowedModules={["pos"]}>
                  <PosSalesHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos/returns"
              element={
                <ProtectedRoute allowedModules={["pos"]}>
                  <PosReturnsHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/ledger"
              element={
                <ProtectedRoute allowedModules={["pos", "inventory"]}>
                  <InventoryLedger />
                </ProtectedRoute>
              }
            />

            {/* Cash Management Routes */}
            <Route
              path="/cash/cashbook"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <Cashbook />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/customer-payments"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <CustomerPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/vendor-payments"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <VendorPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/vendor-refunds"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <VendorRefunds />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/sales-receipts"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <SalesReceipts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/purchase-payments"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <PurchasePayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cash/customer-refunds"
              element={
                <ProtectedRoute allowedModules={["cash"]}>
                  <CustomerRefunds />
                </ProtectedRoute>
              }
            />

            {/* User Management Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedModules={["users", "roles"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* Management Routes */}
            <Route
              path="/management/company"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <CompanySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/settings"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/fiscal"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <FiscalCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/chart-of-accounts"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <ChartOfAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/cash-accounts"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <CashAccountManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/approvals"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <ApprovalFlows />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/roles"
              element={
                <ProtectedRoute allowedModules={["roles"]}>
                  <RoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/users"
              element={
                <ProtectedRoute allowedModules={["users"]}>
                  <EnhancedUserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/management/audit-log"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />

            {/* Memo Routes */}
            <Route
              path="/memos"
              element={
                <ProtectedRoute allowedModules={["sales", "purchases"]}>
                  <Memos />
                </ProtectedRoute>
              }
            />

            {/* Adjustment Route */}
            <Route
              path="/adjustment"
              element={
                <ProtectedRoute allowedModules={["inventory"]}>
                  <Adjustments />
                </ProtectedRoute>
              }
            />
            {/* Journal Route */}
            <Route
              path="/journal"
              element={
                <ProtectedRoute allowedModules={["settings"]}>
                  <Journals />
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#4ade80",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
