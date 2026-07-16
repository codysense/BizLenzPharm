import React, { ReactNode, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Package,
  Factory,
  ShoppingCart,
  TrendingUp,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Building,
  PackageSearchIcon,
  LayoutDashboard,
  Landmark,
  Airplay,
  NotebookText,
  RatioIcon,
  BookText,
  OrbitIcon,
  NotebookTabs,
  NotebookPenIcon,
} from "lucide-react";
import { Monitor } from "lucide-react";
import toast from "react-hot-toast";
import { CircleStackIcon } from "@heroicons/react/20/solid";
import bizLens_Logo from "../assets/Bizlens logo-nobg.png";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null); // NEW

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
    toast.success("Logout Successfully");
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",
        "Inventory Manager",
        "Assistant Inventory Manager",
        "Production Manager",
        "Accountant",
        "Senior Accountant",
      ],
    },
    {
      name: "Point of Sales",
      href: "/pos",
      icon: Airplay,
      // permission: null,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",
        "POS User",
        "Accountant",
        "Senior Accountant",
      ],
      children: [
        { name: "POS Terminal", href: "/pos" },
        { name: "Sales History", href: "/pos/sales" },
        { name: "Returns", href: "/pos/returns" },
        { name: "Stock Register", href: "/inventory/ledger" },
      ],
    },
    {
      name: "Stock",
      href: "/inventory",
      icon: CircleStackIcon,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",
        "Inventory Manager",
        "Assistant Inventory Manager",
        "Production Manager",
        "Senior Accountant",
      ],
      children: [
        { name: "UOMs", href: "/inventory/uoms" },
        { name: "Items", href: "/inventory/items" },
        { name: "BOMs", href: "/inventory/boms" },
        { name: "Locations", href: "/inventory/locations" },
        { name: "Warehouses", href: "/inventory/warehouses" },
        { name: "OpeningStock", href: "/inventory/openingstock" },
        { name: "Transfers", href: "/inventory/transfers" },
        {
          name: "Ledger",
          href: "/inventory/ledger",
        },
        { name: "Valuation", href: "/inventory/valuation" },
      ],
    },
    // {
    //   name: "Manufacturing",
    //   href: "/production",
    //   icon: OrbitIcon,
    //   requiresRole: [
    //     "General Manager",
    //     "Auditor",
    //     "Manager",

    //     "Production Manager",
    //     "Inventory Manager",
    //     // "Senior Accountant",
    //   ],
    //   children: [
    //     { name: "Orders", href: "/production/orders" },
    //     { name: "WIP Summary", href: "/production/wip" },
    //   ],
    // },
    {
      name: "Purchases",
      href: "/purchases",
      icon: ShoppingCart,
      requiresRole: [
        "Inventory Manager",
        "Assistant Invenotry Manager",
        "General Manager",
        "Auditor",
        "Manager",

        "Senior Accountant",
      ],
      children: [
        { name: "Orders", href: "/purchases/orders" },
        { name: "Vendors", href: "/purchases/vendors" },
        // { name: 'Memos', href: '/purchases/memos' },
      ],
    },
    {
      name: "Sales",
      href: "/sales",
      icon: TrendingUp,
      requiresRole: [
        "Accountant",
        "POS User",
        "General Manager",
        "Auditor",
        "Manager",

        "Senior Accountant",
      ],
      children: [
        { name: "Orders", href: "/sales/orders" },
        { name: "Customers", href: "/sales/customers" },
        { name: "CustomerGroups", href: "/sales/customergroups" },
        //   { name: 'Memos', href: '/sales/memos' },
      ],
    },
    // {
    //   name: "Memo",
    //   href: "/memos",
    //   icon: NotebookPenIcon,
    //   requiresRole: [
    //     "General Manager",
    //     "Auditor",
    //     "Manager",

    //     "Senior Accountant",
    //   ],
    // },
    // {
    //   name: "Journal",
    //   href: "/journal",
    //   icon: NotebookText,
    //   requiresRole: [
    //     "General Manager",
    //     "Auditor",
    //     "Manager",

    //     "Senior Accountant",
    //   ],
    // },
    {
      name: "Stock Adjustment",
      href: "/adjustment",
      icon: RatioIcon,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",

        "Senior Accountant",
      ],
    },
    // {
    //   name: "Assets",
    //   href: "/assets",
    //   icon: Landmark,
    //   children: [
    //     { name: "Dashboard", href: "/assets" },
    //     { name: "Asset Register", href: "/assets/register" },
    //     { name: "Categories", href: "/assets/categories" },
    //   ],
    //   requiresRole: [
    //     "General Manager",
    //     "Auditor",
    //     "Manager",

    //     "Auditor",
    //     "Senior Accountant",
    //   ],
    // },
    {
      name: "Cash Management",
      href: "/cash",
      icon: DollarSign,
      permission: null,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",

        "Accountant",
        "Senior Accountant",
      ],
      children: [
        { name: "Cashbook", href: "/cash/cashbook" },
        { name: "Customer Payments", href: "/cash/customer-payments" },
        { name: "Vendor Payments", href: "/cash/vendor-payments" },
        { name: "Customer Refunds", href: "/cash/customer-refunds" },
        { name: "Vendor Refunds", href: "/cash/vendor-refunds" },
      ],
    },
    {
      name: "Management",
      href: "/management",
      icon: Settings,
      // permission: null,
      requiresRole: [
        "General Manager",
        "Auditor",
        "Manager",

        "Senior Accountant",
      ],
      children: [
        { name: "Company Settings", href: "/management/company" },
        { name: "System Settings", href: "/management/settings" },
        { name: "Fiscal Calendar", href: "/management/fiscal" },
        { name: "Chart of Accounts", href: "/management/chart-of-accounts" },
        { name: "Cash Accounts", href: "/management/cash-accounts" },
        { name: "Approval Flows", href: "/management/approvals" },
        { name: "Role Management", href: "/management/roles" },
        { name: "User Management", href: "/management/users" },
        { name: "Audit Log", href: "/management/audit-log" },
      ],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BookText,
      // permission: null,
      requiresRole: [
        "Inventory Manager",
        "Assistant Inventory Manager",
        "Production Manager",
        "Accountant",
        "General Manager",
        "Auditor",
        "Manager",

        "Auditor",
        "Senior Accountant",
      ],
    },
    // {
    //   name: "Metabase Dashboard",
    //   href: "/metabase-dashboard",
    //   icon: FileText,
    //   requiresRole: [ "Inventory Manager",
    //     "Assistant Inventory Manager",
    //     "Production Manager",
    //     "Accountant",
    //     "General Manager","Auditor","Manager",,
    //     "Auditor",]
    // },
    // {
    //   name: 'Users',
    //   href: '/users',
    //   icon: Users,
    //   permission: null,
    //   requiresRole: ['CFO', 'General Manager']
    // }
  ];

  const filteredNavigation = navigation.filter(
    (item) =>
      // (!item.permission || user?.permissions.includes(item.permission)) &&
      !item.requiresRole ||
      item.requiresRole.some((role) => user?.roles.includes(role)),
  );

  const NavigationItem = ({
    item,
    mobile = false,
  }: {
    item: any;
    mobile?: boolean;
  }) => {
    const isActive =
      location.pathname === item.href ||
      (item.children &&
        item.children.some((child: any) => location.pathname === child.href));

    if (item.children) {
      const isOpen = openGroup === item.name;

      return (
        <div className="space-y-1">
          <button
            onClick={() => setOpenGroup(isOpen ? null : item.name)}
            className={`flex w-full items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-emerald-100 hover:text-emerald-600"
            }`}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </button>

          {isOpen && (
            <div className="ml-8 space-y-1">
              {item.children.map((child: any) => (
                <Link
                  key={child.href}
                  to={child.href}
                  className={`block px-2 py-2 text-sm rounded-md ${
                    location.pathname === child.href
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-emerald-100 hover:text-emerald-600"
                  }`}
                  onClick={() => mobile && setSidebarOpen(false)}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.href}
        className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          isActive
            ? "bg-emerald-600 text-white"
            : "text-gray-600 hover:bg-emerald-100 hover:text-emerald-600"
        }`}
        onClick={() => mobile && setSidebarOpen(false)}
      >
        <item.icon className="mr-3 h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between h-16 px-6 border-b">
              <h1 className="text-xl font-semibold text-gray-900">BizLenZ</h1>

              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <nav className="mt-6 px-6 space-y-1">
              {filteredNavigation.map((item) => (
                <NavigationItem key={item.name} item={item} mobile={true} />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-6 border-b">
            <img
              src={bizLens_Logo}
              alt="BizLenZ"
              className="h-24 object-contain"
            />
          </div>

          {/* Navigation */}
          <nav className="mt-6 px-6 pb-4 space-y-1 flex-1">
            {filteredNavigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* TOP NAVBAR */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm py-2">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-gray-600" />
            </button>

            {/* User section */}
            <div className="flex items-center space-x-4 ml-auto">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {user?.name}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.roles.join(", ")}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 transition"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <main className="flex-1 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
