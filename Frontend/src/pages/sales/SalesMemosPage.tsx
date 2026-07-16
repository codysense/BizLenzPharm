// frontend/src/pages/sales/SalesMemosPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoApi, salesApi, managementApi } from '../../lib/api';

const SalesMemosPage: React.FC = () => {
  const queryClient = useQueryClient();

  // form state
  const [customerId, setCustomerId] = useState('');
  const [chartOfAccountId, setChartOfAccountId] = useState('');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState<number>();
  const [description, setDescription] = useState('');

  // fetch customers + CoA
  const { data: customers } = useQuery({
        queryKey: ['customers-for-memo'],
        queryFn: () => salesApi.getCustomers({limit: 100 })
      });
    const { data: chartOfAccounts } = useQuery({
        queryKey: ['COA-for-memo'],
        queryFn: () =>  managementApi.getChartOfAccounts()
      });

  // fetch history
 const {data: memos}= useQuery({
     queryKey:["sales-memos"],
     queryFn: ()=>memoApi.getSalesMemos({limit:100})
   })

  //  console.log(memos)

 

// mutation
const createMemo = useMutation({
  mutationFn: (data: {
    customerId: string;
    chartOfAccountId: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    description?: string;
  }) => memoApi.createSalesMemo(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["sales-memos"] });
  },
});




 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  createMemo.mutate({ customerId, chartOfAccountId, type, amount, description });
};

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Sales Memos</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full">
          <option value="">Select Customer</option>
          {customers?.customers?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={chartOfAccountId} onChange={(e) => setChartOfAccountId(e.target.value)} className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full">
          <option value="">Select Chart of Account</option>
          {chartOfAccounts?.accounts?.map((coa: any) => (
            <option key={coa.id} value={coa.id}>{coa.code} - {coa.name}</option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value as 'CREDIT' | 'DEBIT')} className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full">
          <option value="CREDIT">Credit Memo</option>
          <option value="DEBIT">Debit Memo</option>
        </select>

        <input
          type="number"
          placeholder= "0.0"
          value={amount}
          step="0.01"
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full"
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full"
        />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          {createMemo.isLoading ? 'Saving...' : 'Add Memo'}
        </button>
      </form>

      {/* History */}
      <h2 className="text-lg font-semibold text-gray-600 mb-2">Memo History</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-left">
            <th className="p-2 border">Customer</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Chart of Account</th>
            <th className="p-2 border">Description</th>
          </tr>
        </thead>
        <tbody>
          {memos?.data?.map((m: any) => (
            <tr key={m.id}>
              <td className="p-2 border">{m.customer?.name}</td>
              <td className="p-2 border">{m.type}</td>
              <td className="p-2 border">{m.amount}</td>
              <td className="p-2 border">{m.chartOfAccount?.name}</td>
              <td className="p-2 border">{m.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesMemosPage;
