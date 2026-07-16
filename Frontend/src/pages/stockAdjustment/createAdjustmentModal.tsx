import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adjustmentApi, managementApi, inventoryApi } from '../../lib/api';
import toast from 'react-hot-toast';
import { ChartAccountSelect } from '../../components/ChartAccountSelect';
import { ItemSelect } from '../../components/ItemSelect';


const createAdjustmentSchema = z.object({
 
  adjustmentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  notes: z.string().optional(),
  warehouseId:z.string(),
  accountId: z.string(),
  adjustmentLines: z.array(z.object({
    itemId: z.string().cuid(),
    quantity: z.number(),
    adjustmentType:z.enum(['SURPLUS', 'DEFICIT'])
  })),
});

type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;

interface CreateAdjustmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAdjustmentModal = ({ onClose, onSuccess }: CreateAdjustmentModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    // getValues,
    // reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateAdjustmentFormData>({
    resolver: zodResolver(createAdjustmentSchema),
    defaultValues: {
      adjustmentDate: new Date().toISOString().split('T')[0],
    //   adjustmentLines: [{ accountId: '', debit: 0, credit: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'adjustmentLines'
  });

  const watchedLines = watch('adjustmentLines');

  const { data: chartAccounts } = useQuery({
    queryKey: ['chartAccounts-for-Adjustment'],
    queryFn: () => managementApi.getChartOfAccounts()
  });
  

//   const { data: items } = useQuery({
//     queryKey: ['items-for-Adjustments'],
//     queryFn: () => inventoryApi.getItems({  limit: 100 })
//   });

//   console.log(items)
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-for-Adjustments'],
    queryFn: () => inventoryApi.getWarehouses()
  });


  const selectedWarehouseId = watch("warehouseId");

const { data: items, refetch } = useQuery({
  queryKey: ["items-for-Adjustments", selectedWarehouseId],
  queryFn: () => inventoryApi.getItems({ 
    limit: 100, 
    warehouseId: selectedWarehouseId, 
    includeStock: true 
  }),
  enabled: !!selectedWarehouseId, // don’t run until warehouse chosen
});



//   const calculateDebitTotal = () => {
//     return watchedLines.reduce((sum, line) => {
//       return sum + (line.debit || 0) ;
//     }, 0);
//   };
//   const calculateCreditTotal = () => {
//     return watchedLines.reduce((sum, line) => {
//       return sum + (line.credit || 0) ;
//     }, 0);
//   };

  const onSubmit = async (data: CreateAdjustmentFormData) => {
    try {
      await adjustmentApi.adjustStock(data);
      toast.success('Stock Adjustment created successfully');
      onSuccess();
    } catch (error) {
      console.error('Create Stock Adjustment error:', error);
    }
  };

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    
    {/* Clickable overlay (closes modal) */}
    <div
      className="absolute inset-0"
      onClick={onClose}
    />

    {/* Modal Container */}
    <div className="relative w-full max-w-6xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
        <h3 className="text-white text-lg font-semibold">
          Create Adjustment
        </h3>

        <button
          onClick={onClose}
          className="text-white/80 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Top Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-gray-700">Date *</label>
              <input
                {...register("adjustmentDate")}
                type="date"
                className="mt-1 w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.adjustmentDate && (
                <p className="text-red-500 text-sm">{errors.adjustmentDate.message}</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="text-sm font-medium text-gray-700">Note *</label>
              <input
                {...register("notes")}
                className="mt-1 w-full border rounded-md px-3 py-2"
              />
              {errors.notes && (
                <p className="text-red-500 text-sm">{errors.notes.message}</p>
              )}
            </div>

            {/* Account */}
            <div>
              <label className="text-sm font-medium text-gray-700">Account *</label>
              <ChartAccountSelect
                accounts={chartAccounts?.accounts || []}
                value={watch("accountId")}
                onChange={(val) =>
                  setValue("accountId", val, { shouldDirty: true })
                }
                error={errors.accountId?.message}
              />
            </div>

            {/* Warehouse */}
            <div>
              <label className="text-sm font-medium text-gray-700">Warehouse *</label>
              <select
                {...register("warehouseId")}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option value="">Select warehouse</option>
                {warehouses?.warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
              {errors.warehouseId && (
                <p className="text-red-500 text-sm">{errors.warehouseId.message}</p>
              )}
            </div>
          </div>

          {/* Adjustment Lines Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">
              Adjustment Entries
            </h4>

            <button
              type="button"
              onClick={() =>
                append({ itemId: "", quantity: 0, adjustmentType: "SURPLUS" })
              }
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          </div>

          {/* Lines */}
          <div className="space-y-4">

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-gray-50 border rounded-lg p-4"
              >

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">

                  {/* Item */}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Item *</label>
                    <ItemSelect
                      items={items?.items || []}
                      value={watch(`adjustmentLines.${index}.itemId`)}
                      onChange={(val) =>
                        setValue(`adjustmentLines.${index}.itemId`, val)
                      }
                      error={errors.adjustmentLines?.[index]?.itemId?.message}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Qty *</label>
                    <input
                      {...register(`adjustmentLines.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                    {errors.adjustmentLines?.[index]?.quantity && (
                      <p className="text-red-500 text-sm">
                        {errors.adjustmentLines[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type *</label>
                    <select
                      {...register(`adjustmentLines.${index}.adjustmentType`)}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    >
                      <option value="SURPLUS">SURPLUS</option>
                      <option value="DEFICIT">DEFICIT</option>
                    </select>
                  </div>

                  {/* Remove */}
                  <div className="flex items-end">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}

          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Post Adjustment"}
            </button>

          </div>

        </form>
      </div>
    </div>
  </div>
);
};

export default CreateAdjustmentModal;