import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { inventoryApi, salesApi, uomApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

// const createItemSchema = z.object({
//   sku: z.string().min(1, 'SKU is required'),
//   name: z.string().min(1, 'Name is required'),
//   description: z.string().optional(),
//   type: z.enum(['RAW_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'CONSUMABLE']),
//   uom: z.string().default('QTY'),
//   costingMethod: z.enum(['GLOBAL', 'FIFO', 'WEIGHTED_AVG']).default('GLOBAL'),
//   standardCost: z.number().optional(),
//   sellingPriceOrdinary: z.number().optional(),
//   sellingPriceBulk: z.number().optional(),
//   sellingPriceWIC:z.number().optional(),
// });

// // const priceListSchema = z.array(
// //   z.object({
// //     customerGroup: z.enum(['Ordinary', 'Bulk', 'WIC']),
// //     price: z.number().positive('Price must be positive')
// //   })
// ).optional();

const createItemSchema = z.object({
  sku: z.string(),
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
  sellingPriceOrdinary: z.number().optional(),
  sellingPriceBulk: z.number().optional(),
  sellingPriceWIC: z.number().optional(),
  priceList: z.array(
    z.object({
      // itemId: z.string().cuid(),
      customerGroup: z.string(),
      price: z.number().positive(),
    }),
  ),
});

type CreateItemFormData = z.infer<typeof createItemSchema>;

interface CreateItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateItemModal = ({ onClose, onSuccess }: CreateItemModalProps) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemFormData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      uom: "QTY",
      costingMethod: "GLOBAL",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceList",
  });

  const onSubmit = async (data: CreateItemFormData) => {
    try {
      //console.log(data)
      await inventoryApi.createItem(data);
      toast.success("Item created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create item error:", error);
    }
  };

  const { data: groupsData, isLoading: isGroupsLoading } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: () => salesApi.getCustomerGroups({ page: 1, limit: 100 }), // adjust limit as needed
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  const groups = groupsData?.groups || [];

  const { data: uoms, refetch } = useQuery({
    queryKey: ["uoms"],
    queryFn: () => uomApi.getUOMs(),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL */}
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Create New Item
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Add inventory item to your system
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
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
            {/* BASIC INFO */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Basic Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="text-sm text-gray-700">SKU *</label>
                  <input
                    {...register("sku")}
                    disabled
                    placeholder="Leave it blank"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {errors.sku && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.sku.message}
                    </p>
                  )}
                </div>

                {/* TYPE */}
                <div>
                  <label className="text-sm text-gray-700">Type *</label>
                  <select
                    {...register("type")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="FINISHED_GOODS">Finished Goods</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="WORK_IN_PROGRESS">Work in Progress</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                  {errors.type && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.type.message}
                    </p>
                  )}
                </div>

                {/* NAME */}
                <div className="sm:col-span-2">
                  <label className="text-sm text-gray-700">Name *</label>
                  <input
                    {...register("name")}
                    placeholder="Item name"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* DESCRIPTION */}
                <div className="sm:col-span-2">
                  <label className="text-sm text-gray-700">Description</label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Item description"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* INVENTORY INFO */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Inventory Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MIN STOCK */}
                <div>
                  <label className="text-sm text-gray-700">
                    Minimum Stock Level
                  </label>
                  <input
                    {...register("minimumStockLevel", { valueAsNumber: true })}
                    type="number"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* COST */}
                <div>
                  <label className="text-sm text-gray-700">Cost Price</label>
                  <input
                    {...register("standardCost", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* UOM */}
                <div className="sm:col-span-2">
                  <label className="text-sm text-gray-700">UOM</label>
                  <select
                    {...register("uom")}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select UOM</option>
                    {uoms?.data.map((uom) => (
                      <option key={uom.id} value={uom.code}>
                        {uom.name} ({uom.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* PRICE LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Price List
                </h4>

                <button
                  type="button"
                  onClick={() => append({ customerGroup: "", price: 0 })}
                  className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Price
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-gray-50 border border-gray-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end"
                  >
                    {/* GROUP */}
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-700">
                        Customer Group
                      </label>
                      <select
                        {...register(`priceList.${index}.customerGroup`)}
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200"
                      >
                        <option value="">Select Group</option>
                        {groups.map((group) => (
                          <option key={group.code} value={group.name}>
                            {group.name}
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
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200"
                      />
                    </div>

                    {/* REMOVE */}
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateItemModal;
