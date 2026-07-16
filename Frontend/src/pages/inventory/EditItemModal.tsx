import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { inventoryApi, salesApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// Schema
const editItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum([
    "RAW_MATERIAL",
    "WORK_IN_PROGRESS",
    "FINISHED_GOODS",
    "CONSUMABLE",
  ]),
  uom: z.string().default("QTY"),
  minimumStockLevel: z.number().positive().optional(),
  costingMethod: z.enum(["GLOBAL", "FIFO", "WEIGHTED_AVG"]).default("GLOBAL"),
  standardCost: z.number().optional(),
  priceList: z
    .array(
      z.object({
        id: z.string().optional(),
        customerGroup: z.string().min(1, "Customer group is required"),
        price: z.number().positive("Price must be positive"),
      }),
    )
    .optional(),
});

type EditItemFormData = z.infer<typeof editItemSchema>;

interface EditItemModalProps {
  item: EditItemFormData;
  onClose: () => void;
  onSuccess: () => void;
}

const EditItemModal = ({ item, onClose, onSuccess }: EditItemModalProps) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditItemFormData>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      ...item,
      priceList: item.priceList ?? [],
    },
  });
  // console.log("Item Props", item);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceList",
  });

  //  Fetch customer groups for the priceList dropdown
  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: () => salesApi.getCustomerGroups({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const groups = groupsData?.groups || [];

  //  Reset form when `item` changes
  useEffect(() => {
    if (!item) return;
    if (isGroupsLoading) return;
    if (item) reset(item);
  }, [item, isGroupsLoading, reset]);

  //   useEffect(() => {
  //   if (!item) return;
  //   if (isGroupsLoading) return;

  //   reset({
  //     ...item,
  //     priceList: item.priceList?.map(pl => ({
  //       ...pl,
  //       customerGroup: pl.customerGroup,
  //     })),
  //   });
  // }, [item, isGroupsLoading, reset]);

  // Submit handler
  const onSubmit = async (data: EditItemFormData) => {
    try {
      await inventoryApi.updateItem(data);
      toast.success("Item updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Update item error:", error);
      toast.error("Failed to update item");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL CONTAINER */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* HEADER */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Item</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update inventory item details
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* BASIC INFO CARD */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Basic Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    SKU *
                  </label>
                  <input
                    {...register("sku")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., RM-001"
                    disabled
                  />
                  {errors.sku && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.sku.message}
                    </p>
                  )}
                </div>

                {/* TYPE */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Type *
                  </label>
                  <select
                    {...register("type")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WORK_IN_PROGRESS">Work in Progress</option>
                    <option value="FINISHED_GOODS">Finished Goods</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
              </div>

              {/* NAME */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  disabled
                  {...register("name")}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* INVENTORY INFO */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Inventory Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* MIN STOCK */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Minimum Stock
                  </label>
                  <input
                    {...register("minimumStockLevel", { valueAsNumber: true })}
                    type="number"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* COST */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Standard Cost
                  </label>
                  <input
                    {...register("standardCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* UOM */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    UOM
                  </label>
                  <input
                    {...register("uom")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., PCS"
                  />
                </div>
              </div>
            </div>

            {/* PRICE LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Price List
                </h4>

                <button
                  type="button"
                  onClick={() => append({ customerGroup: "", price: 0 })}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Price
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4"
                  >
                    {/* GROUP */}
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-700">
                        Customer Group
                      </label>
                      <select
                        {...register(`priceList.${index}.customerGroup`)}
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Group</option>
                        {groups.map((g: any) => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PRICE */}
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-700">Price</label>
                      <input
                        {...register(`priceList.${index}.price`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.01"
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* DELETE */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Updating..." : "Update Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
