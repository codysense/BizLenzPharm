import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  DollarSign,
  Building,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { cashApi, inventoryApi, managementApi } from "../../lib/api";
import { CashAccount } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";

const createCashAccountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  accountType: z.enum(["CASH", "BANK"]),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  glAccountId: z.string().min(1, "GL Account is required"),
  balance: z.number().default(0),
  warehouseId: z.string().optional(),
});

const updateCashAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  accountType: z.enum(["CASH", "BANK"]),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  glAccountId: z.string().min(1, "GL Account is required"),
  balance: z.number(),
  isActive: z.boolean().default(true),
  warehouseId: z.string().optional(),
});

type CreateCashAccountFormData = z.infer<typeof createCashAccountSchema>;
type UpdateCashAccountFormData = z.infer<typeof updateCashAccountSchema>;

const CashAccountManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(
    null,
  );
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const queryClient = useQueryClient();

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["cash-accounts-management"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-cashAccount"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-cash"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCashAccountFormData) =>
      cashApi.createCashAccount(data),
    onSuccess: () => {
      toast.success("Cash account created successfully");
      queryClient.invalidateQueries({ queryKey: ["cash-accounts-management"] });
      setShowCreateModal(false);
      reset();
    },
    onError: (error) => {
      console.error("Create cash account error:", error);
      toast.error("Failed to create cash account");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCashAccountFormData;
    }) => cashApi.updateCashAccount(id, data),
    onSuccess: () => {
      toast.success("Cash account updated successfully");
      queryClient.invalidateQueries({ queryKey: ["cash-accounts-management"] });
      setEditingAccount(null);
      reset();
    },
    onError: (error) => {
      console.error("Update cash account error:", error);
      toast.error("Failed to update cash account");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cashApi.deleteCashAccount(id),
    onSuccess: () => {
      toast.success("Cash account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["cash-accounts-management"] });
    },
    onError: (error) => {
      console.error("Delete cash account error:", error);
      toast.error("Failed to delete cash account");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      cashApi.updateCashAccount(id, { isActive }),
    onSuccess: () => {
      toast.success("Cash account status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["cash-accounts-management"] });
    },
    onError: (error) => {
      console.error("Toggle cash account status error:", error);
      toast.error("Failed to update cash account status");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCashAccountFormData | UpdateCashAccountFormData>({
    resolver: zodResolver(
      editingAccount ? updateCashAccountSchema : createCashAccountSchema,
    ),
  });

  const watchedAccountType = watch("accountType");

  const columns = [
    {
      key: "code",
      header: "Account Code",
      width: "w-32",
    },
    {
      key: "name",
      header: "Account Name",
      width: "w-64",
    },
    {
      key: "accountType",
      header: "Type",
      cell: (account: CashAccount) => (
        <div className="flex items-center">
          {account.accountType === "CASH" ? (
            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Building className="h-4 w-4 mr-2 text-blue-600" />
          )}
          <StatusBadge
            status={account.accountType}
            variant={account.accountType === "CASH" ? "success" : "info"}
          />
        </div>
      ),
      width: "w-32",
    },
    {
      key: "accountNumber",
      header: "Account Number",
      cell: (account: CashAccount) => account.accountNumber || "-",
      width: "w-40",
    },
    {
      key: "bankName",
      header: "Bank Name",
      cell: (account: CashAccount) => account.bankName || "-",
      width: "w-48",
    },
    {
      key: "balance",
      header: "Balance",
      cell: (account: CashAccount) => (
        <span
          className={`font-semibold ${account.balance >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          ₦{Number(account.balance).toLocaleString()}
        </span>
      ),
      width: "w-32",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (account: CashAccount) => (
        <StatusBadge status={account.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (account: CashAccount) =>
        new Date(account.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleEditAccount = (account: CashAccount) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      accountType: account.accountType as "CASH" | "BANK",
      accountNumber: account.accountNumber || "",
      bankName: account.bankName || "",
      glAccountId: account.glAccountId || "",
      balance: Number(account.balance),
      isActive: account.isActive,
      warehouseId: account.warehouseId,
    });
    setShowCreateModal(true);
  };

  const handleDeleteAccount = (account: CashAccount) => {
    if (
      confirm(`Are you sure you want to delete cash account "${account.name}"?`)
    ) {
      deleteMutation.mutate(account.id);
    }
  };

  const handleToggleStatus = (account: CashAccount) => {
    toggleStatusMutation.mutate({
      id: account.id,
      isActive: !account.isActive,
    });
  };

  const onSubmit = (
    data: CreateCashAccountFormData | UpdateCashAccountFormData,
  ) => {
    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        data: data as UpdateCashAccountFormData,
      });
    } else {
      createMutation.mutate(data as CreateCashAccountFormData);
    }
  };

  const actions = (account: CashAccount) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handleEditAccount(account)}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Account"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleToggleStatus(account)}
        className={`${account.isActive ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}
        title={account.isActive ? "Deactivate Account" : "Activate Account"}
      >
        {account.isActive ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
      {Number(account.balance) === 0 && (
        <button
          onClick={() => handleDeleteAccount(account)}
          className="text-red-600 hover:text-red-900"
          title="Delete Account"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // Filter accounts by type
  const filteredAccounts = accountTypeFilter
    ? accountsData?.accounts?.filter(
        (acc: CashAccount) => acc.accountType === accountTypeFilter,
      ) || []
    : accountsData?.accounts || [];

  // Calculate summary statistics
  const totalCashAccounts =
    accountsData?.accounts?.filter(
      (acc: CashAccount) => acc.accountType === "CASH",
    ).length || 0;
  const totalBankAccounts =
    accountsData?.accounts?.filter(
      (acc: CashAccount) => acc.accountType === "BANK",
    ).length || 0;
  const totalBalance =
    accountsData?.accounts?.reduce(
      (sum: number, acc: CashAccount) => sum + Number(acc.balance),
      0,
    ) || 0;
  const activeAccounts =
    accountsData?.accounts?.filter((acc: CashAccount) => acc.isActive).length ||
    0;

  // Get GL accounts for cash/bank
  const cashGLAccounts =
    chartAccounts?.accounts?.filter(
      (acc: any) =>
        ["CURRENT_ASSETS"].includes(acc.accountType) &&
        (acc.name.toLowerCase().includes("cash") ||
          acc.name.toLowerCase().includes("bank")),
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">
            Cash Account Management
          </h1>
          <p className="text-gray-600">
            Manage cash and bank accounts for your organization
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            reset({
              code: "",
              name: "",
              accountType: "CASH",
              accountNumber: "",
              bankName: "",
              glAccountId: "",
              balance: 0,
            });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Cash Account
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cash Accounts
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {totalCashAccounts}
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
                <Building className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Bank Accounts
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {totalBankAccounts}
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
                <CreditCard className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Balance
                  </dt>
                  <dd
                    className={`text-2xl font-bold ${totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    ₦{totalBalance.toLocaleString()}
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
                <Eye className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Accounts
                  </dt>
                  <dd className="text-2xl font-bold text-black/80">
                    {activeAccounts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Account Type
            </label>
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Account Types</option>
              <option value="CASH">Cash Accounts</option>
              <option value="BANK">Bank Accounts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Cash & Bank Accounts
            </h3>
          </div>
        </div>
        <div className="p-6">
          <DataTable
            data={filteredAccounts}
            columns={columns}
            loading={isLoading}
            actions={actions}
          />
        </div>
      </div>

      {/* Create/Edit Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingAccount
                      ? "Edit Cash Account"
                      : "Create New Cash Account"}
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {editingAccount && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="text-sm text-blue-800">
                        <strong>Current Account Code:</strong>{" "}
                        {editingAccount.code}
                      </div>
                    </div>
                  )}

                  {!editingAccount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Account Code *
                      </label>
                      <input
                        {...register("code")}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., CASH-001, BANK-001"
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.code.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Name *
                    </label>
                    <input
                      {...register("name")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Petty Cash, First Bank Current Account"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Warehouse
                    </label>
                    <select
                      {...register(`warehouseId`)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses?.warehouses?.map((warehouse: any) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </option>
                      ))}
                    </select>
                    {/* {errors.deliveryLines?.[index]?.warehouseId && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.deliveryLines[index]?.warehouseId?.message}
                              </p>
                            )} */}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Type *
                    </label>
                    <select
                      {...register("accountType")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="CASH">Cash Account</option>
                      <option value="BANK">Bank Account</option>
                    </select>
                    {errors.accountType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.accountType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      GL Account *
                    </label>
                    <select
                      {...register("glAccountId")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select GL account</option>
                      {cashGLAccounts.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                    {errors.glAccountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.glAccountId.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Links this cash account to the general ledger for proper
                      accounting
                    </p>
                  </div>

                  {watchedAccountType === "BANK" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Bank Name
                        </label>
                        <input
                          {...register("bankName")}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="e.g., First Bank of Nigeria"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Account Number
                        </label>
                        <input
                          {...register("accountNumber")}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="e.g., 1234567890"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Opening Balance
                    </label>
                    <input
                      {...register("balance", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                    {errors.balance && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.balance.message}
                      </p>
                    )}
                  </div>

                  {editingAccount && (
                    <div className="flex items-center">
                      <input
                        {...register("isActive")}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Active Account
                      </label>
                    </div>
                  )}

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Important Notes:
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Cash accounts track physical cash on hand</li>
                      <li>
                        • Bank accounts require bank name and account number
                      </li>
                      <li>• GL account links this to your chart of accounts</li>
                      <li>
                        • Opening balance affects your financial statements
                      </li>
                      {editingAccount && (
                        <li>
                          • Deactivating an account prevents new transactions
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting
                        ? "Saving..."
                        : editingAccount
                          ? "Update Account"
                          : "Create Account"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashAccountManagement;
