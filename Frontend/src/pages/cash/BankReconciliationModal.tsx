import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cashApi } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const bankReconciliationSchema = z.object({
  cashAccountId: z.string().min(1, 'Cash account is required'),
  statementDate: z.string().min(1, 'Statement date is required'),
  statementBalance: z.number(),
});

type BankReconciliationFormData = z.infer<typeof bankReconciliationSchema>;

interface BankReconciliationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BankReconciliationModal = ({ onClose, onSuccess }: BankReconciliationModalProps) => {
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<BankReconciliationFormData>({
    resolver: zodResolver(bankReconciliationSchema),
    defaultValues: {
      statementDate: new Date().toISOString().split('T')[0]
    }
  });

  const selectedCashAccountId = watch('cashAccountId');
  const selectedStatementDate = watch('statementDate');

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-reconciliation'],
    queryFn: () => cashApi.getCashAccounts()
  });

  const { data: reconciliationData } = useQuery({
    queryKey: ['bank-reconciliation', selectedCashAccountId, selectedStatementDate],
    queryFn: () => selectedCashAccountId && selectedStatementDate ? 
      cashApi.getBankReconciliation({ 
        cashAccountId: selectedCashAccountId, 
        statementDate: selectedStatementDate 
      }) : null,
    enabled: !!(selectedCashAccountId && selectedStatementDate)
  });

  const handleTransactionToggle = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const onSubmit = async (data: BankReconciliationFormData) => {
    try {
      await cashApi.reconcileTransactions({
        ...data,
        transactionIds: selectedTransactions,
        bookBalance: reconciliationData?.bookBalance || 0,
        reconciliationDate: data.statementDate
      });
      toast.success('Bank reconciliation completed successfully');
      onSuccess();
    } catch (error) {
      console.error('Bank reconciliation error:', error);
    }
  };

  const reconciledBalance = selectedTransactions.reduce((balance, transactionId) => {
    const transaction = reconciliationData?.unreconciledTransactions?.find((t: any) => t.id === transactionId);
    if (transaction) {
      return balance + (transaction.transactionType === 'RECEIPT' ? Number(transaction.amount) : -Number(transaction.amount));
    }
    return balance;
  }, reconciliationData?.bookBalance || 0);

  const difference = (watch('statementBalance') || 0) - reconciledBalance;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Bank Reconciliation
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cash Account *
                  </label>
                  <select
                    {...register('cashAccountId')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select cash account</option>
                    {cashAccounts?.accounts?.filter((acc: any) => acc.accountType === 'BANK').map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                  {errors.cashAccountId && (
                    <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Statement Date *
                  </label>
                  <input
                    {...register('statementDate')}
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.statementDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.statementDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Statement Balance *
                  </label>
                  <input
                    {...register('statementBalance', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.statementBalance && (
                    <p className="mt-1 text-sm text-red-600">{errors.statementBalance.message}</p>
                  )}
                </div>
              </div>

              {reconciliationData && (
                <>
                  {/* Reconciliation Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <div>
                        <span className="text-sm text-gray-500">Book Balance:</span>
                        <div className="font-medium">₦{reconciliationData.bookBalance.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Statement Balance:</span>
                        <div className="font-medium">₦{(watch('statementBalance') || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Reconciled Balance:</span>
                        <div className="font-medium">₦{reconciledBalance.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Difference:</span>
                        <div className={`font-medium ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                          ₦{difference.toLocaleString()}
                          {Math.abs(difference) < 0.01 && <CheckCircle className="h-4 w-4 inline ml-1" />}
                          {Math.abs(difference) >= 0.01 && <AlertCircle className="h-4 w-4 inline ml-1" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unreconciled Transactions */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      Unreconciled Transactions ({reconciliationData.unreconciledTransactions?.length || 0})
                    </h4>
                    
                    {reconciliationData.unreconciledTransactions?.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTransactions(reconciliationData.unreconciledTransactions.map((t: any) => t.id));
                                    } else {
                                      setSelectedTransactions([]);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reconciliationData.unreconciledTransactions.map((transaction: any) => (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedTransactions.includes(transaction.id)}
                                    onChange={() => handleTransactionToggle(transaction.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(transaction.transactionDate).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-900">
                                  {transaction.description}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <StatusBadge 
                                    status={transaction.transactionType} 
                                    variant={transaction.transactionType === 'RECEIPT' ? 'success' : 'warning'} 
                                  />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  <span className={transaction.transactionType === 'RECEIPT' ? 'text-green-600' : 'text-red-600'}>
                                    {transaction.transactionType === 'RECEIPT' ? '+' : '-'}₦{transaction.amount.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border border-gray-200 rounded-lg">
                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-500">All transactions are reconciled</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Math.abs(difference) >= 0.01}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Reconciling...' : 'Complete Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankReconciliationModal;