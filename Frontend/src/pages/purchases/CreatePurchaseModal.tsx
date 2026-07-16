import React, { useEffect } from "react";
import { useForm, useFieldArray, set } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { purchaseApi, inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { VendorSelect } from "../../components/VendorSelect";
import { ItemSelect } from "../../components/ItemSelect";
import { useState } from "react";
import CreateItemModal from "../inventory/CreateItemModal";

const createPurchaseSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  orderType: z.enum(["INVENTORY", "ASSET"]),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  purchaseLines: z
    .array(
      z.object({
        itemId: z.string().nullable().optional(), // inventory
        assetName: z.string().nullable().optional(), // asset
        qty: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().positive("Unit price must be positive"),
      }),
    )
    .min(1, "At least one line item is required"),
});

type CreatePurchaseFormData = z.infer<typeof createPurchaseSchema>;

interface CreatePurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePurchaseModal = ({
  onClose,
  onSuccess,
}: CreatePurchaseModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseFormData>({
    resolver: zodResolver(createPurchaseSchema),
    shouldUnregister: true,
    defaultValues: {
      orderType: "INVENTORY",
      orderDate: new Date().toISOString().split("T")[0],
      purchaseLines: [{ itemId: "", assetName: "", qty: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseLines",
  });

  const [createItemModal, setCreateItemModal] = useState(false);

  const watchedLines = watch("purchaseLines");
  const orderType = watch("orderType");

  const { data: vendors } = useQuery({
    queryKey: ["vendors-for-purchase"],
    queryFn: () => purchaseApi.getVendors({ limit: 100 }),
  });

  const { data: items, refetch } = useQuery({
    queryKey: ["items-for-purchases"],
    queryFn: () => inventoryApi.getItems({ limit: 100 }),
  });

  const { data: purchaseData } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => purchaseApi.getPurchases({ limit: 100 }),
  });

  const watchedItemIds = watchedLines
    .map((line) => line.itemId)
    .filter((id) => id);

  // console.log("purchaseData", purchaseData);

  //Normalize line item based on order type
  useEffect(() => {
    if (orderType === "INVENTORY") {
      setValue(
        "purchaseLines",
        watchedLines.map((line) => ({
          ...line,
          assetName: null,
          qty: 1,
          unitPrice: 0,
        })),
      );
    } else {
      setValue(
        "purchaseLines",
        watchedLines.map((line) => ({
          ...line,
          itemId: null,
          qty: 1,
          unitPrice: 0,
        })),
      );
    }
  }, [orderType, setValue]);

  //fetch last purchase for a selected item
  useEffect(() => {
    if (orderType !== "INVENTORY") return;
    if (!purchaseData?.purchases?.length) return;
    if (!watchedItemIds.length) return;

    watchedItemIds.forEach((line, index) => {
      if (!line) return;

      const lastPurchase = purchaseData.purchases
        .filter((purchase: any) =>
          purchase.purchaseLines?.some((l: any) => l.itemId === line),
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
        )[0];

      if (!lastPurchase) return;

      const lastLine = lastPurchase.purchaseLines?.find(
        (l: any) => l.itemId === line,
      );

      const lastPrice = lastLine ? Number(lastLine.unitPrice) : 0;

      const currentPrice = Number(
        getValues(`purchaseLines.${index}.unitPrice`),
      );

      // const fieldState = getFieldState(`purchaseLines.${index}.unitPrice`);

      // Only auto-fill if field is empty AND not dirty
      if (currentPrice === 0 && lastPrice) {
        setValue(`purchaseLines.${index}.unitPrice`, lastPrice);
      }
    });
  }, [watchedItemIds, purchaseData, orderType]);

  // const getLastPrice = (itemId: string) => {
  //   const lastPurchase = purchaseData.purchases
  //     .filter((purchase: any) =>
  //       purchase.purchaseLines?.some((l: any) => l.itemId === itemId),
  //     )
  //     .sort(
  //       (a: any, b: any) =>
  //         new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
  //     )[0];
  //   return (
  //     lastPurchase?.purchaseLines?.find((l: any) => l.itemId === itemId)
  //       ?.unitPrice || 0
  //   );
  // };

  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.qty || 0) * (line.unitPrice || 0);
    }, 0);
  };

  const handleCreateItem = () => {
    refetch();
    setCreateItemModal(false);
  };

  const onSubmit = async (data: CreatePurchaseFormData) => {
    try {
      await purchaseApi.createPurchase(data);
      toast.success("Purchase order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create purchase error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Center Wrapper */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {/* Modal */}
        <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Create Purchase Order</h3>
                <p className="text-sm text-blue-100 mt-1">
                  Manage supplier procurement & inventory inflow
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

          {/* Body */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto p-6 space-y-8"
          >
            {/* BASIC INFO CARD */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Purchase Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Vendor */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Vendor *
                  </label>
                  <div className="mt-2">
                    <VendorSelect
                      vendors={vendors?.vendors || []}
                      value={watch("vendorId")}
                      onChange={(val) =>
                        setValue("vendorId", val, { shouldDirty: true })
                      }
                      error={errors.vendorId?.message}
                    />
                  </div>
                </div>

                {/* Order Date */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Order Date *
                  </label>
                  <input
                    {...register("orderDate")}
                    type="date"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Order Type */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Order Type *
                  </label>
                  <select
                    {...register("orderType")}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="INVENTORY">Inventory Order</option>
                    <option value="ASSET">Asset Order</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Purchase order notes..."
                />
              </div>
            </div>

            {/* LINE ITEMS SECTION */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-lg font-semibold text-gray-900">
                  {orderType === "INVENTORY" ? "Items" : "Assets"}
                </h4>

                <div className="flex gap-3">
                  {orderType === "INVENTORY" && (
                    <button
                      type="button"
                      onClick={() => setCreateItemModal(true)}
                      className="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Item
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      append(
                        orderType === "ASSET"
                          ? { assetName: "", qty: 1, unitPrice: 0 }
                          : { itemId: "", qty: 1, unitPrice: 0 },
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Line
                  </button>
                </div>
              </div>

              {/* LINE ITEMS */}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border border-gray-100 rounded-2xl p-5 bg-gray-50 hover:bg-white transition"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Item */}
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-700">
                          {orderType === "ASSET" ? "Asset Name" : "Item"}
                        </label>

                        {orderType === "INVENTORY" ? (
                          <div className="mt-2">
                            <ItemSelect
                              items={items?.items || []}
                              value={watch(`purchaseLines.${index}.itemId`)}
                              onChange={(val) =>
                                setValue(`purchaseLines.${index}.itemId`, val, {
                                  shouldDirty: true,
                                })
                              }
                              error={
                                errors.purchaseLines?.[index]?.itemId?.message
                              }
                            />
                          </div>
                        ) : (
                          <input
                            {...register(`purchaseLines.${index}.assetName`)}
                            className="mt-2 w-full rounded-xl border px-3 py-2"
                            placeholder="Asset name"
                          />
                        )}
                      </div>

                      {/* Qty */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Qty
                        </label>
                        <input
                          {...register(`purchaseLines.${index}.qty`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          className="mt-2 w-full rounded-xl border px-3 py-2"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Unit Price
                        </label>
                        <input
                          {...register(`purchaseLines.${index}.unitPrice`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          className="mt-2 w-full rounded-xl border px-3 py-2"
                        />
                      </div>

                      {/* Total + Delete */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Line Total</p>
                          <p className="font-bold text-blue-600">
                            ₦
                            {(
                              (watchedLines[index]?.qty || 0) *
                              (watchedLines[index]?.unitPrice || 0)
                            ).toLocaleString()}
                          </p>
                        </div>

                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOTAL */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₦{calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
              >
                {isSubmitting ? "Creating..." : "Create Purchase Order"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {createItemModal && (
        <CreateItemModal
          onClose={() => setCreateItemModal(false)}
          onSuccess={handleCreateItem}
        />
      )}
    </div>
  );
};

export default CreatePurchaseModal;
