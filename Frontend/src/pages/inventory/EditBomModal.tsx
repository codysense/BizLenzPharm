import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "../../lib/api";
import { Bom } from "../../types/api";
import toast from "react-hot-toast";

const editBomSchema = z.object({
  version: z.string().min(1, "Version is required"),
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

type EditBomFormData = z.infer<typeof editBomSchema>;

interface EditBomModalProps {
  bom: Bom;
  onClose: () => void;
  onSuccess: () => void;
}

const EditBomModal = ({ bom, onClose, onSuccess }: EditBomModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditBomFormData>({
    resolver: zodResolver(editBomSchema),
    defaultValues: {
      version: bom.version,
      bomLines: bom.bomLines.map((line) => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bomLines",
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ["raw-materials-for-edit"],
    queryFn: () => inventoryApi.getItems({ type: "RAW_MATERIAL", limit: 100 }),
  });

  // Reset form when bom changes
  useEffect(() => {
    reset({
      version: bom.version,
      bomLines: bom.bomLines.map((line) => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent,
      })),
    });
  }, [bom, reset]);

  const onSubmit = async (data: EditBomFormData) => {
    try {
      // Create a new BOM version with updated data
      await inventoryApi.createBom({
        itemId: bom.itemId,
        version: data.version,
        bomLines: data.bomLines,
      });
      toast.success("BOM updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Edit BOM error:", error);
    }
  };

  const createNewVersion = () => {
    const currentVersion = parseFloat(bom.version);
    const newVersion = (currentVersion + 0.1).toFixed(1);
    reset({
      version: newVersion,
      bomLines: bom.bomLines.map((line) => ({
        componentItemId: line.componentItemId,
        qtyPer: line.qtyPer,
        scrapPercent: line.scrapPercent,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* MODAL */}
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Edit Bill of Materials
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {bom.item.sku} — {bom.item.name}
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
            {/* VERSION CARD */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Version
                  </label>

                  <input
                    {...register("version")}
                    className="mt-1 w-40 px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1.0"
                  />

                  {errors.version && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.version.message}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={createNewVersion}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  Create New Version
                </button>
              </div>

              <p className="text-sm text-blue-700 mt-3">
                Editing will generate a new BOM version and deactivate the
                current one.
              </p>
            </div>

            {/* COMPONENTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Components
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    append({ componentItemId: "", qtyPer: 1, scrapPercent: 0 })
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add Component
                </button>
              </div>

              {fields.map((field, index) => {
                const originalLine = bom.bomLines[index];

                return (
                  <div
                    key={field.id}
                    className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm"
                  >
                    {/* CHANGE INDICATOR */}
                    {originalLine && (
                      <div className="text-xs text-gray-400 mb-3">
                        Original: {originalLine.qtyPer} qty •{" "}
                        {originalLine.scrapPercent}% scrap
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* COMPONENT */}
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-700">
                          Component Item *
                        </label>

                        <select
                          {...register(`bomLines.${index}.componentItemId`)}
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Select component</option>
                          {rawMaterials?.items?.map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name} ({item.uom})
                            </option>
                          ))}
                        </select>

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
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
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
                            className="w-full px-3 py-2 rounded-l-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="px-3 bg-red-50 text-red-500 border border-l-0 border-gray-200 rounded-r-xl hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHANGE INFO */}
            {isDirty && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  Change Impact
                </h4>

                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• New BOM version will be created</li>
                  <li>• Previous version becomes inactive</li>
                  <li>• Existing production orders remain unchanged</li>
                  <li>• New orders will use updated BOM</li>
                </ul>
              </div>
            )}

            {/* FOOTER */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save BOM"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBomModal;
