import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, purchaseApi } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";

const createVendorRefundSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  amount: z.number().positive("Amount must be positive"),
  refundDate: z.string().min(1, "Refund date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  purchaseId: z.string().optional(),
});

type CreateVendorRefundFormData = z.infer<typeof createVendorRefundSchema>;

interface CreateVendorRefundModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateVendorRefundModal = ({
  onClose,
  onSuccess,
}: CreateVendorRefundModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateVendorRefundFormData>({
    resolver: zodResolver(createVendorRefundSchema),
    defaultValues: {
      refundDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedVendorId = watch("vendorId");
  const selectedPurchaseId = watch("purchaseId");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-Refund"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-Refund"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: vendorPurchases } = useQuery({
    queryKey: ["vendor-purchases", selectedVendorId],
    queryFn: () =>
      selectedVendorId
        ? purchaseApi.getPurchases({
            vendorId: selectedVendorId,
            status: "PAID",
            limit: 100,
          })
        : null,
    enabled: !!selectedVendorId,
  });

  // Auto-populate amount when purchase is selected
  React.useEffect(() => {
    if (selectedPurchaseId && vendorPurchases?.purchases) {
      const selectedPurchase = vendorPurchases.purchases.find(
        (purchase: any) => purchase.id === selectedPurchaseId,
      );
      if (selectedPurchase) {
        setValue("amount", selectedPurchase.totalAmount);
      }
    }
  }, [selectedPurchaseId, vendorPurchases, setValue]);

  const onSubmit = async (data: CreateVendorRefundFormData) => {
    try {
      await cashApi.createVendorRefund(data);
      toast.success("Vendor Refund recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create vendor Refund error:", error);
    }
  };

  const selectedVendor = vendors?.vendors?.find(
    (vendor: any) => vendor.id === selectedVendorId,
  );
  const selectedPurchase = vendorPurchases?.purchases?.find(
    (purchase: any) => purchase.id === selectedPurchaseId,
  );

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Wrapper */}
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center sm:p-0">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Record Vendor Refund
              </h3>
              <p className="text-xs text-blue-100">
                Capture vendor reimbursement transaction
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
          <div className="bg-white px-6 py-5 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendor *
                </label>

                <VendorSelect
                  value={watch("vendorId")}
                  onChange={(val) => reset({ ...getValues(), vendorId: val })}
                  error={errors.vendorId?.message}
                />

                {errors.vendorId && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.vendorId.message}
                  </p>
                )}
              </div>

              {/* Purchase Select */}
              {selectedVendorId && vendorPurchases?.purchases?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Purchase Order
                  </label>

                  <select
                    {...register("purchaseId")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      General Refund (not tied to purchase)
                    </option>

                    {vendorPurchases.purchases.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.orderNo} — ₦{Number(p.totalAmount).toLocaleString()}{" "}
                        ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Purchase Preview */}
              {selectedPurchase && (
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Order No</p>
                      <p className="font-medium">{selectedPurchase.orderNo}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-medium">
                        ₦{Number(selectedPurchase.totalAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>

                  <select
                    {...register("cashAccountId")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <option value="">Select account</option>

                    {cashAccounts?.accounts?.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} (₦
                        {Number(a.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>

                  {errors.cashAccountId && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.cashAccountId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Refund Date *
                  </label>

                  <input
                    {...register("refundDate")}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  />

                  {errors.refundDate && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.refundDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount + Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount *
                  </label>

                  <input
                    {...register("amount", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="0.00"
                  />

                  {errors.amount && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reference
                  </label>

                  <input
                    {...register("reference")}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    placeholder="Ref / cheque / transfer"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  {...register("notes")}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                  placeholder="Additional details..."
                />
              </div>

              {/* Accounting Info */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 p-4 border border-emerald-100">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Accounting Impact
                </h4>

                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Cash decreases (credit)</li>
                  <li>• Vendor liability increases (debit adjustment)</li>
                  <li>• Refund reduces payable balance</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Recording..." : "Record Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVendorRefundModal;
