import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cashApi } from '../../lib/api';
import toast from 'react-hot-toast';

const importBankStatementSchema = z.object({
  cashAccountId: z.string().min(1, 'Cash account is required'),
});

type ImportBankStatementFormData = z.infer<typeof importBankStatementSchema>;

interface ImportBankStatementModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportBankStatementModal = ({ onClose, onSuccess }: ImportBankStatementModalProps) => {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ImportBankStatementFormData>({
    resolver: zodResolver(importBankStatementSchema)
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-import'],
    queryFn: () => cashApi.getCashAccounts()
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.toLowerCase()] = values[index] || '';
            });
            return row;
          });

        setCsvData(data);
        setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
      };
      
      reader.readAsText(file);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const onSubmit = async (data: ImportBankStatementFormData) => {
    try {
      if (csvData.length === 0) {
        toast.error('Please upload a CSV file first');
        return;
      }

      // Transform CSV data to expected format
      const transformedData = csvData.map(row => ({
        date: row.date || row.transaction_date || row.value_date,
        description: row.description || row.narration || row.details,
        amount: parseFloat(row.amount || row.credit || row.debit || '0'),
        type: row.type || (parseFloat(row.amount || '0') > 0 ? 'RECEIPT' : 'PAYMENT'),
        reference: row.reference || row.ref || row.transaction_ref
      }));

      await cashApi.importBankStatement({
        cashAccountId: data.cashAccountId,
        csvData: transformedData
      });
      
      toast.success(`Imported ${transformedData.length} bank statement lines`);
      onSuccess();
    } catch (error) {
      console.error('Import bank statement error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Import Bank Statement
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
                  Bank Account *
                </label>
                <select
                  {...register('cashAccountId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select bank account</option>
                  {cashAccounts?.accounts?.filter((acc: any) => acc.accountType === 'BANK').map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name} ({account.bankName})
                    </option>
                  ))}
                </select>
                {errors.cashAccountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.cashAccountId.message}</p>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Statement CSV File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a CSV file</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV files only</p>
                  </div>
                </div>
                {csvFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {csvFile.name} ({csvData.length} transactions)
                  </p>
                )}
              </div>

              {/* CSV Format Guide */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Expected CSV Format:</h4>
                    <div className="mt-2 text-sm text-blue-800">
                      <p className="mb-2">Your CSV should contain these columns (case-insensitive):</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Date:</strong> date, transaction_date, or value_date</li>
                        <li><strong>Description:</strong> description, narration, or details</li>
                        <li><strong>Amount:</strong> amount, credit, or debit (positive for receipts, negative for payments)</li>
                        <li><strong>Reference:</strong> reference, ref, or transaction_ref (optional)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Data */}
              {previewData.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Preview (First 5 rows)
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.date || row.transaction_date || row.value_date || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {row.description || row.narration || row.details || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className={parseFloat(row.amount || '0') >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₦{Math.abs(parseFloat(row.amount || '0')).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.reference || row.ref || row.transaction_ref || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                  disabled={isSubmitting || csvData.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Importing...' : `Import ${csvData.length} Transactions`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportBankStatementModal;