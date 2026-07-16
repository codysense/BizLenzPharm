import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cashApi, salesApi, managementApi } from "../../lib/api";
import toast from "react-hot-toast";
import { CustomerSelect } from "../../components/CustomerSelect";
import { ChartAccountSelect } from "../../components/ChartAccountSelect";

//Schema
const createCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  cashAccountId: z.string().min(1, "Cash account is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),

  lines: z
    .array(
      z.object({
        saleId: z.string().optional().nullable(),
        glAccountId: z.string().min(1, "GL Account is required"),
        lineAmount: z.coerce.number().positive("Amount must be positive"),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one payment line is required"),
});

type FormData = z.infer<typeof createCustomerPaymentSchema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerPaymentModal = ({ onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createCustomerPaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split("T")[0],
      lines: [
        { saleId: null, glAccountId: "", lineAmount: 0, description: "" },
      ],
    },
  });

  const selectedCustomerId = watch("customerId");
  const watchedLines = watch("lines");

  //Queries
  const { data: customers } = useQuery({
    queryKey: ["customers-for-payment"],
    queryFn: () => salesApi.getCustomers({ limit: 100 }),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-payment"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const { data: customerSales } = useQuery({
    queryKey: ["customer-sales", selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? salesApi.getSales({
            customerId: selectedCustomerId,
            status: "INVOICED",
            limit: 100,
          })
        : null,
    enabled: !!selectedCustomerId,
  });
  // console.log(customerSales)
  const { data: chartAccounts } = useQuery({
    queryKey: ["chart-accounts-for-transaction"],
    queryFn: () => managementApi.getChartOfAccounts(),
  });

  //Field arrays
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const receivableAcct = chartAccounts?.accounts?.find(
    (a: any) => String(a.code) === "1200",
  );

  //Atuo filled amount
  useEffect(() => {
    if (!customerSales?.sales) return;

    watchedLines.forEach((line, index) => {
      if (!line.saleId) return;

      const sale = customerSales.sales.find(
        (s: any) => String(s.id) === String(line.saleId),
      );

      if (sale) {
        setValue(`lines.${index}.lineAmount`, Number(sale.totalAmount), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    });
  }, [watchedLines, customerSales?.sales, setValue]);

  // Total Calculation
  const calculateTotal = () => {
    return watchedLines.reduce((sum, line) => sum + (line.lineAmount || 0), 0);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await cashApi.createCustomerPayment(data);
      toast.success("Customer payment recorded successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create payment");
    }
  };

  // Pre fill chart of account
  useEffect(() => {
    if (!chartAccounts?.accounts?.length) return;

    const receivableAcct = chartAccounts.accounts.find(
      (a: any) => String(a.code) === "1200",
    );

    if (!receivableAcct) return;

    const currentValue = getValues("lines.0.glAccountId");

    if (!currentValue) {
      setValue("lines.0.glAccountId", String(receivableAcct.id), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [chartAccounts?.accounts, getValues, setValue]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block bg-white rounded-xl shadow-xl transform transition-all sm:max-w-5xl sm:w-full sm:my-8">
          {/* HEADER (Gradient) */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Record Customer Payment
              </h3>
              <p className="text-xs text-blue-100">
                Allocate customer receipts across invoices or accounts
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* BODY */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white px-6 py-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Row 1 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Customer *
                    </label>

                    <CustomerSelect
                      customers={customers?.customers || []}
                      value={watch("customerId")}
                      onChange={(v) => setValue("customerId", v)}
                    />

                    {errors.customerId && (
                      <p className="text-red-600 text-sm">
                        {errors.customerId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Date *
                    </label>
                    <input
                      {...register("paymentDate")}
                      type="date"
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Cash Account *
                    </label>

                    <select
                      {...register("cashAccountId")}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Select cash account</option>
                      {cashAccounts?.accounts?.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name} (₦
                          {Number(a.balance).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reference
                    </label>
                    <input
                      {...register("reference")}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                      placeholder="Cheque / Transfer ref"
                    />
                  </div>
                </div>

                {/* LINES */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Payment Lines
                    </h4>

                    <button
                      type="button"
                      onClick={() =>
                        append({
                          saleId: null,
                          glAccountId: receivableAcct?.id || "",
                          lineAmount: 0,
                          description: "",
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Line
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-gray-50 border rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-8 gap-4">
                          {/* Sale */}
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                              Sale (optional)
                            </label>

                            <select
                              {...register(`lines.${index}.saleId`)}
                              className="mt-1 w-full border rounded-md px-3 py-2"
                            >
                              <option value="">Select sale</option>
                              {customerSales?.sales?.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  #{s.orderNo} — ₦
                                  {Number(s.totalAmount).toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* GL */}
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                              GL Account *
                            </label>

                            <ChartAccountSelect
                              accounts={chartAccounts?.accounts || []}
                              value={watch(`lines.${index}.glAccountId`)}
                              onChange={(v) =>
                                setValue(`lines.${index}.glAccountId`, v)
                              }
                            />
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Amount
                            </label>
                            <input
                              {...register(`lines.${index}.lineAmount`, {
                                valueAsNumber: true,
                              })}
                              type="number"
                              step="0.01"
                              className="mt-1 w-full border rounded-md px-3 py-2"
                            />
                          </div>

                          {/* Description */}
                          <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <input
                              {...register(`lines.${index}.description`)}
                              className="mt-1 w-full border rounded-md px-3 py-2"
                            />
                          </div>

                          {/* Remove */}
                          <div className="flex items-end">
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-2 text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TOTAL */}
                <div className="bg-blue-50 p-4 rounded-lg flex justify-between">
                  <span className="font-medium text-gray-900">
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </form>
            </div>

            {/* FOOTER */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
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
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerPaymentModal;

// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { X } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import { cashApi, salesApi } from '../../lib/api';
// import StatusBadge from '../../components/StatusBadge';
// import toast from 'react-hot-toast';
// import { CustomerSelect } from '../../components/CustomerSelect';

// // const createCustomerPaymentSchema = z.object({
// //   customerId: z.string().min(1, 'Customer is required'),
// //   cashAccountId: z.string().min(1, 'Cash account is required'),
// //   amount: z.number().positive('Amount must be positive'),
// //   paymentDate: z.string().min(1, 'Payment date is required'),
// //   reference: z.string().optional(),
// //   notes: z.string().optional(),
// //   saleId: z.string().optional(),
// // });

// const createCustomerPaymentSchema = z.object({
//   customerId: z.string(),
//   cashAccountId: z.string(),
//   paymentDate: z.string(),
//   reference: z.string().optional(),
//   notes: z.string().optional(),

//   lines: z.array(
//     z.object({
//       saleId: z.string().optional().nullable(),
//       glAccountId: z.string(),
//       lineAmount: z.coerce.number().positive(),
//       description: z.string().optional()
//     })
//   ).min(1, "At least one payment line is required")
// });

// type CreateCustomerPaymentFormData = z.infer<typeof createCustomerPaymentSchema>;

// interface CreateCustomerPaymentModalProps {
//   onClose: () => void;
//   onSuccess: () => void;
// }

// const CreateCustomerPaymentModal = ({ onClose, onSuccess }: CreateCustomerPaymentModalProps) => {
//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     reset,
//     getValues,
//     formState: { errors, isSubmitting }
//   } = useForm<CreateCustomerPaymentFormData>({
//     resolver: zodResolver(createCustomerPaymentSchema),
//     defaultValues: {
//       paymentDate: new Date().toISOString().split('T')[0]
//     }
//   });

//   const selectedCustomerId = watch('customerId');
//   const selectedSaleId = watch('saleId');

//   const { data: customers } = useQuery({
//     queryKey: ['customers-for-payment'],
//     queryFn: () => salesApi.getCustomers({ limit: 100 })
//   });

//   const { data: cashAccounts } = useQuery({
//     queryKey: ['cash-accounts-for-payment'],
//     queryFn: () => cashApi.getCashAccounts()
//   });

//   const { data: customerSales } = useQuery({
//     queryKey: ['customer-sales', selectedCustomerId],
//     queryFn: () => selectedCustomerId ?
//       salesApi.getSales({ customerId: selectedCustomerId, status: 'INVOICED', limit: 100 }) : null,
//     enabled: !!selectedCustomerId
//   });

//   // Auto-populate amount when sale is selected
//   React.useEffect(() => {
//     if (selectedSaleId && customerSales?.sales) {
//       const selectedSale = customerSales.sales.find((sale: any) => sale.id === selectedSaleId);
//       if (selectedSale) {
//         setValue('amount', selectedSale.totalAmount);
//       }
//     }
//   }, [selectedSaleId, customerSales, setValue]);

//   const onSubmit = async (data: CreateCustomerPaymentFormData) => {
//     try {
//       await cashApi.createCustomerPayment(data);

//       toast.success('Customer payment recorded successfully');
//       onSuccess();
//     } catch (error) {
//       console.error('Create customer payment error:', error);
//     }
//   };

//   const selectedCustomer = customers?.customers?.find((customer: any) => customer.id === selectedCustomerId);
//   const selectedSale = customerSales?.sales?.find((sale: any) => sale.id === selectedSaleId);

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

//         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
//           <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg leading-6 font-medium text-gray-900">
//                 Record Customer Payment
//               </h3>
//               <button
//                 onClick={onClose}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X className="h-6 w-6" />
//               </button>
//             </div>

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Customer *
//                 </label>

//                 <CustomerSelect
//                   value={watch("customerId")}
//                   onChange={(val) => reset({ ...getValues(), customerId: val })}
//                   error={errors.customerId?.message}
//                 />

//                 {/* <select
//                   {...register('customerId')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 >
//                   <option value="">Select customer</option>
//                   {customers?.customers?.map((customer: any) => (
//                     <option key={customer.id} value={customer.id}>
//                       {customer.code} - {customer.name}
//                     </option>
//                   ))}
//                 </select> */}
//                 {errors.customerId && (
//                   <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
//                 )}
//               </div>

//               {selectedCustomerId && customerSales?.sales && customerSales.sales.length > 0 && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Sales Order (Optional)
//                   </label>
//                   <select
//                     {...register('saleId')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="">General payment (not against specific order)</option>
//                     {customerSales.sales.map((sale: any) => (
//                       <option key={sale.id} value={sale.id}>
//                         {sale.orderNo} - ₦{sale.totalAmount.toLocaleString()} ({sale.status})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {selectedSale && (
//                 <div className="bg-blue-50 p-4 rounded-lg">
//                   <div className="grid grid-cols-2 gap-4 text-sm">
//                     <div>
//                       <span className="text-gray-500">Order No:</span>
//                       <div className="font-medium">{selectedSale.orderNo}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Invoice Amount:</span>
//                       <div className="font-medium">₦{selectedSale.totalAmount.toLocaleString()}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Order Date:</span>
//                       <div className="font-medium">{new Date(selectedSale.orderDate).toLocaleDateString()}</div>
//                     </div>
//                     <div>
//                       <span className="text-gray-500">Status:</span>
//                       <div><StatusBadge status={selectedSale.status} /></div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Cash Account *
//                   </label>
//                   <select
//                     {...register('cashAccountId')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="">Select cash account</option>
//                     {cashAccounts?.accounts?.map((account: any) => (
//                       <option key={account.id} value={account.id}>
//                         {account.code} - {account.name} (₦{Number(account.balance).toLocaleString()})
//                       </option>
//                     ))}
//                   </select>
//                   {errors.cashAccountId && (
//                     <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Payment Date *
//                   </label>
//                   <input
//                     {...register('paymentDate')}
//                     type="date"
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   />
//                   {errors.paymentDate && (
//                     <p className="mt-1 text-sm text-red-600">{errors.paymentDate.message}</p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Amount Received *
//                   </label>
//                   <input
//                     {...register('amount', { valueAsNumber: true })}
//                     type="number"
//                     step="0.01"
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     placeholder="0.00"
//                   />
//                   {errors.amount && (
//                     <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Reference
//                   </label>
//                   <input
//                     {...register('reference')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     placeholder="Check number, transfer ref, etc."
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Notes
//                 </label>
//                 <textarea
//                   {...register('notes')}
//                   rows={3}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   placeholder="Payment notes or additional details"
//                 />
//               </div>

//               <div className="bg-green-50 p-4 rounded-lg">
//                 <h4 className="text-sm font-medium text-green-900 mb-2">Accounting Impact:</h4>
//                 <div className="text-sm text-green-800 space-y-1">
//                   <div>• Cash Account will be <strong>debited</strong> (increased)</div>
//                   <div>• Trade Receivables will be <strong>credited</strong> (decreased)</div>
//                   <div>• Customer balance will be reduced</div>
//                 </div>
//               </div>

//               <div className="flex justify-end space-x-3 pt-4">
//                 <button
//                   type="button"
//                   onClick={onClose}
//                   className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={isSubmitting}
//                   className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isSubmitting ? 'Recording...' : 'Record Payment'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateCustomerPaymentModal;
