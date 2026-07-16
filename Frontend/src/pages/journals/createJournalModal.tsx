import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { journalApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

const createJournalSchema = z.object({
  journalDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  note: z.string().optional(),
  journalLines: z.array(
    z.object({
      accountId: z.string().min(1, "Account is required"),
      debit: z.number(),
      credit: z.number(),
    }),
  ),
});

type CreateJournalFormData = z.infer<typeof createJournalSchema>;

interface CreateJournalModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateJournalModal = ({
  onClose,
  onSuccess,
}: CreateJournalModalProps) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    // getValues,
    // reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateJournalFormData>({
    resolver: zodResolver(createJournalSchema),
    defaultValues: {
      journalDate: new Date().toISOString().split("T")[0],
      journalLines: [{ accountId: "", debit: 0, credit: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "journalLines",
  });

  const watchedLines = watch("journalLines");

  const { data: chartAccounts } = useQuery({
    queryKey: ["chartAccounts-for-Journal"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  //   const { data: items } = useQuery({
  //     queryKey: ['items-for-Journals'],
  //     queryFn: () => inventoryApi.getItems({  limit: 100 })
  //   });

  const calculateDebitTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.debit || 0);
    }, 0);
  };
  const calculateCreditTotal = () => {
    return watchedLines.reduce((sum, line) => {
      return sum + (line.credit || 0);
    }, 0);
  };

  const onSubmit = async (data: CreateJournalFormData) => {
    try {
      await journalApi.createJournal(data);
      toast.success("Journal order created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create Journal error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Create Journal</h3>
            <p className="text-xs text-blue-100">Journal Entry Posting</p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {/* Header Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm text-gray-600">Date *</label>
                <input
                  {...register("journalDate")}
                  type="date"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.journalDate && (
                  <p className="text-sm text-red-500">
                    {errors.journalDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600">Note *</label>
                <input
                  {...register("note")}
                  type="text"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.note && (
                  <p className="text-sm text-red-500">{errors.note.message}</p>
                )}
              </div>
            </div>

            {/* Journal Lines Header */}
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">Journal Entries</h4>

              <button
                type="button"
                onClick={() => append({ accountId: "", debit: 0, credit: 0 })}
                className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Line
              </button>
            </div>

            {/* Lines */}
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Account */}
                    <div className="sm:col-span-2">
                      <label className="text-sm text-gray-600">Account *</label>

                      <ChartAccountSelect
                        accounts={chartAccounts?.accounts || []}
                        value={watch(`journalLines.${index}.accountId`)}
                        onChange={(val) =>
                          setValue(`journalLines.${index}.accountId`, val, {
                            shouldDirty: true,
                          })
                        }
                        error={errors.journalLines?.[index]?.accountId?.message}
                      />
                    </div>

                    {/* Debit */}
                    <div>
                      <label className="text-sm text-gray-600">Debit</label>
                      <input
                        {...register(`journalLines.${index}.debit`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        className="mt-1 w-full border rounded-lg px-3 py-2"
                      />
                    </div>

                    {/* Credit */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-sm text-gray-600">Credit</label>
                        <input
                          {...register(`journalLines.${index}.credit`, {
                            valueAsNumber: true,
                          })}
                          type="number"
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                        />
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-sm text-gray-600">Total Debit</div>
                <div className="text-2xl font-bold text-red-600">
                  ₦{calculateDebitTotal().toLocaleString()}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-sm text-gray-600">Total Credit</div>
                <div className="text-2xl font-bold text-blue-600">
                  ₦{calculateCreditTotal().toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-end gap-3 bg-white">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              {isSubmitting ? "Posting..." : "Post Journal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJournalModal;
