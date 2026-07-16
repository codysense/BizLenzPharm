import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { purchaseApi, inventoryApi } from "../../lib/api";
import { Purchase } from "../../types/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";
import { VendorSelect } from "../../components/VendorSelect";

const editPurchaseSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  purchaseLines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Item is required"),
        qty: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one line item is required"),
});

type EditPurchaseFormData = z.infer<typeof editPurchaseSchema>;

interface EditPurchaseModalProps {
  purchase: Purchase;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPurchaseModal = ({
  purchase,
  onClose,
  onSuccess,
}: EditPurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditPurchaseFormData>({
    resolver: zodResolver(editPurchaseSchema),
    defaultValues: {
      vendorId: purchase.vendorId,
      orderDate: purchase.orderDate.split("T")[0],
      notes: purchase.notes || "",
      purchaseLines: purchase.purchaseLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    },
  });
  console.log("EditPurchaseModal Rendered with purchase:", purchase);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseLines",
  });

  const watchedLines = watch("purchaseLines");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-edit-purchase"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: items } = useQuery({
    queryKey: ["items-for-edit-purchase"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  // Reset form when purchase changes
  useEffect(() => {
    reset({
      vendorId: purchase.vendorId,
      orderDate: purchase.orderDate.split("T")[0],
      notes: purchase.notes || "",
      purchaseLines: purchase.purchaseLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    });
  }, [purchase, reset]);

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.qty || 0) * (line.unitPrice || 0);
    }, 0);
  };

  const onSubmit = async (data: EditPurchaseFormData) => {
    try {
      await purchaseApi.updatePurchase(purchase.id, data);
      toast.success("Purchase order updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit purchase error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-6 py-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  Edit Purchase Order
                </h3>
                <p className="text-sm text-white/80 mt-1">
                  {purchase.orderNo} • Status: {purchase.status}
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Warning */}
            {purchase.status === "ORDERED" && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This order has been sent to
                    vendor. Any changes may require vendor re-confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* Vendor + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Vendor *
                </label>
                <div className="mt-2">
                  <VendorSelect
                    value={watch("vendorId")}
                    onChange={(val) =>
                      setValue("vendorId", val, { shouldDirty: true })
                    }
                    vendors={vendors?.vendors || []}
                    error={errors.vendorId?.message}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Order Date *
                </label>
                <input
                  {...register("orderDate")}
                  type="date"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Purchase order notes..."
              />
            </div>

            {/* Lines Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                Purchase Lines
              </h4>

              <button
                type="button"
                onClick={() => append({ itemId: "", qty: 1, unitPrice: 0 })}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 transition"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            {/* Lines */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {/* Item */}
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-700">Item *</label>
                      <div className="mt-2">
                        <ItemSelect
                          value={watch(`purchaseLines.${index}.itemId`)}
                          onChange={(val) =>
                            setValue(`purchaseLines.${index}.itemId`, val)
                          }
                          error={errors.purchaseLines?.[index]?.itemId?.message}
                        />
                      </div>
                    </div>

                    {/* Qty */}
                    <div>
                      <label className="text-sm text-gray-700">Quantity</label>
                      <input
                        {...register(`purchaseLines.${index}.qty`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-sm text-gray-700">
                        Unit Price
                      </label>
                      <input
                        {...register(`purchaseLines.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                      />
                    </div>

                    {/* Total + Delete */}
                    <div className="flex items-end justify-between">
                      <div>
                        <label className="text-sm text-gray-700">
                          Line Total
                        </label>
                        <div className="mt-2 font-semibold text-gray-900">
                          ₦
                          {(
                            (watchedLines[index]?.qty || 0) *
                            (watchedLines[index]?.unitPrice || 0)
                          ).toLocaleString()}
                        </div>
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₦{calculateTotal().toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-1">
                Original: ₦{purchase.totalAmount.toLocaleString()}
              </p>
            </div>

            {/* Dirty warning */}
            {isDirty && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <h5 className="text-sm font-semibold text-yellow-800 mb-1">
                  Pending Changes
                </h5>
                <p className="text-sm text-yellow-700">
                  You have unsaved changes that will update this purchase order.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPurchaseModal;
