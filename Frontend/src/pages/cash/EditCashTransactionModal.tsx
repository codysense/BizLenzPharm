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

interface EditCashTransactionModalProps {
  transaction: any; // transaction to edit
  onClose: () => void;
  onSuccess: () => void;
}

const EditCashTransactionModal = ({
  transaction,
  onClose,
  onSuccess,
}: EditCashTransactionModalProps) => {
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* MODAL WRAPPER */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10 text-center sm:p-0">
        <div className="relative w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Edit Cash Transaction
              </h3>
              <p className="text-xs text-indigo-100">
                Modify financial transaction entries
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* BODY */}
          <div className="bg-white px-6 py-6 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* TYPE + DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Type
                  </label>

                  <select
                    {...register("transactionType")}
                    disabled
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 cursor-not-allowed"
                  >
                    <option value="RECEIPT">Cash Receipt</option>
                    <option value="PAYMENT">Cash Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Date
                  </label>

                  <input
                    {...register("transactionDate")}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                </div>
              </div>

              {/* CASH + REFERENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account
                  </label>

                  <select
                    {...register("cashAccountId")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <option value="">Select account</option>

                    {cashAccounts?.accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name} (₦
                        {Number(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reference
                  </label>

                  <input
                    {...register("reference")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Cheque / transfer / ref"
                  />
                </div>
              </div>

              {/* TRANSACTION LINES */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-gray-900">
                    Transaction Lines
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
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </button>
                </div>

                {/* LINE ITEMS */}
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl bg-gray-50 border border-gray-100 p-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      {/* GL ACCOUNT */}
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          GL Account *
                        </label>

                        <ChartAccountSelect
                          accounts={chartAccounts?.accounts || []}
                          value={watch(`transactionLines.${index}.glAccountId`)}
                          onChange={(val) =>
                            setValue(
                              `transactionLines.${index}.glAccountId`,
                              val,
                            )
                          }
                        />
                      </div>

                      {/* AMOUNT */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Amount
                        </label>

                        <input
                          {...register(`transactionLines.${index}.lineAmount`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.01"
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                        />
                      </div>

                      {/* DESCRIPTION */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Description
                        </label>

                        <input
                          {...register(`transactionLines.${index}.description`)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                        />
                      </div>

                      {/* REMOVE */}
                      <div className="flex items-end">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-3 rounded-lg border bg-white hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    Total Amount
                  </span>

                  <span className="text-2xl font-bold text-blue-700">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-lg text-white font-medium shadow-md transition
                  ${
                    watchedType === "RECEIPT"
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90"
                      : "bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Update Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCashTransactionModal;
