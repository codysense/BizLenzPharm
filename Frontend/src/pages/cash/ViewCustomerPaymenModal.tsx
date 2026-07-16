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

const ViewCustomerPaymentModal = ({ payment, onClose, onSuccess }: Props) => {
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

  //console.log("Payment Data:", payment);

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Wrapper */}
      <div className="flex min-h-screen items-start justify-center px-4 py-6 sm:py-10">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold">View Customer Payment</h3>

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
              {/* Customer + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Customer *
                  </label>
                  <input
                    disabled
                    value={payment.customer?.name}
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />

                  {/* <CustomerSelect
                    // customers={customers?.customers || []}
                    value={watch("customerId")}
                    onChange={(c) =>
                      setValue("customerId", c, { shouldValidate: true })
                    }
                  /> */}

                  {errors.customerId && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.customerId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Payment Date *
                  </label>

                  <input
                    disabled
                    {...register("paymentDate")}
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
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
                    {...register("cashAccountId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
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

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Reference
                  </label>

                  <input
                    disabled
                    {...register("reference")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Payment Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Payment Lines
                  </h4>

                  <button
                    type="button"
                    disabled
                    onClick={() =>
                      append({
                        saleId: null,
                        glAccountId: "",
                        lineAmount: 0,
                        description: "",
                      })
                    }
                    className="px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-1 inline" />
                    Add Line
                  </button>
                </div>

                {errors.lines && (
                  <p className="text-red-600 text-sm mb-3">
                    {errors.lines.message}
                  </p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-gray-50 border border-gray-100 rounded-xl p-5"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-8 gap-4">
                        {/* Sale */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Sale (optional)
                          </label>

                          <select
                            {...register(`lines.${index}.saleId`)}
                            className="mt-1 w-full border rounded-lg px-3 py-2"
                          >
                            <option value="">Select sale</option>

                            {customerSales?.sales?.map((s: any) => (
                              <option disabled key={s.id} value={s.id}>
                                #{s.orderNo} — ₦
                                {Number(s.totalAmount).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* GL Account */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
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

                        {/* Amount */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Amount *
                          </label>

                          <input
                            disabled
                            {...register(`lines.${index}.lineAmount`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            step="0.01"
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                          />
                        </div>

                        {/* Description */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Description
                          </label>

                          <input
                            disabled
                            {...register(`lines.${index}.description`)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                          />
                        </div>

                        {/* Remove */}
                        <div className="flex items-end">
                          {fields.length > 1 && (
                            <button
                              disabled
                              type="button"
                              onClick={() => remove(index)}
                              className="w-full lg:w-auto p-3 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
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

              {/* Debug Errors */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <pre className="text-red-600 text-xs overflow-x-auto">
                    {JSON.stringify(errors, null, 2)}
                  </pre>
                </div>
              )}
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

export default ViewCustomerPaymentModal;
