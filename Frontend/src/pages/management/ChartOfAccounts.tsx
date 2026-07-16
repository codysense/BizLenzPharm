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
  BookOpen,
  Building,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
} from "lucide-react";
import { managementApi } from "../../lib/api";
import { ChartOfAccount } from "../../types/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";

const createAccountSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Account name is required"),
  accountType: z.enum([
    "INCOME",
    "EXPENSES",
    "OTHER_INCOME",
    "CURRENT_ASSETS",
    "NON_CURRENT_ASSETS",
    "CURRENT_LIABILITY",
    "NON_CURRENT_LIABILITY",
    "COST_OF_SALES",
    "TRADE_RECEIVABLES",
    "TRADE_PAYABLES",
    "EQUITY",
  ]),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

type CreateAccountFormData = z.infer<typeof createAccountSchema>;

const ChartOfAccounts = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(
    null,
  );
  const [selectedType, setSelectedType] = useState("");
  const queryClient = useQueryClient();

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAccountFormData) =>
      managementApi.createChartAccount(data),
    onSuccess: () => {
      toast.success("Chart account created successfully");
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      setShowCreateModal(false);
      reset();
    },
    onError: (error) => {
      console.error("Create account error:", error);
      toast.error("Failed to create chart account");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      managementApi.updateChartAccount(id, data),
    onSuccess: () => {
      toast.success("Chart account updated successfully");
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      setEditingAccount(null);
      reset();
    },
    onError: (error) => {
      console.error("Update account error:", error);
      toast.error("Failed to update chart account");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managementApi.deleteChartAccount(id),
    onSuccess: () => {
      toast.success("Chart account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Delete account error:", error);
      toast.error("Failed to delete chart account");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
  });

  const accountTypes = [
    {
      value: "CURRENT_ASSETS",
      label: "Current Assets",
      icon: TrendingUp,
      color: "text-green-600",
      range: "1000-1199",
    },
    {
      value: "TRADE_RECEIVABLES",
      label: "Trade Receivables",
      icon: Users,
      color: "text-blue-600",
      range: "1200-1299",
    },
    {
      value: "NON_CURRENT_ASSETS",
      label: "Non-Current Assets",
      icon: Building,
      color: "text-blue-700",
      range: "1500-1599",
    },
    {
      value: "CURRENT_LIABILITY",
      label: "Current Liability",
      icon: TrendingDown,
      color: "text-red-600",
      range: "2000-2099",
    },
    {
      value: "TRADE_PAYABLES",
      label: "Trade Payables",
      icon: CreditCard,
      color: "text-red-700",
      range: "2100-2199",
    },
    {
      value: "NON_CURRENT_LIABILITY",
      label: "Non-Current Liability",
      icon: TrendingDown,
      color: "text-red-800",
      range: "2500-2999",
    },
    {
      value: "EQUITY",
      label: "Equity",
      icon: DollarSign,
      color: "text-purple-600",
      range: "3000-3999",
    },
    {
      value: "INCOME",
      label: "Income",
      icon: TrendingUp,
      color: "text-green-500",
      range: "4000-4499",
    },
    {
      value: "OTHER_INCOME",
      label: "Other Income",
      icon: TrendingUp,
      color: "text-green-400",
      range: "4500-4999",
    },
    {
      value: "COST_OF_SALES",
      label: "Cost of Sales",
      icon: TrendingDown,
      color: "text-orange-600",
      range: "5000-5999",
    },
    {
      value: "EXPENSES",
      label: "Expenses",
      icon: TrendingDown,
      color: "text-red-500",
      range: "6000-6299",
    },
  ];

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
      cell: (account: ChartOfAccount) => {
        const typeInfo = accountTypes.find(
          (t) => t.value === account.accountType,
        );
        return (
          <div className="flex items-center">
            {typeInfo && (
              <typeInfo.icon className={`h-4 w-4 mr-2 ${typeInfo.color}`} />
            )}
            <StatusBadge
              status={typeInfo?.label || account.accountType}
              variant="info"
            />
          </div>
        );
      },
      width: "w-48",
    },
    {
      key: "description",
      header: "Description",
      cell: (account: ChartOfAccount) => account.description || "-",
      width: "w-64",
    },
    {
      key: "parent",
      header: "Parent Account",
      cell: (account: ChartOfAccount) =>
        account.parent
          ? `${account.parent.code} - ${account.parent.name}`
          : "-",
      width: "w-48",
    },
    {
      key: "_count.journalLines",
      header: "Transactions",
      cell: (account: ChartOfAccount) => account._count?.journalLines || 0,
      width: "w-24",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (account: ChartOfAccount) => (
        <StatusBadge status={account.isActive ? "Active" : "Inactive"} />
      ),
      width: "w-24",
    },
  ];

  const handleEditAccount = (account: ChartOfAccount) => {
    setEditingAccount(account);
    reset({
      code: account.code,
      name: account.name,
      accountType: account.accountType as any,
      description: account.description || "",
      parentId: account.parentId || "",
    });
    setShowCreateModal(true);
  };

  const handleDeleteAccount = (account: ChartOfAccount) => {
    if (confirm(`Are you sure you want to delete account "${account.name}"?`)) {
      deleteMutation.mutate(account.id);
    }
  };

  const onSubmit = (data: CreateAccountFormData) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const actions = (account: ChartOfAccount) => (
    <div className="flex space-x-2">
      <button
        onClick={() => handleEditAccount(account)}
        className="text-blue-600 hover:text-blue-900"
        title="Edit Account"
      >
        <Edit className="h-4 w-4" />
      </button>
      {(account._count?.journalLines || 0) === 0 && (
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
  const filteredAccounts = selectedType
    ? accountsData?.accounts?.filter(
        (acc: ChartOfAccount) => acc.accountType === selectedType,
      ) || []
    : accountsData?.accounts || [];

  // Group accounts by type for stats
  const accountsByType =
    accountsData?.accounts?.reduce((acc: any, account: ChartOfAccount) => {
      if (!acc[account.accountType]) {
        acc[account.accountType] = 0;
      }
      acc[account.accountType]++;
      return acc;
    }, {}) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black/80">
            Chart of Accounts
          </h1>
          <p className="text-gray-600">
            Manage your accounting structure and account codes
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            reset();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Account
        </button>
      </div>

      {/* Account Type Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accountTypes.map((type) => (
          <div
            key={type.value}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <type.icon className={`h-6 w-6 ${type.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {type.label}
                    </dt>
                    <dd className="text-3xl font-bold text-black/80">
                      {accountsByType[type.value] || 0}
                    </dd>
                    <dd className="text-xs text-gray-400">
                      Code Range: {type.range}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Account Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Account Types</option>
              {accountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-gray-400 mr-3" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Chart of Accounts
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
                    {editingAccount ? "Edit Account" : "Create New Account"}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Code{" "}
                      {!editingAccount &&
                        "(Optional - Auto-generated if empty)"}
                    </label>
                    <input
                      {...register("code")}
                      disabled={!!editingAccount}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                      placeholder={
                        editingAccount
                          ? editingAccount.code
                          : "Leave empty for auto-generation"
                      }
                    />
                    {errors.code && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.code.message}
                      </p>
                    )}
                    {editingAccount && (
                      <p className="mt-1 text-sm text-gray-500">
                        Account code cannot be changed after creation
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Name *
                    </label>
                    <input
                      {...register("name")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Office Supplies Expense"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Type *
                    </label>
                    <select
                      {...register("accountType")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select account type</option>
                      {accountTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} ({type.range})
                        </option>
                      ))}
                    </select>
                    {errors.accountType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.accountType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Parent Account (Optional)
                    </label>
                    <select
                      {...register("parentId")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">No parent account</option>
                      {accountsData?.accounts
                        ?.filter(
                          (acc: ChartOfAccount) =>
                            acc.id !== editingAccount?.id,
                        )
                        .map((account: ChartOfAccount) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Account description and purpose"
                    />
                  </div>

                  {!editingAccount && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-900 mb-2">
                        Account Code Generation:
                      </h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>
                          • Account codes are automatically generated based on
                          type
                        </li>
                        <li>• Current Assets: 1000-1199</li>
                        <li>• Trade Receivables: 1200-1299</li>
                        <li>• Non-Current Assets: 1500-1999</li>
                        <li>• Current Liabilities: 2000-2099</li>
                        <li>• Trade Payables: 2100-2199</li>
                        <li>• Non-Current Liabilities: 2500-2999</li>
                        <li>• Equity: 3000-3999</li>
                        <li>• Income: 4000-4499</li>
                        <li>• Other Income: 4500-4999</li>
                        <li>• Cost of Sales: 5000-5999</li>
                        <li>• Expenses: 6000-8999</li>
                      </ul>
                    </div>
                  )}

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

export default ChartOfAccounts;
