import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { purchaseApi, inventoryApi, cashApi } from "../../lib/api";
import { PurchaseReturn } from "../../types/api";

const confirmPurchaseReturnSchema = z.object({
  cashAccountId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  settlementMethod: z.enum(["REFUND_CASH", "SUPPLIER_CREDIT"]),
});

type ConfirmPurchaseReturnFormData = z.infer<
  typeof confirmPurchaseReturnSchema
>;

interface ConfirmPurchaseReturnModalProps {
  purchaseReturn: PurchaseReturn;
  onClose: () => void;
  onSuccess: () => void;
}

const ConfirmPurchaseReturnModal = ({
  purchaseReturn,
  onClose,
  onSuccess,
}: ConfirmPurchaseReturnModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmPurchaseReturnFormData>({
    resolver: zodResolver(confirmPurchaseReturnSchema),
    defaultValues: { settlementMethod: "SUPPLIER_CREDIT" },
  });

  const settlementMethod = watch("settlementMethod");

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts"],
    queryFn: () => cashApi.getCashAccounts(),
  });
  //console.log("cashAccounts", cashAccounts);

  const { data: returnable } = useQuery({
    queryKey: ["returnable-lines", purchaseReturn.purchaseId],
    queryFn: () => purchaseApi.getReturnableLines(purchaseReturn.purchaseId),
  });

  const onSubmit = async (data: ConfirmPurchaseReturnFormData) => {
    try {
      await purchaseApi.confirmPurchaseReturn(purchaseReturn.id, data);
      toast.success(`Return ${purchaseReturn.returnNo} confirmed`);
      onSuccess();
    } catch (error) {
      console.error("Confirm purchase return error:", error);
    }
  };

  const canRefund =
    settlementMethod === "REFUND_CASH" &&
    returnable?.purchase?.status === "PAID"
      ? true
      : false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Confirm Return {purchaseReturn.returnNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 text-sm text-yellow-800">
              Confirming will issue stock out of the selected warehouse at
              current cost and reduce your payable to this vendor. This cannot
              be undone.
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4 flex justify-between">
              <span className="text-sm text-gray-600">
                Return Total (AP basis)
              </span>
              <span className="text-lg font-semibold text-gray-900">
                ₦{Number(purchaseReturn.totalAmount).toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Issuing Warehouse *
                </label>
                <select
                  {...register("warehouseId")}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select warehouse</option>
                  {warehouses?.warehouses?.map((wh: any) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Stock must be physically available in this warehouse — the
                  return will fail if it isn't.
                </p>
                {errors.warehouseId && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.warehouseId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Settlement Method *
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: "SUPPLIER_CREDIT",
                      label: "Keep as supplier credit",
                    },
                    {
                      value: "REFUND_CASH",
                      label: "Refund received to cash/bank",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        {...register("settlementMethod")}
                        type="radio"
                        value={option.value}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.settlementMethod && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.settlementMethod.message}
                  </p>
                )}
              </div>

              {canRefund && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>
                  <select
                    {...register("cashAccountId")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select cash account</option>
                    {cashAccounts?.accounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - ₦
                        {Number(account.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPurchaseReturnModal;
