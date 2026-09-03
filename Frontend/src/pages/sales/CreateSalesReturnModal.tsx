import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesApi } from "../../lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";

const createSalesReturnSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  reason: z.string().optional(),
  returnLines: z
    .array(
      z.object({
        saleLineId: z.string().min(1),
        itemId: z.string().min(1),
        qty: z.number().min(0),
      }),
    )
    .min(1),
});

type CreateSalesReturnFormData = z.infer<typeof createSalesReturnSchema>;

interface CreateSalesReturnModalProps {
  saleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSalesReturnModal = ({
  saleId,
  onClose,
  onSuccess,
}: CreateSalesReturnModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSalesReturnFormData>({
    resolver: zodResolver(createSalesReturnSchema),
    defaultValues: { saleId, returnLines: [] },
  });

  const { fields } = useFieldArray({ control, name: "returnLines" });
  const watchedLines = watch("returnLines");

  const { data: returnable, isLoading } = useQuery({
    queryKey: ["returnable-lines", saleId],
    queryFn: () => salesApi.getReturnableLines(saleId),
  });

  // console.log("returnable ", returnable);

  // Seed the field array once returnable lines load
  useEffect(() => {
    if (returnable?.lines) {
      setValue(
        "returnLines",
        returnable.lines.map((l: any) => ({
          saleLineId: l.saleLineId,
          itemId: l.itemId,
          qty: 0,
        })),
      );
    }
  }, [returnable, setValue]);

  const calculateTotal = () => {
    if (!returnable?.lines) return 0;
    return returnable.lines.reduce((sum: number, l: any, index: number) => {
      const qty = watchedLines?.[index]?.qty || 0;
      return sum + qty * l.unitPrice;
    }, 0);
  };

  const onSubmit = async (data: CreateSalesReturnFormData) => {
    const linesToReturn = data.returnLines.filter((l) => l.qty > 0);
    if (linesToReturn.length === 0) {
      toast.error("Enter a return quantity for at least one item");
      return;
    }
    try {
      await salesApi.createSalesReturn(
        data,
        //   returnLines: linesToReturn,
      );
      toast.success("Sales return created as draft");
      onSuccess();
    } catch (error) {
      console.error("Create sales return error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
        <div className="bg-white p-6 rounded-lg">
          Loading returnable items...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Sales Return — {returnable?.sale?.orderNo}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <textarea
                  {...register("reason")}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. Damaged goods"
                />
              </div>

              <div className="space-y-3">
                {returnable?.lines?.map((line: any, index: number) => (
                  <div
                    key={line.saleLineId}
                    className="bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-end">
                      <div className="sm:col-span-2">
                        <div className="font-medium text-gray-900">
                          {line.item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {line.item.sku}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Sold</div>
                        <div className="text-sm">{line.originalQty}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Returnable</div>
                        <div className="text-sm">{line.returnable}</div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">
                          Return Qty
                        </label>
                        <input
                          {...register(`returnLines.${index}.qty`, {
                            valueAsNumber: true,
                            max: {
                              value: line.returnable,
                              message: `Only ${line.returnable} available`,
                            },
                          })}
                          type="number"
                          step="0.01"
                          min="0"
                          max={line.returnable}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {errors.returnLines?.[index]?.qty && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors.returnLines[index]?.qty?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">
                  Return Total:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₦{calculateTotal().toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Return (Draft)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSalesReturnModal;
