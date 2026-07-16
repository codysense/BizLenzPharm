import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, purchaseApi } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";

import toast from "react-hot-toast";

const createPurchasePaymentSchema = z.object({
  purchaseId: z.string().min(1, "Purchase order is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  amountPaid: z.number().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional(),
});

type CreatePurchasePaymentFormData = z.infer<
  typeof createPurchasePaymentSchema
>;

interface CreatePurchasePaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePurchasePaymentModal = ({
  onClose,
  onSuccess,
}: CreatePurchasePaymentModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchasePaymentFormData>({
    resolver: zodResolver(createPurchasePaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedPurchaseId = watch("purchaseId");

  const { data: invoicedPurchases } = useQuery({
    queryKey: ["invoiced-purchases"],
    queryFn: () => purchaseApi.getPurchases({ status: "INVOICED", limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-payment"],
    queryFn: () => cashApi.getCashAccounts({ limit: 100 }),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-populate amount when purchase is selected
  React.useEffect(() => {
    if (selectedPurchaseId && invoicedPurchases?.purchases) {
      const selectedPurchase = invoicedPurchases.purchases.find(
        (purchase: any) => purchase.id === selectedPurchaseId,
      );
      if (selectedPurchase) {
        setValue("amountPaid", selectedPurchase.totalAmount);
      }
    }
  }, [selectedPurchaseId, invoicedPurchases, setValue]);

  const onSubmit = async (data: CreatePurchasePaymentFormData) => {
    try {
      await cashApi.createPurchasePayment(data);
      toast.success("Purchase payment recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create purchase payment error:", error);
    }
  };

  const selectedPurchase = invoicedPurchases?.purchases?.find(
    (purchase: any) => purchase.id === selectedPurchaseId,
  );

  

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500/75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-lg sm:max-w-lg align-bottom bg-white rounded-xl shadow-xl transform transition-all sm:my-8 sm:align-middle">
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Purchase Payment
              </h3>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Purchase */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Order *
                </label>

                <select
                  {...register("purchaseId")}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select invoiced purchase order</option>

                  {invoicedPurchases?.purchases?.map((purchase: any) => (
                    <option key={purchase.id} value={purchase.id}>
                      {purchase.orderNo} — {purchase.vendor.name} (₦
                      {Number(purchase.totalAmount).toLocaleString()})
                    </option>
                  ))}
                </select>

                {errors.purchaseId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.purchaseId.message}
                  </p>
                )}
              </div>

              {/* Selected Purchase Summary */}
              {selectedPurchase && (
                <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500">Vendor</span>
                      <div className="font-medium">
                        {selectedPurchase.vendor.name}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Invoice Amount</span>
                      <div className="font-medium">
                        ₦{Number(selectedPurchase.totalAmount).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Order Date</span>
                      <div className="font-medium">
                        {new Date(
                          selectedPurchase.orderDate,
                        ).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Status</span>
                      <StatusBadge status={selectedPurchase.status} />
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
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select cash account</option>

                    {cashAccounts?.accounts?.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name} (₦
                        {Number(account.balance).toLocaleString()})
                      </option>
                    ))}
                  </select>

                  {errors.cashAccountId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.cashAccountId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Date *
                  </label>

                  <input
                    {...register("paymentDate")}
                    type="date"
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {errors.paymentDate && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.paymentDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount Paid *
                </label>

                <input
                  {...register("amountPaid", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />

                {errors.amountPaid && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.amountPaid.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  {...register("notes")}
                  rows={3}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Payment notes or reference"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchasePaymentModal;
