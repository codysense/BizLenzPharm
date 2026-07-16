import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";

const createBomSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  version: z.string().default("1.0"),
  bomLines: z
    .array(
      z.object({
        componentItemId: z.string().min(1, "Component is required"),
        qtyPer: z.number().positive("Quantity must be positive"),
        scrapPercent: z.number().min(0).max(100).default(0),
      }),
    )
    .min(1, "At least one component is required"),
});

type CreateBomFormData = z.infer<typeof createBomSchema>;

interface CreateBomModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBomModal = ({ onClose, onSuccess }: CreateBomModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateBomFormData>({
    resolver: zodResolver(createBomSchema),
    defaultValues: {
      version: "1.0",
      bomLines: [{ componentItemId: "", qtyPer: 1, scrapPercent: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bomLines",
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ["finished-goods"],
    queryFn: () => inventoryApi.getItems({ type: "FINISHED_GOODS" }),
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => inventoryApi.getItems({ type: "RAW_MATERIAL" }),
  });

  const selectedItemId = watch("itemId");

  const onSubmit = async (data: CreateBomFormData) => {
    try {
      await inventoryApi.createBom(data);
      toast.success("BOM created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create BOM error:", error);
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
                Create Bill of Materials
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Define product recipe and component structure
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
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Basic Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* ITEM */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Finished Goods Item *
                  </label>

                  <ItemSelect
                    value={watch("itemId") || ""}
                    onChange={(val) =>
                      setValue("itemId", val, { shouldDirty: true })
                    }
                    typeFilter="FINISHED_GOODS"
                    placeholder="Select finished goods item"
                  />

                  {errors.itemId && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.itemId.message}
                    </p>
                  )}
                </div>

                {/* VERSION */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Version
                  </label>

                  <input
                    {...register("version")}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="e.g. 1.0"
                  />
                </div>
              </div>
            </div>

            {/* COMPONENTS */}
            <div className="space-y-4">
              {/* HEADER */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Components
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    append({
                      componentItemId: "",
                      qtyPer: 1,
                      scrapPercent: 0,
                    })
                  }
                  className="flex items-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </button>
              </div>

              {/* LIST */}
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* COMPONENT */}
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-700">
                        Component Item *
                      </label>

                      <ItemSelect
                        value={watch(`bomLines.${index}.componentItemId`) || ""}
                        typeFilter="RAW_MATERIAL"
                        onChange={(val) =>
                          setValue(`bomLines.${index}.componentItemId`, val, {
                            shouldDirty: true,
                          })
                        }
                        placeholder="Select component"
                      />

                      {errors.bomLines?.[index]?.componentItemId && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.bomLines[index]?.componentItemId?.message}
                        </p>
                      )}
                    </div>

                    {/* QTY */}
                    <div>
                      <label className="text-sm text-gray-700">
                        Qty Per Unit
                      </label>

                      <input
                        {...register(`bomLines.${index}.qtyPer`, {
                          valueAsNumber: true,
                        })}
                        className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="1.00"
                      />
                    </div>

                    {/* SCRAP */}
                    <div>
                      <label className="text-sm text-gray-700">Scrap %</label>

                      <div className="flex mt-1">
                        <input
                          {...register(`bomLines.${index}.scrapPercent`, {
                            valueAsNumber: true,
                          })}
                          className="w-full px-4 py-3 rounded-l-xl border border-gray-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />

                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="px-3 bg-red-50 text-red-500 border border-gray-200 rounded-r-xl hover:bg-red-100"
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
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create BOM"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateBomModal;
