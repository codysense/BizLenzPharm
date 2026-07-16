import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesApi, inventoryApi } from "../../lib/api";
import { Sale } from "../../types/api";
import toast from "react-hot-toast";
import { Combobox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { CustomerSelect } from "../../components/CustomerSelect";
import { ItemSelect } from "../../components/ItemSelect";

const editSaleSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  saleLines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Item is required"),
        qty: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one line item is required"),
});

type EditSaleFormData = z.infer<typeof editSaleSchema>;

interface EditSaleModalProps {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

const EditSaleModal = ({ sale, onClose, onSuccess }: EditSaleModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditSaleFormData>({
    resolver: zodResolver(editSaleSchema),
    defaultValues: {
      customerId: sale.customerId,
      orderDate: sale.orderDate.split("T")[0],
      notes: sale.notes || "",
      saleLines: sale.saleLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "saleLines",
  });

  const watchedLines = watch("saleLines");

  const { data: customers } = useQuery({
    queryKey: ["customers-for-edit-sale"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: items } = useQuery({
    queryKey: ["items-for-edit-sale"],
    queryFn: () =>
      inventoryApi.getItems({ type: "FINISHED_GOODS", limit: 100 }),
  });

  // Reset form when sale changes
  useEffect(() => {
    reset({
      customerId: sale.customerId,
      orderDate: sale.orderDate.split("T")[0],
      notes: sale.notes || "",
      saleLines: sale.saleLines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        unitPrice: line.unitPrice,
      })),
    });
  }, [sale, reset]);

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.qty || 0) * (line.unitPrice || 0);
    }, 0);
  };

  const onSubmit = async (data: EditSaleFormData) => {
    try {
      await salesApi.updateSale(sale.id, data);
      toast.success("Sales order updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit sale error:", error);
    }
  };

  // For customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const filteredCustomers =
    customerQuery === ""
      ? customers?.customers || []
      : customers?.customers?.filter((c: any) =>
          `${c.name} ${c.code} ${c.phone || ""}`
            .toLowerCase()
            .includes(customerQuery.toLowerCase()),
        );

  // For item search
  // const [itemQueries, setItemQueries] = useState<{ [key: number]: string }>({})
  // const getFilteredItems = (index: number) => {
  //   const query = itemQueries[index] || ''
  //   if (!query) return items?.items || []
  //   return items?.items?.filter((i: any) =>
  //     `${i.name} ${i.sku}`.toLowerCase().includes(query.toLowerCase())
  //   )
  // }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h3 className="text-lg font-semibold">Edit Sales Order</h3>
            <p className="text-sm text-blue-100">
              {sale.orderNo} — Status: {sale.status}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning */}
        {sale.status === "CONFIRMED" && (
          <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This sales order is confirmed. Changes
              may affect delivery schedules.
            </p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>

              <CustomerSelect
                customers={customers?.customers || []}
                value={watch("customerId")}
                onChange={(val) => reset({ ...getValues(), customerId: val })}
                error={errors.customerId?.message}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date *
              </label>

              <input
                {...register("orderDate")}
                type="date"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {errors.orderDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.orderDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>

            <textarea
              {...register("notes")}
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Sales order notes"
            />
          </div>

          {/* Items Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">Items</h4>

            <button
              type="button"
              onClick={() => append({ itemId: "", qty: 1, unitPrice: 0 })}
              className="px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {/* Lines */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Item */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Item *
                    </label>

                    <ItemSelect
                      items={items?.items || []}
                      value={watch(`saleLines.${index}.itemId`)}
                      onChange={(val) =>
                        setValue(`saleLines.${index}.itemId`, val)
                      }
                      error={errors.saleLines?.[index]?.itemId?.message}
                    />
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Qty *
                    </label>

                    <input
                      {...register(`saleLines.${index}.qty`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      className="w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Unit Price
                    </label>

                    <input
                      {...register(`saleLines.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      className="w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Total + Delete */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Line Total</p>
                      <div className="font-semibold text-gray-900">
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
                        className="p-2 rounded-lg border hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center">
            <span className="font-medium">Total Amount</span>
            <span className="text-xl font-bold text-blue-600">
              ₦{calculateTotal().toLocaleString()}
            </span>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSaleModal;
