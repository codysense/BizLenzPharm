import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productionApi, inventoryApi } from "../../lib/api";
import { ProductionOrder } from "../../types/api";
import toast from "react-hot-toast";

const issueMaterialsSchema = z.object({
  materials: z
    .array(
      z.object({
        itemId: z.string().min(1, "Item is required"),
        qty: z.number().positive("Quantity must be positive"),
      }),
    )
    .min(1, "At least one material is required"),
});

type IssueMaterialsFormData = z.infer<typeof issueMaterialsSchema>;

interface IssueMaterialsModalProps {
  order: ProductionOrder;
  onClose: () => void;
  onSuccess: () => void;
}

const IssueMaterialsModal = ({
  order,
  onClose,
  onSuccess,
}: IssueMaterialsModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueMaterialsFormData>({
    resolver: zodResolver(issueMaterialsSchema),
    defaultValues: {
      materials: [{ itemId: "", qty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials-for-issue"],
    queryFn: () => inventoryApi.getItems({ type: "RAW_MATERIAL", limit: 100 }),
  });

  const bomItemIds = order.bom?.bomLines.map((l) => l.componentItemId) ?? [];

  const missingBomIds = bomItemIds.filter(
    (id) => !rawMaterials?.items?.some((item: any) => item.id === id),
  );

  const { data: missingBomItems } = useQuery({
    queryKey: ["missing-bom-materials", missingBomIds],
    queryFn: async () => {
      const results = await Promise.all(
        missingBomIds.map((id) => inventoryApi.getItemById(id)),
      );
      return results;
    },
    enabled: missingBomIds.length > 0,
  });

  const allMaterials = React.useMemo(() => {
    const base = rawMaterials?.items ?? [];
    const extra = missingBomItems ?? [];

    const merged = [...base];

    extra.forEach((item: any) => {
      if (!merged.some((m: any) => m.id === item.id)) {
        merged.push(item);
      }
    });

    return merged;
  }, [rawMaterials, missingBomItems]);

  // Get stock information for materials
  type StockInfo = {
    qty: number;
    avgCost: number;
  };

  const selectedItemIds = watch("materials")
    .map((m) => m.itemId)
    .filter(Boolean);

  const { data: stockData } = useQuery({
    queryKey: ["materials-stock", selectedItemIds, order.warehouseId],
    queryFn: async () => {
      const stockPromises = selectedItemIds.map(async (itemId) => {
        try {
          const stock = await inventoryApi.getItemStock(
            itemId,
            order.warehouseId,
          );

          return {
            itemId,
            qty: stock.qty,
            avgCost: stock.avgCost,
          };
        } catch {
          return {
            itemId,
            qty: 0,
            avgCost: 0,
          };
        }
      });

      const results = await Promise.all(stockPromises);

      return results.reduce(
        (acc, result) => {
          acc[result.itemId] = {
            qty: result.qty,
            avgCost: result.avgCost,
          };
          return acc;
        },
        {} as Record<string, { qty: number; avgCost: number }>,
      );
    },
    enabled: selectedItemIds.length > 0,
  });

  // const { data: stockData } = useQuery({
  //   queryKey: ["materials-stock", order.warehouseId],
  //   queryFn: async () => {
  //     if (!rawMaterials?.items) return {};

  //     const stockPromises = rawMaterials.items.map(async (item: any) => {
  //       try {
  //         const stock = await inventoryApi.getItemStock(
  //           item.id,
  //           order.warehouseId,
  //         );
  //         return {
  //           itemId: item.id,
  //           qty: stock.qty,
  //           avgCost: stock.avgCost,
  //         };
  //       } catch {
  //         return {
  //           itemId: item.id,
  //           qty: 0,
  //           avgCost: 0,
  //         };
  //       }
  //     });

  //     const stockResults = await Promise.all(stockPromises);

  //     return stockResults.reduce(
  //       (acc, result) => {
  //         acc[result.itemId] = {
  //           qty: result.qty,
  //           avgCost: result.avgCost,
  //         };
  //         return acc;
  //       },
  //       {} as Record<string, StockInfo>,
  //     );
  //   },
  //   enabled: !!rawMaterials?.items,
  // });

  // Auto-calculate materials from BOM
  const calculateFromBOM = () => {
    if (!order.bom?.bomLines) {
      alert("No BOM available for this item");
      return;
    }

    const calculatedMaterials = order.bom.bomLines.map((line) => {
      const baseQty = Number(line.qtyPer) * Number(order.qtyTarget);
      const scrapMultiplier = 1 + Number(line.scrapPercent) / 100;
      const totalQty = baseQty * scrapMultiplier;

      return {
        itemId: line.componentItemId,
        qty: Math.round(totalQty * 1000) / 1000, // Round to 3 decimal places
      };
    });

    reset({ materials: calculatedMaterials });
  };

  // Initialize with BOM data if available
  useEffect(() => {
    if (
      rawMaterials?.items?.length &&
      order.bom?.bomLines &&
      fields.length === 1 &&
      !fields[0].itemId
    ) {
      calculateFromBOM();
    }
  }, [rawMaterials, order.bom]);

  const watchedMaterials = watch("materials");

  // Calculate total estimated cost
  const calculateTotalCost = () => {
    return watchedMaterials.reduce((total, material) => {
      const stock = stockData?.[material.itemId];
      const cost = stock?.avgCost || 0;

      return total + (material.qty || 0) * cost;
    }, 0);
  };

  const onSubmit = async (data: IssueMaterialsFormData) => {
    try {
      await productionApi.issueMaterials(order.id, data);
      toast.success("Materials issued successfully");
      onSuccess();
    } catch (error) {
      console.error("Issue materials error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md">
                  <Package className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Issue Materials
                  </h3>
                  <p className="text-sm text-gray-500">
                    Production Order: {order.orderNo}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto px-6 py-6 space-y-6"
          >
            {/* Order Summary */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs text-gray-500">Item</p>
                <p className="font-semibold text-gray-900">{order.item.name}</p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs text-gray-500">Target Qty</p>
                <p className="font-semibold text-gray-900">{order.qtyTarget}</p>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                <p className="text-xs text-gray-500">Warehouse</p>
                <p className="font-semibold text-gray-900">
                  {order.warehouse.name}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs text-gray-500">BOM Status</p>
                <p className="font-semibold text-gray-900">
                  {order.bom
                    ? `Available (${order.bom.bomLines.length})`
                    : "No BOM"}
                </p>
              </div>
            </div>

            {/* BOM Preview */}
            {order.bom && (
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-900">
                      Bill of Materials
                    </h4>
                    <p className="text-sm text-green-700">
                      Version {order.bom.version || "1.0"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={calculateFromBOM}
                    className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Auto Calculate
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {order.bom.bomLines.map((line, index) => {
                    const baseQty =
                      Number(line.qtyPer) * Number(order.qtyTarget);

                    const scrapMultiplier = 1 + Number(line.scrapPercent) / 100;

                    const totalQty = baseQty * scrapMultiplier;

                    return (
                      <div
                        key={index}
                        className="rounded-xl bg-white p-4 border border-green-100"
                      >
                        <p className="font-medium text-gray-900">
                          {line.componentItem.sku}
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          {line.qtyPer} × {order.qtyTarget} = {baseQty}{" "}
                          {line.componentItem.uom}
                        </p>

                        {line.scrapPercent > 0 && (
                          <p className="text-sm text-orange-600 mt-1">
                            +{line.scrapPercent}% scrap → {totalQty.toFixed(3)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Materials Section */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-5 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">
                  Materials to Issue
                </h4>

                <button
                  type="button"
                  onClick={() => append({ itemId: "", qty: 1 })}
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material
                </button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="mb-4 rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {/* Material Select */}
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Material
                      </label>

                      <select
                        {...register(`materials.${index}.itemId`)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                      >
                        <option value="">Select material</option>

                        {allMaterials.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Available Stock
                      </label>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                        {(() => {
                          const selectedItem = rawMaterials?.items?.find(
                            (item: any) =>
                              item.id === watchedMaterials[index]?.itemId,
                          );

                          const stock =
                            stockData?.[watchedMaterials[index]?.itemId]?.qty ||
                            0;

                          const isInsufficient =
                            stock < (watchedMaterials[index]?.qty || 0);

                          return (
                            <div
                              className={`flex items-center ${
                                isInsufficient
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {isInsufficient && (
                                <AlertTriangle className="mr-2 h-4 w-4" />
                              )}
                              {stock} {selectedItem?.uom || "units"}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Quantity
                        </label>

                        <input
                          {...register(`materials.${index}.qty`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.001"
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                        />
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Estimated Material Cost
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on warehouse inventory average cost
                  </p>
                </div>

                <div className="text-3xl font-bold text-blue-600">
                  ₦{calculateTotalCost().toLocaleString()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Issuing..." : "Issue Materials"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IssueMaterialsModal;
