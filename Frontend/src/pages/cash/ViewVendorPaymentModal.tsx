import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, managementApi, purchaseApi } from "../../lib/api";
import toast from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

/* ------------------------- ZOD SCHEMA ------------------------- */
const createVendorPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        purchaseId: z.string().optional().nullable(),
        glAccountId: z.string().min(1, "GL Account is required"),
        lineAmount: z.coerce.number().positive("Amount must be positive"),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one payment line is required"),
});

type FormData = z.infer<typeof createVendorPaymentSchema>;

interface Props {
  payment: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ViewVendorPaymentModal = ({ payment, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createVendorPaymentSchema),
    defaultValues: {
      paymentDate:
        payment.paymentDate?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
      vendorId: payment.vendorId || "",
      cashAccountId: payment.cashAccountId || "",
      reference: payment.reference || "",
      notes: payment.notes || "",
      lines: payment.lines?.map((line: any) => ({
        purchaseId: line.purchaseId || null,
        glAccountId: line.glAccountId,
        lineAmount: Number(line.lineAmount),
        description: line.description || "",
      })) || [
        { purchaseId: null, glAccountId: "", lineAmount: 0, description: "" },
      ],
    },
  });

  const selectedVendorId = watch("vendorId");
  const watchedLines = watch("lines");

  /* ------------------------- QUERIES -------------------------- */
  const { data: vendors } = useQuery({
    queryKey: ["vendor-for-payment"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-payment"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: vendorPurchases } = useQuery({
    queryKey: ["vendor-purchases", selectedVendorId],
    queryFn: () =>
      selectedVendorId
        ? purchaseApi.getPurchases({
            vendorId: selectedVendorId,
            status: "INVOICED",
            limit: 100,
          })
        : null,
    enabled: !!selectedVendorId,
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
    if (!vendorPurchases?.purchases) return;

    watchedLines.forEach((line, index) => {
      if (!line.purchaseId) return;

      const purchase = vendorPurchases.purchases.find(
        (s: any) => String(s.id) === String(line.purchaseId),
      );
      if (purchase) {
        setValue(`lines.${index}.lineAmount`, Number(purchase.totalAmount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
  }, [watchedLines, vendorPurchases, setValue]);

  /* ----------------------- TOTAL CALC -------------------------- */
  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  /* ----------------------- SUBMIT ----------------------------- */
  const onSubmit = async (data: FormData) => {
    try {
      await cashApi.updateVendorPayment(payment.id, data);
      toast.success("Vendor payment updated successfully!");
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
            <h3 className="text-lg font-semibold">View Vendor Payment</h3>

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
              {/* Vendor + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Vendor *
                  </label>

                  <input
                    disabled
                    value={
                      payment.vendor?.name ||
                      vendors?.vendors.find(
                        (v: any) => v.id === payment.vendorId,
                      )?.name ||
                      ""
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />

                  {/* <VendorSelect
                    vendors={vendors?.vendors || []}
                    value={watch("vendorId")}
                    onChange={(v) => setValue("vendorId", v)}
                  /> */}

                  {errors.vendorId && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.vendorId.message}
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
                    disabled
                    {...register("cashAccountId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
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
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Payment Lines
                  </h4>
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
                        {/* Purchase */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Purchase (optional)
                          </label>

                          <select
                            disabled
                            {...register(`lines.${index}.purchaseId`)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                          >
                            <option value="">Select purchase</option>

                            {vendorPurchases?.purchases?.map((s: any) => (
                              <option key={s.id} value={s.id}>
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
                        <div className="lg:col-span-3">
                          <label className="text-sm font-medium text-gray-700">
                            Description
                          </label>

                          <input
                            disabled
                            {...register(`lines.${index}.description`)}
                            className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
                          />
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

export default ViewVendorPaymentModal;
