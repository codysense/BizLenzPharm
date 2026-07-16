import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const createCashTransactionSchema = z.object({
  cashAccountId: z.string(),
  transactionType: z.enum(["RECEIPT", "PAYMENT"]),
  //description: z.string().optional(),
  transactionDate: z.string(),
  reference: z.string().optional(),
  refType: z.string().optional(),
  refId: z.string().optional(),
  transactionLines: z
    .array(
      z.object({
        glAccountId: z.string(),
        contraAccountId: z.string().optional(),
        lineAmount: z.coerce.number().positive(),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one transaction line is required"),
});

type CreateCashTransactionFormData = z.infer<
  typeof createCashTransactionSchema
>;

interface CreateCashTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCashTransactionModal = ({
  onClose,
  onSuccess,
}: CreateCashTransactionModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateCashTransactionFormData>({
    resolver: zodResolver(createCashTransactionSchema),
    shouldUnregister: true,
    defaultValues: {
      transactionDate: new Date().toISOString().split("T")[0],
      transactionType: "RECEIPT",
      transactionLines: [{ glAccountId: "", lineAmount: 0, description: "" }],
    },
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-transaction"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const watchedType = watch("transactionType");

  useEffect(() => {
    setValue("transactionLines", [
      { glAccountId: "", lineAmount: 0, description: "" },
    ]);

    setValue("cashAccountId", "");
  }, [watchedType]);

  const onSubmit = async (data: CreateCashTransactionFormData) => {
    try {
      await cashApi.createCashTransaction(data);
      toast.success("Cash transaction recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create cash transaction error:", error);
    }
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "transactionLines",
  });

  const watchedLines = watch("transactionLines");
  const selectedCashAccountId = watch("cashAccountId");
  const selectedType = watch("transactionType");

  const selectedCashAccount = cashAccounts?.accounts.find(
    (acc: any) => acc.id === selectedCashAccountId,
  );

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.lineAmount || 0);
    }, 0);
  };

  const hasInsufficientBalance =
    selectedCashAccount &&
    selectedType === "PAYMENT" &&
    calculateTotal() > Number(selectedCashAccount.balance);

  // console.log(chartAccounts)
  // Filter GL accounts based on transaction type
  // const getFilteredGLAccounts = () => {
  //   if (!chartAccounts?.accounts) return [];

  //   if (watchedType === 'RECEIPT') {
  //     // For receipts, show income and receivable accounts
  //     return chartAccounts.accounts.filter((acc: any) =>
  //       ['INCOME', 'OTHER_INCOME', 'TRADE_RECEIVABLES'].includes(acc.accountType)
  //     );
  //   } else {
  //     // For payments, show expense and payable accounts
  //     return chartAccounts.accounts.filter((acc: any) =>
  //       ['EXPENSES', 'COST_OF_SALES', 'TRADE_PAYABLES', 'CURRENT_LIABILITY'].includes(acc.accountType)
  //     );
  //   }
  // };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header (Blue Gradient) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Record Cash Transaction
              </h3>
              <p className="text-xs text-blue-100">
                Manage cash inflow and outflow entries
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white px-6 py-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Transaction Type + Date */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Transaction Type *
                    </label>
                    <select
                      {...register("transactionType")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="RECEIPT">Cash Receipt</option>
                      <option value="PAYMENT">Cash Payment</option>
                    </select>
                    {errors.transactionType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.transactionType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Transaction Date *
                    </label>
                    <input
                      {...register("transactionDate")}
                      type="date"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.transactionDate && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.transactionDate.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cash Account + Reference */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cash Account *
                    </label>
                    <select
                      {...register("cashAccountId")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select cash account</option>
                      {cashAccounts?.accounts?.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name} (₦
                          {Number(account.balance).toLocaleString()})
                        </option>
                      ))}
                    </select>

                    {errors.cashAccountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.cashAccountId.message}
                      </p>
                    )}

                    {hasInsufficientBalance && (
                      <p className="mt-1 text-xs text-red-500">
                        Insufficient balance (₦
                        {Number(selectedCashAccount?.balance).toLocaleString()})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reference
                    </label>
                    <input
                      {...register("reference")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Cheque, transfer ref, etc."
                    />
                  </div>
                </div>

                {/* Transaction Lines */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Transaction Items
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        append({
                          glAccountId: "",
                          lineAmount: 0,
                          description: "",
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Line
                    </button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-gray-50 border rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                          {/* GL Account */}
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              GL Account
                            </label>

                            <ChartAccountSelect
                              accounts={chartAccounts?.accounts || []}
                              value={watch(
                                `transactionLines.${index}.glAccountId`,
                              )}
                              onChange={(val) =>
                                setValue(
                                  `transactionLines.${index}.glAccountId`,
                                  val,
                                )
                              }
                            />

                            {errors.transactionLines?.[index]?.glAccountId && (
                              <p className="text-sm text-red-600 mt-1">
                                {
                                  errors.transactionLines[index]?.glAccountId
                                    ?.message
                                }
                              </p>
                            )}
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Amount
                            </label>
                            <input
                              {...register(
                                `transactionLines.${index}.lineAmount`,
                                {
                                  valueAsNumber: true,
                                },
                              )}
                              type="number"
                              step="0.01"
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <input
                              {...register(
                                `transactionLines.${index}.description`,
                              )}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>

                          {/* Remove */}
                          <div className="flex items-end">
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="px-3 py-2 text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-4 bg-blue-50 p-4 rounded-lg flex justify-between">
                    <span className="font-medium text-gray-900">
                      Total Amount:
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      ₦{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || hasInsufficientBalance}
                className={`px-4 py-2 rounded-md text-white font-medium transition
              ${
                watchedType === "RECEIPT"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled:opacity-50`}
              >
                {isSubmitting
                  ? "Processing..."
                  : watchedType === "RECEIPT"
                    ? "Record Receipt"
                    : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCashTransactionModal;
