// frontend/src/pages/purchase/PurchaseMemosPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoApi, purchaseApi, managementApi } from '../../lib/api';

const PurchaseMemosPage: React.FC = () => {
  const queryClient = useQueryClient();

  // form state
  const [vendorId, setVendorId] = useState('');
  const [chartOfAccountId, setChartOfAccountId] = useState('');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState<number>();
  const [description, setDescription] = useState('');

  // fetch vendors + CoA
//   const { data: vendors } = useQuery(['vendors'], () => purchaseApi.getVendors());

  const { data: vendors } = useQuery({
      queryKey: ['vendors-for-memo'],
      queryFn: () => purchaseApi.getVendors({limit: 100 })
    });
  const { data: chartOfAccounts } = useQuery({
      queryKey: ['COA-for-memo'],
      queryFn: () =>  managementApi.getChartOfAccounts()
    });

  

  const { data: memos, isLoading, error } = useQuery({
  queryKey: ["purchase-memos"],
  queryFn: () => memoApi.getPurchaseMemos({ limit: 100 }),
});

console.log("memos:", memos); //  will be an array


  // mutation
const createMemo = useMutation({
  mutationFn: (data: {
    vendorId: string;
    chartOfAccountId: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    description?: string;
  }) => memoApi.createPurchaseMemo(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["memos"] });
  },
});




 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  createMemo.mutate({ vendorId, chartOfAccountId, type, amount, description });
};

console.log(memos)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Purchase Memos</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="border  border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full">
          <option value="">Select Vendor</option>
          {vendors?.vendors?.map((v: any) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        <select value={chartOfAccountId} onChange={(e) => setChartOfAccountId(e.target.value)} className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm  p-2 w-full">
          <option value="">Select Chart of Account</option>
          {chartOfAccounts?.accounts?.map((coa: any) => (
            <option key={coa.id} value={coa.id}>{coa.code} - {coa.name}</option>
          ))}
        </select>

        <select value={type} onChange={(e) => setType(e.target.value as 'CREDIT' | 'DEBIT')} className="border  border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm  p-2 w-full">
          <option value="CREDIT">Credit Memo</option>
          <option value="DEBIT">Debit Memo</option>
        </select>

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 w-full"
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm  p-2 w-full"
        />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
          {createMemo.isLoading ? 'Saving...' : 'Add Memo'}
        </button>
      </form>

      {/* History */}
      <h2 className="text-lg font-semibold mb-2 text-gray-600">Memo History</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-left">
            <th className="p-2 border ">Vendor</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Chart of Account</th>
            <th className="p-2 border">Description</th>
          </tr>
        </thead>
        <tbody>
          {memos?.data?.map((m: any) => (
            <tr key={m.id}>
              <td className="p-2 border text-gray-400">{m.vendor?.name}</td>
              <td className="p-2 border  text-gray-400">{m.type}</td>
              <td className="p-2 border  text-gray-400">{m.amount}</td>
              <td className="p-2 border  text-gray-400">{m.chartOfAccount?.name}</td>
              <td className="p-2 border  text-gray-400">{m.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseMemosPage;
