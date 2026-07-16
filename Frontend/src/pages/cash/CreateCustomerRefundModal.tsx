import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, salesApi } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import toast from "react-hot-toast";
import { CustomerSelect } from "../../components/CustomerSelect";

const createCustomerRefundSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  amount: z.number().positive("Amount must be positive"),
  refundDate: z.string().min(1, "Refund date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  saleId: z.string().optional(),
  originalReceiptId: z.string().optional(),
});

type CreateCustomerRefundFormData = z.infer<typeof createCustomerRefundSchema>;

interface CreateCustomerRefundModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerRefundModal = ({
  onClose,
  onSuccess,
}: CreateCustomerRefundModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerRefundFormData>({
    resolver: zodResolver(createCustomerRefundSchema),
    defaultValues: {
      refundDate: new Date().toISOString().split("T")[0],
    },
  });

  const selectedCustomerId = watch("customerId");
  const selectedSaleId = watch("saleId");
  const selectedCashAccountId = watch("cashAccountId");
  const refundAmount = watch("amount");

  /* ------------------------- QUERIES -------------------------- */
  const { data: customers } = useQuery({
    queryKey: ["customers-for-refund"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-Refund"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? salesApi.getSales({
            customerId: selectedCustomerId,
            status: "PAID",
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });
  const { data: customerReceipts } = useQuery({
    queryKey: ["customer-receipts", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? cashApi.getSalesReceipts({
            customerId: selectedCustomerId,
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });

  // Auto-populate amount when sale is selected
  React.useEffect(() => {
    if (selectedSaleId && customerSales?.sales) {
      const selectedSale = customerSales.sales.find(
        (sale: any) => sale.id === selectedSaleId,
      );
      if (selectedSale) {
        setValue("amount", selectedSale.totalAmount);
      }
    }
  }, [selectedSaleId, customerSales, setValue]);

  //Get Selected Cash Account
  const selectedCashAccount = cashAccounts?.accounts?.find(
    (account: any) => account.id === selectedCashAccountId,
  );

  const hasInsufficientBalance =
    selectedCashAccount && refundAmount
      ? refundAmount > Number(selectedCashAccount.balance)
      : false;

  const onSubmit = async (data: CreateCustomerRefundFormData) => {
    try {
      await cashApi.createCustomerRefund(data);

      toast.success("Customer refund recorded successfully");
      onSuccess();
    } catch (error) {
      console.error("Create customer refund error:", error);
    }
  };

  const selectedCustomer = customers?.customers?.find(
    (customer: any) => customer.id === selectedCustomerId,
  );
  const selectedSale = customerSales?.sales?.find(
    (sale: any) => sale.id === selectedSaleId,
  );

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
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-2xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold">Record Customer Refund</h3>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Customer */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer *
                </label>

                <CustomerSelect
                  customers={customers?.customers || []}
                  value={watch("customerId")}
                  onChange={(val) => reset({ ...getValues(), customerId: val })}
                  error={errors.customerId?.message}
                />

                {errors.customerId && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.customerId.message}
                  </p>
                )}
              </div>

              {/* Sales Order */}
              {selectedCustomerId &&
                customerSales?.sales &&
                customerSales.sales.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Sales Order
                    </label>

                    <select
                      {...register("saleId")}
                      className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">
                        General refund (not against specific order)
                      </option>

                      {customerSales.sales.map((sale: any) => (
                        <option key={sale.id} value={sale.id}>
                          {sale.orderNo} - ₦{sale.totalAmount.toLocaleString()}{" "}
                          ({sale.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Receipt */}
              {selectedCustomerId && customerReceipts?.sales && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Receipt Number (Optional)
                  </label>

                  <select
                    {...register("originalReceiptId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">
                      General refund (not against specific order)
                    </option>

                    {customerReceipts.sales.map((sale: any) => (
                      <option key={sale.ReceiptNo} value={sale.ReceiptNo}>
                        {sale.ReceiptNo} - ₦
                        {sale.amountReceived.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sale Summary */}
              {selectedSale && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Order No</p>
                      <p className="font-medium">{selectedSale.orderNo}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Invoice Amount</p>
                      <p className="font-medium">
                        ₦{selectedSale.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Order Date</p>
                      <p className="font-medium">
                        {new Date(selectedSale.orderDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Status</p>
                      <div>
                        <StatusBadge status={selectedSale.status} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Account + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>

                  <select
                    {...register("cashAccountId")}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
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
                    <p className="text-red-500 text-xs mt-1">
                      {errors.cashAccountId.message}
                    </p>
                  )}

                  {hasInsufficientBalance && (
                    <p className="text-red-500 text-xs mt-1">
                      Insufficient balance (Available Balance: ₦
                      {Number(selectedCashAccount?.balance).toLocaleString()})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Refund Date *
                  </label>

                  <input
                    {...register("refundDate")}
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />

                  {errors.refundDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.refundDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount + Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Refund Amount *
                  </label>

                  <input
                    {...register("amount", {
                      valueAsNumber: true,
                    })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />

                  {errors.amount && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Reference
                  </label>

                  <input
                    {...register("reference")}
                    placeholder="Check number, transfer ref, etc."
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Refund notes or additional details"
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </div>

              {/* Accounting Impact */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-green-900 mb-2">
                  Accounting Impact
                </h4>

                <div className="text-sm text-green-800 space-y-1">
                  <div>
                    • Cash Account will be <strong>credited</strong>
                  </div>
                  <div>
                    • Trade Receivables will be <strong>debited</strong>
                  </div>
                  <div>• Customer balance will be increased</div>
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
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || hasInsufficientBalance}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Recording..." : "Record Refund"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerRefundModal;
