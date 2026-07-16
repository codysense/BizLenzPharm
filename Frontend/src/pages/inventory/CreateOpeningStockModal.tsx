import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import toast from "react-hot-toast";
import { Trash2, X } from "lucide-react";

import { inventoryApi, openingStockApi } from "../../lib/api";
import { ItemSelect } from "../../components/ItemSelect";
import { ItemLookup } from "../../types/itemLookup";

// Zod Schema
const createOpeningStockSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  remarks: z.string().optional(),

  openingLines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        itemName: z.string().optional(),
        sku: z.string().optional(),
        qty: z.number().positive(),
        unitCost: z.number().nonnegative(),
      }),
    )
    .min(1, "At least one item is required"),
});

type CreateOpeningStockFormData = z.infer<typeof createOpeningStockSchema>;

interface CreateOpeningStockModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateOpeningStockModal = ({
  onClose,
  onSuccess,
}: CreateOpeningStockModalProps) => {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOpeningStockFormData>({
    resolver: zodResolver(createOpeningStockSchema),

    defaultValues: {
      warehouseId: "",
      openingDate: new Date().toISOString().split("T")[0],
      remarks: "",
      openingLines: [],
    },
  });

  const { data: warehouses } = useQuery<{
    warehouses: Array<{ id: string; name: string }>;
  }>({
    queryKey: ["warehouses-for-opening-stock"],
    queryFn: () =>
      inventoryApi.getWarehouses() as Promise<{
        warehouses: Array<{ id: string; name: string }>;
      }>,
  });

  // console.log("warehouses", warehouses);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemLookup | null>(null);

  const [qty, setQty] = useState(1);

  const [unitCost, setUnitCost] = useState(0);

  const itemRef = useRef<HTMLInputElement | null>(null);

  const qtyRef = useRef<HTMLInputElement>(null);

  const costRef = useRef<HTMLInputElement>(null);

  const openingLines = watch(
    "openingLines",
  ) as CreateOpeningStockFormData["openingLines"];

  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }

    let isActive = true;

    inventoryApi
      .getItemById(selectedItemId)
      .then((item) => {
        if (isActive) {
          setSelectedItem(item as ItemLookup);
        }
      })
      .catch(() => {
        if (isActive) {
          setSelectedItem(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedItemId]);

  const addItem = () => {
    if (!selectedItem) {
      toast.error("Select an item");
      return;
    }

    if (qty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    if (unitCost < 0) {
      toast.error("Invalid unit cost");
      return;
    }

    const exists = openingLines.find((x) => x.itemId === selectedItem.id);

    if (exists) {
      toast.error("Item already added.");
      return;
    }

    setValue(
      "openingLines",
      [
        ...openingLines,
        {
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          sku: selectedItem.sku,
          qty,
          unitCost,
        },
      ] as CreateOpeningStockFormData["openingLines"],
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );

    setSelectedItemId("");
    setSelectedItem(null);
    setQty(1);
    setUnitCost(0);

    setTimeout(() => {
      itemRef.current?.focus?.();
    }, 100);
  };
  const removeItem = (index: number) => {
    const copy = [...openingLines];

    copy.splice(index, 1);

    setValue("openingLines", copy, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleCostKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      addItem();
    }
  };

  const totalQuantity = useMemo(() => {
    return openingLines.reduce((sum, line) => sum + Number(line.qty), 0);
  }, [openingLines]);

  const totalValue = useMemo(() => {
    return openingLines.reduce((sum, line) => {
      return sum + Number(line.qty) * Number(line.unitCost);
    }, 0);
  }, [openingLines]);

  const onSubmit = async (data: CreateOpeningStockFormData) => {
    try {
      await openingStockApi.createOpeningStock(data);

      toast.success("Opening stock posted successfully");

      onSuccess();
    } catch (error) {
      console.error(error);

      toast.error("Failed to post opening stock");
    }
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
          {/* Header */}

          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Opening Stock</h3>

                <p className="mt-1 text-sm text-blue-100">
                  Record initial inventory quantities and values
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-h-[85vh] overflow-y-auto p-6 space-y-8"
          >
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <h4 className="mb-4 text-sm font-semibold text-gray-700">
                Opening Stock Information
              </h4>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Warehouse */}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Warehouse *
                  </label>

                  <select
                    {...register("warehouseId")}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses?.warehouses.map(
                      (warehouse: { id: string; name: string }) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ),
                    )}
                  </select>

                  {errors.warehouseId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.warehouseId.message}
                    </p>
                  )}
                </div>

                {/* Date */}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Opening Date
                  </label>

                  <input
                    {...register("openingDate")}
                    type="date"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-medium text-gray-700">
                  Remarks
                </label>

                <textarea
                  {...register("remarks")}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
                  placeholder="Optional remarks..."
                />
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h4 className="text-lg font-semibold text-gray-900">
                  Quick Entry
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Select an item, enter quantity and cost, then press Enter.
                </p>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end">
                {/* Item */}

                <div className="col-span-12 lg:col-span-6">
                  <label className="text-sm font-medium">Item</label>

                  <ItemSelect
                    value={selectedItemId}
                    onChange={(itemId) => {
                      setSelectedItemId(itemId);
                    }}
                  />
                </div>

                {/* Qty */}

                <div className="col-span-6 lg:col-span-2">
                  <label className="text-sm font-medium">Qty</label>

                  <input
                    ref={qtyRef}
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3"
                  />
                </div>

                {/* Cost */}

                <div className="col-span-6 lg:col-span-2">
                  <label className="text-sm font-medium">Unit Cost</label>

                  <input
                    ref={costRef}
                    value={unitCost}
                    type="number"
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    onKeyDown={handleCostKeyDown}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-3"
                  />
                </div>

                <div className="col-span-12 lg:col-span-2">
                  <button
                    type="button"
                    onClick={addItem}
                    className="w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="border-b bg-gray-50 px-6 py-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Opening Stock Items
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="px-6 py-3">#</th>

                      <th className="px-6 py-3">SKU</th>

                      <th className="px-6 py-3">Item</th>

                      <th className="px-6 py-3 text-right">Qty</th>

                      <th className="px-6 py-3 text-right">Unit Cost</th>

                      <th className="px-6 py-3 text-right">Line Total</th>

                      <th className="px-6 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {openingLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-gray-500"
                        >
                          No items added.
                        </td>
                      </tr>
                    ) : (
                      openingLines.map((line, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="px-6 py-4">{index + 1}</td>

                          <td className="px-6 py-4">{line.sku}</td>

                          <td className="px-6 py-4 font-medium">
                            {line.itemName}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {Number(line.qty).toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-right">
                            ₦{Number(line.unitCost).toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold text-blue-600">
                            ₦
                            {(
                              Number(line.qty) * Number(line.unitCost)
                            ).toLocaleString()}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Total Items</p>

                  <p className="mt-1 text-2xl font-bold">
                    {openingLines.length}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Total Quantity</p>

                  <p className="mt-1 text-2xl font-bold">
                    {totalQuantity.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Opening Inventory Value
                  </p>

                  <p className="mt-1 text-3xl font-bold text-blue-600">
                    ₦{totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border px-6 py-3 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-6 py-3 text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Posting..." : "Post Opening Stock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateOpeningStockModal;
