import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";

const createBulkTransferSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "Source warehouse is required"),
    toWarehouseId: z.string().min(1, "Destination warehouse is required"),
    transferItems: z
      .array(
        z.object({
          itemId: z.string().min(1, "Item is required"),
          qty: z.number().positive("Quantity must be positive"),
        }),
      )
      .min(1, "At least one item is required"),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

type CreateBulkTransferFormData = z.infer<typeof createBulkTransferSchema>;

interface CreateTransferModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTransferModal = ({
  onClose,
  onSuccess,
}: CreateTransferModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValue,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBulkTransferFormData>({
    resolver: zodResolver(createBulkTransferSchema),
    defaultValues: {
      transferItems: [{ itemId: "", qty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "transferItems",
  });

  const selectedFromWarehouse = watch("fromWarehouseId");
  const selectedToWarehouse = watch("toWarehouseId");
  const watchedItems = watch("transferItems");

  const { data: items } = useQuery({
    queryKey: ["items-for-transfer"],
    queryFn: () => inventoryApi.getItems({ limit: 100, includeStock: true }),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-for-transfer"],
    queryFn: () => inventoryApi.getWarehouses(),
  });

  // Get stock information for selected items and warehouse
  const { data: stockData } = useQuery({
    queryKey: ["bulk-transfer-stock", selectedFromWarehouse, watchedItems],
    queryFn: async () => {
      if (!selectedFromWarehouse || !watchedItems.length) return {};

      const stockPromises = watchedItems
        .filter((item) => item.itemId)
        .map(async (item) => {
          try {
            const stock = await inventoryApi.getItemStock(
              item.itemId,
              selectedFromWarehouse,
            );
            return { itemId: item.itemId, stock: stock.qty };
          } catch {
            return { itemId: item.itemId, stock: 0 };
          }
        });

      const stockResults = await Promise.all(stockPromises);
      return stockResults.reduce(
        (acc, result) => {
          acc[result.itemId] = result.stock;
          return acc;
        },
        {} as Record<string, number>,
      );
    },
    enabled: !!(
      selectedFromWarehouse && watchedItems.some((item) => item.itemId)
    ),
  });

  // const onSubmit = async (data: CreateBulkTransferFormData) => {
  //   try {
  //     // Process each item transfer
  //     for (const transferItem of data.transferItems) {
  //       await inventoryApi.transferInventory({
  //         itemId: transferItem.itemId,
  //         fromWarehouseId: data.fromWarehouseId,
  //         toWarehouseId: data.toWarehouseId,
  //         qty: transferItem.qty
  //       });
  //     }

  //     toast.success(`Successfully transferred ${data.transferItems.length} items`);
  //     onSuccess();
  //   } catch (error) {
  //     console.error('Create bulk transfer error:', error);
  //   }
  // };

  const onSubmit = async (data: CreateBulkTransferFormData) => {
    try {
      const response = await inventoryApi.transferInventoryBulk({
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        transferItems: data.transferItems,
      });

      toast.success("Inventory transferred successfully");

      //handlePrintTransfer(response.refId); // 🔥
      onSuccess();
    } catch (error) {
      console.error("Create bulk transfer error:", error);
      toast.error("Bulk transfer failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL */}
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Create Stock Transfer
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Move stock between warehouses efficiently
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* WAREHOUSE SELECTION */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Transfer Route
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* FROM */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    From Warehouse *
                  </label>

                  <select
                    {...register("fromWarehouseId")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select source warehouse</option>
                    {warehouses?.warehouses?.map((warehouse: any) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code} - {warehouse.name}
                      </option>
                    ))}
                  </select>

                  {errors.fromWarehouseId && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.fromWarehouseId.message}
                    </p>
                  )}
                </div>

                {/* TO */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    To Warehouse *
                  </label>

                  <select
                    {...register("toWarehouseId")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select destination warehouse</option>
                    {warehouses?.warehouses
                      ?.filter((w: any) => w.id !== selectedFromWarehouse)
                      .map((warehouse: any) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </option>
                      ))}
                  </select>

                  {errors.toWarehouseId && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.toWarehouseId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ROUTE PREVIEW */}
              {selectedFromWarehouse && selectedToWarehouse && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                  <ArrowRight className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    {
                      warehouses?.warehouses?.find(
                        (w: any) => w.id === selectedFromWarehouse,
                      )?.name
                    }
                  </span>
                  <span>→</span>
                  <span className="font-medium">
                    {
                      warehouses?.warehouses?.find(
                        (w: any) => w.id === selectedToWarehouse,
                      )?.name
                    }
                  </span>
                </div>
              )}
            </div>

            {/* ITEMS SECTION */}
            <div className="space-y-4">
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Transfer Items
                </h4>

                <button
                  type="button"
                  onClick={() => append({ itemId: "", qty: 1 })}
                  className="flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* ITEM */}
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-700">Item *</label>

                      <ItemSelect
                        items={items?.items || []}
                        value={watch(`transferItems.${index}.itemId`)}
                        onChange={(val) =>
                          setValue(`transferItems.${index}.itemId`, val)
                        }
                        error={errors.transferItems?.[index]?.itemId?.message}
                      />
                    </div>

                    {/* STOCK DISPLAY */}
                    <div>
                      <label className="text-sm text-gray-700">
                        Available Stock
                      </label>

                      <div className="mt-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
                        {(() => {
                          const selectedItem = items?.items?.find(
                            (item: any) =>
                              item.id === watchedItems[index]?.itemId,
                          );
                          const stock =
                            stockData?.[watchedItems[index]?.itemId] || 0;

                          return (
                            <span
                              className={
                                stock > 0 ? "text-green-600" : "text-red-500"
                              }
                            >
                              {stock} {selectedItem?.uom || "units"}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* QTY */}
                    <div>
                      <label className="text-sm text-gray-700">
                        Quantity *
                      </label>

                      <div className="flex mt-1">
                        <input
                          {...register(`transferItems.${index}.qty`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.001"
                          className="w-full px-3 py-2 rounded-l-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Qty"
                        />

                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="px-3 bg-red-50 text-red-500 border border-l-0 border-gray-200 rounded-r-xl hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SUMMARY */}
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-sm text-green-800 space-y-1">
              <h4 className="font-semibold text-green-900 mb-2">
                Transfer Summary
              </h4>
              <div>• Total Items: {fields.length}</div>
              <div>
                • Total Quantity:{" "}
                {watchedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}
              </div>
              <div>• Stock will be updated in both warehouses</div>
              <div>• Ledger entries will be automatically created</div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm disabled:opacity-50 transition"
              >
                {isSubmitting ? "Transferring..." : "Execute Transfer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTransferModal;
