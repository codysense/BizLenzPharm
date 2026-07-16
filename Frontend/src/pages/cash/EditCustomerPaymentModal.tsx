import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, salesApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { CustomerSelect } from "../../components/CustomerSelect";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

/* ------------------------- ZOD SCHEMA ------------------------- */
const createCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        saleId: z.string().optional().nullable(),
        glAccountId: z.string().min(1, "GL Account is required"),
        lineAmount: z.coerce.number().positive("Amount must be positive"),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one payment line is required"),
});

type FormData = z.infer<typeof createCustomerPaymentSchema>;

interface Props {
  payment: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCustomerPaymentModal = ({ payment, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createCustomerPaymentSchema),
    defaultValues: {
      paymentDate:
        payment.paymentDate?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
      customerId: payment.customerId || "",
      cashAccountId: payment.cashAccountId || "",
      reference: payment.reference || "",
      notes: payment.notes || "",
      lines: payment.lines?.map((line: any) => ({
        saleId: line.saleId || null,
        glAccountId: line.glAccountId,
        lineAmount: Number(line.lineAmount),
        description: line.description || "",
      })) || [
        { saleId: null, glAccountId: "", lineAmount: 0, description: "" },
      ],
    },
  });

  const selectedCustomerId = watch("customerId");
  const watchedLines = watch("lines");

  /* ------------------------- QUERIES -------------------------- */
  const { data: customers } = useQuery({
    queryKey: ["customers-for-payment"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-payment"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? salesApi.getSales({
            customerId: selectedCustomerId,
            status: "INVOICED",
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });

  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  /* ------------------------- FIELD ARRAY ------------------------ */
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  /* --------------------- AUTO-FILL AMOUNT ---------------------- */
  useEffect(() => {
    if (!customerSales?.sales) return;

    watchedLines.forEach((line, index) => {
      if (!line.saleId) return;

      const sale = customerSales.sales.find(
        (s: any) => String(s.id) === String(line.saleId),
      );
      if (sale) {
        setValue(`lines.${index}.lineAmount`, Number(sale.totalAmount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
  }, [watchedLines, customerSales, setValue]);

  /* ----------------------- TOTAL CALC -------------------------- */
  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  /* ----------------------- SUBMIT ----------------------------- */
  const onSubmit = async (data: FormData) => {
    try {
      await cashApi.updateCustomerPayment(payment.id, data);
      toast.success("Customer payment updated successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update payment");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* CENTER WRAPPER */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-5xl">
          {/* MODAL */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* HEADER (GRADIENT) */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">
                Edit Customer Payment
              </h3>

              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* FORM BODY */}
            <div className="p-6 space-y-5 bg-gray-50">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* CUSTOMER + DATE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>

                    <CustomerSelect
                      //customers={customers?.customers || []}
                      value={watch("customerId") || payment.customerId}
                      onChange={(v) => setValue("customerId", v)}
                    />

                    {errors.customerId && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date *
                    </label>

                    <input
                      {...register("paymentDate")}
                      type="date"
                      className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* CASH + REFERENCE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-sm font-medium mb-2">
                      Cash Account *
                    </label>

                    <select
                      {...register("cashAccountId")}
                      className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select cash account</option>
                      {cashAccounts?.accounts?.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name} (₦
                          {Number(a.balance).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-sm font-medium mb-2">
                      Reference
                    </label>

                    <input
                      {...register("reference")}
                      className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                      placeholder="Optional reference"
                    />
                  </div>
                </div>

                {/* LINES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-semibold text-gray-800">
                      Payment Lines
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        append({
                          saleId: null,
                          glAccountId: "",
                          lineAmount: 0,
                          description: "",
                        })
                      }
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Line
                    </button>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-white border rounded-xl p-4 shadow-sm"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-8 gap-4">
                        {/* SALE */}
                        <div className="col-span-2">
                          <label className="text-sm font-medium">
                            Sale (optional)
                          </label>

                          <select
                            {...register(`lines.${index}.saleId`)}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          >
                            <option value="">Select sale</option>
                            {customerSales?.sales?.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                #{s.orderNo} — ₦
                                {Number(s.totalAmount).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* GL */}
                        <div className="col-span-2">
                          <label className="text-sm font-medium">
                            GL Account *
                          </label>

                          <ChartAccountSelect
                            accounts={chartAccounts?.accounts || []}
                            value={watch(`lines.${index}.glAccountId`)}
                            onChange={(v) =>
                              setValue(`lines.${index}.glAccountId`, v)
                            }
                          />
                        </div>

                        {/* AMOUNT */}
                        <div>
                          <label className="text-sm font-medium">
                            Amount *
                          </label>
                          <input
                            {...register(`lines.${index}.lineAmount`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {/* DESC */}
                        <div className="col-span-2">
                          <label className="text-sm font-medium">
                            Description
                          </label>

                          <input
                            {...register(`lines.${index}.description`)}
                            className="mt-1 w-full border rounded-md px-3 py-2"
                          />
                        </div>

                        {/* REMOVE */}
                        <div className="flex items-end">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 border rounded-md hover:bg-red-50 text-red-600"
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                      Total Amount
                    </span>

                    <span className="text-2xl font-bold text-emerald-600">
                      ₦{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-md border bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating..." : "Update Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCustomerPaymentModal;
