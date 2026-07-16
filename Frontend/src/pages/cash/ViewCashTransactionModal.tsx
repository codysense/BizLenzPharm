import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const editCashTransactionSchema = z.object({
  cashAccountId: z.string(),
  transactionType: z.enum(["RECEIPT", "PAYMENT"]),
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

type EditCashTransactionFormData = z.infer<typeof editCashTransactionSchema>;

interface ViewCashTransactionModalProps {
  transaction: any; // transaction to edit
  onClose: () => void;
  onSuccess: () => void;
}

const ViewCashTransactionModal = ({
  transaction,
  onClose,
  onSuccess,
}: ViewCashTransactionModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCashTransactionFormData>({
    resolver: zodResolver(editCashTransactionSchema),
    defaultValues: {
      transactionDate:
        transaction.transactionDate?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
      transactionType: transaction.transactionType || "RECEIPT",
      cashAccountId: transaction.cashAccountId || "",
      reference: transaction.reference || "",
      refType: transaction.refType || "",
      refId: transaction.refId || "",
      transactionLines: transaction.transactionLines?.map((line: any) => ({
        glAccountId: line.glAccountId,
        contraAccountId: line.contraAccountId || "",
        lineAmount: line.lineAmount,
        description: line.description || "",
      })) || [{ glAccountId: "", lineAmount: 0, description: "" }],
    },
  });

  // refetch chart accounts and cash accounts
  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-transaction"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  const watchedType = watch("transactionType");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "transactionLines",
  });

  const watchedLines = watch("transactionLines");

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  const onSubmit = async (data: EditCashTransactionFormData) => {
    try {
      await cashApi.updateCashTransaction(transaction.id, data);
      toast.success("Cash transaction updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update cash transaction error:", error);
      toast.error("Failed to update transaction");
    }
  };

  useEffect(() => {
    if (transaction) {
      reset({
        transactionDate: transaction.transactionDate?.split("T")[0],
        transactionType: transaction.transactionType,
        cashAccountId: transaction.cashAccountId,
        reference: transaction.reference || "",
        refType: transaction.refType || "",
        refId: transaction.refId || "",
        transactionLines:
          transaction.transactionLines?.map((line: any) => ({
            glAccountId: line.glAccountId,
            contraAccountId: line.contraAccountId || "",
            lineAmount: line.lineAmount,
            description: line.description || "",
          })) || [],
      });
    }
  }, [transaction, reset]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Wrapper */}
      <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold">View Cash Transaction</h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Transaction Type + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Transaction Type *
                  </label>

                  <select
                    {...register("transactionType")}
                    disabled
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  >
                    <option value="RECEIPT">Cash Receipt</option>
                    <option value="PAYMENT">Cash Payment</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Transaction Date *
                  </label>

                  <input
                    readOnly
                    {...register("transactionDate")}
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>
              </div>

              {/* Cash Account + Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>

                  <select
                    disabled
                    {...register("cashAccountId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  >
                    <option value="">Select cash account</option>

                    {cashAccounts?.accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name} (₦
                        {Number(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Reference
                  </label>

                  <input
                    readOnly
                    {...register("reference")}
                    placeholder="Check number, transfer reference, etc."
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>
              </div>

              {/* Transaction Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Transaction Items
                  </h4>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-gray-50 border border-gray-100 rounded-xl p-5"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        {/* GL Account */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            GL Account *
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
                        </div>

                        {/* Line Amount */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Line Amount *
                          </label>

                          <input
                            readOnly
                            {...register(
                              `transactionLines.${index}.lineAmount`,
                              {
                                valueAsNumber: true,
                              },
                            )}
                            type="number"
                            step="0.01"
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Description
                          </label>

                          <input
                            readOnly
                            {...register(
                              `transactionLines.${index}.description`,
                            )}
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50"
                          />
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-end">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="w-full lg:w-auto inline-flex items-center justify-center px-4 py-2 border rounded-lg bg-white text-gray-500 hover:bg-gray-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">
                    Total Amount:
                  </span>

                  <span className="text-2xl font-bold text-blue-600">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl sticky bottom-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ViewCashTransactionModal;
