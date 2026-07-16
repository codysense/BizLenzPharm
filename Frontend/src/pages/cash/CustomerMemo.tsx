// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { X } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import { cashApi, managementApi, salesApi } from '../../lib/api';
// import toast from 'react-hot-toast';
// import { CustomerSelect } from '../../components/CustomerSelect';

// const createCustomerMemoSchema = z.object({
//   customerId: z.string().min(1, 'Customer account is required'),
//   glAccountId: z.string().min(1, 'GL account is required'),
//   transactionType: z.enum(['RECEIPT', 'PAYMENT']),
//   amount: z.number().positive('Amount must be positive'),
//   description: z.string().min(1, 'Description is required'),
//   transactionDate: z.string().min(1, 'Transaction date is required'),
//   reference: z.string().optional(),
//   contraAccountId: z.string().cuid().optional().nullable(),
// });

// type CreateCashTransactionFormData = z.infer<typeof createCustomerJournalSchema>;

// interface CreateCashTransactionModalProps {
//   onClose: () => void;
//   onSuccess: () => void;
// }

// const CustomerMemo = ({ onClose, onSuccess }: CreateCashTransactionModalProps) => {
//   const {
//     register,
//     handleSubmit,
//     watch,
//     reset,
//     getValues,
//     formState: { errors, isSubmitting }
//   } = useForm<CreateCashTransactionFormData>({
//     resolver: zodResolver(createCustomerJournalSchema),
//     defaultValues: {
//       transactionDate: new Date().toISOString().split('T')[0],
//       transactionType: 'RECEIPT'
//     }
//   });

//   const { data: customers } = useQuery({
//       queryKey: ['customers-for-memo'],
//       queryFn: () => salesApi.getCustomers({ limit: 100 })
//     });

    
//   const { data: chartAccounts } = useQuery({
//     queryKey: ['chart-accounts-for-transaction'],
//     queryFn: () => managementApi.getChartOfAccounts()
//   });

//   const watchedType = watch('transactionType');

//   const onSubmit = async (data: CreateCashTransactionFormData) => {
//     try {
//       await cashApi.createCashTransaction(data);
//       toast.success('Cash transaction recorded successfully');
//       onSuccess();
//     } catch (error) {
//       console.error('Create cash transaction error:', error);
//     }
//   };

//   console.log(chartAccounts)
//   // Filter GL accounts based on transaction type
//   // const getFilteredGLAccounts = () => {
//   //   if (!chartAccounts?.accounts) return [];
    
//   //   if (watchedType === 'RECEIPT') {
//   //     // For receipts, show income and receivable accounts
//   //     return chartAccounts.accounts.filter((acc: any) => 
//   //       ['INCOME', 'OTHER_INCOME', 'TRADE_RECEIVABLES'].includes(acc.accountType)
//   //     );
//   //   } else {
//   //     // For payments, show expense and payable accounts
//   //     return chartAccounts.accounts.filter((acc: any) => 
//   //       ['EXPENSES', 'COST_OF_SALES', 'TRADE_PAYABLES', 'CURRENT_LIABILITY'].includes(acc.accountType)
//   //     );
//   //   }
//   // };

//   return (
//     <div className="fixed inset-0 z-50 overflow-y-auto">
//       <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
//         <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
//         <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
//           <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg leading-6 font-medium text-gray-900">
//                 Record Cash Transaction
//               </h3>
//               <button
//                 onClick={onClose}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X className="h-6 w-6" />
//               </button>
//             </div>
            
//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Transaction Type *
//                   </label>
//                   <select
//                     {...register('transactionType')}
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   >
//                     <option value="RECEIPT">Cash Receipt</option>
//                     <option value="PAYMENT">Cash Payment</option>
//                   </select>
//                   {errors.transactionType && (
//                     <p className="mt-1 text-sm text-red-600">{errors.transactionType.message}</p>
//                   )}
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Transaction Date *
//                   </label>
//                   <input
//                     {...register('transactionDate')}
//                     type="date"
//                     className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   />
//                   {errors.transactionDate && (
//                     <p className="mt-1 text-sm text-red-600">{errors.transactionDate.message}</p>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Customers *
//                 </label>
//                  <CustomerSelect
//                     customers={customers?.customers || []}
//                      value={watch("customerId")}
//                     onChange={(val) => reset({ ...getValues(), customerId: val })}
//                     error={errors.customerId?.message}
//                     />
//                 {/* <select
//                   {...register('cashAccountId')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 >
//                   <option value="">Select cash account</option>
//                   {cashAccounts?.accounts?.map((account: any) => (
//                     <option key={account.id} value={account.id}>
//                       {account.code} - {account.name} (₦{Number(account.balance).toLocaleString()})
//                     </option>
//                   ))}
//                 </select>
//                 {errors.cashAccountId && (
//                   <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
//                 )} */}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   GL Account * ({watchedType === 'RECEIPT' ? 'Credit Account' : 'Debit Account'})
//                 </label>
//                 <select
//                   {...register('glAccountId')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 >
//                   <option value="">Select GL account</option>
//                   {chartAccounts?.accounts?.map((account: any) => (
//                     <option key={account.id} value={account.id}>
//                       {account.code} - {account.name}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.glAccountId && (
//                   <p className="mt-1 text-sm text-red-600">{errors.glAccountId.message}</p>
//                 )}
//                 <p className="mt-1 text-xs text-gray-500">
//                   {watchedType === 'RECEIPT' 
//                     ? 'This account will be credited (source of funds)'
//                     : 'This account will be debited (use of funds)'
//                   }
//                 </p>
//               </div>

//               {/* <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Contra Account (Optional)
//                 </label>
//                 <select
//                   {...register('contraAccountId')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 >
//                   <option value="">No contra account</option>
//                   {chartAccounts?.accounts?.map((account: any) => (
//                     <option key={account.id} value={account.id}>
//                       {account.code} - {account.name}
//                     </option>
//                   ))}
//                 </select>
//                 <p className="mt-1 text-xs text-gray-500">
//                   For contra entries (e.g., bank transfers between accounts)
//                 </p>
//               </div> */}
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Amount *
//                 </label>
//                 <input
//                   {...register('amount', { valueAsNumber: true })}
//                   type="number"
//                   step="0.01"
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   placeholder="0.00"
//                 />
//                 {errors.amount && (
//                   <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Reference
//                 </label>
//                 <input
//                   {...register('reference')}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   placeholder="Check number, transfer reference, etc."
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700">
//                   Description *
//                 </label>
//                 <textarea
//                   {...register('description')}
//                   rows={3}
//                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   placeholder={`Enter ${watchedType === 'RECEIPT' ? 'receipt' : 'payment'} description`}
//                 />
//                 {errors.description && (
//                   <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
//                 )}
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
//                   className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
//                     watchedType === 'RECEIPT' 
//                       ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
//                       : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
//                   }`}
//                 >
//                   {isSubmitting ? 'Recording...' : `Record ${watchedType === 'RECEIPT' ? 'Receipt' : 'Payment'}`}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CustomerMemo;