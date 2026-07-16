import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, DollarSign, Receipt, Calendar } from 'lucide-react';
import { cashApi, salesApi } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import CreateSalesReceiptModal from './CreateSalesReceiptModal';

interface SalesReceipt {
  id: string;
  receiptNo: string;
  saleId?: string;
  customerId: string;
  cashAccountId: string;
  amountReceived: number;
  receiptDate: string;
  reference?: string;
  notes?: string;
  userId: string;
  createdAt: string;
  sale?: {
    orderNo: string;
    totalAmount: number;
    status: string;
  };
  customer: {
    code: string;
    name: string;
  };
  cashAccount: {
    code: string;
    name: string;
    accountType: string;
  };
  user: {
    name: string;
  };
}

const SalesReceipts = () => {
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState('');
  const [cashAccountFilter, setCashAccountFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales-receipts', { 
      page, 
      customerId: customerFilter,
      cashAccountId: cashAccountFilter
    }],
    queryFn: () => cashApi.getSalesReceipts({ 
      page, 
      limit: 10,
      ...(customerFilter && { customerId: customerFilter }),
      ...(cashAccountFilter && { cashAccountId: cashAccountFilter })
    })
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-for-receipts'],
    queryFn: () => salesApi.getCustomers({ limit: 100 })
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-receipts'],
    queryFn: () => cashApi.getCashAccounts()
  });

  const columns = [
    {
      key: 'receiptNo',
      header: 'Receipt No',
      width: 'w-32'
    },
    {
      key: 'customer.name',
      header: 'Customer',
      width: 'w-48'
    },
    {
      key: 'sale.orderNo',
      header: 'Sales Order',
      cell: (receipt: SalesReceipt) => receipt.sale?.orderNo || 'General Payment',
      width: 'w-32'
    },
    {
      key: 'amountReceived',
      header: 'Amount Received',
      cell: (receipt: SalesReceipt) => `₦${receipt.amountReceived.toLocaleString()}`,
      width: 'w-32'
    },
    {
      key: 'cashAccount.name',
      header: 'Cash Account',
      cell: (receipt: SalesReceipt) => (
        <div>
          <div className="font-medium">{receipt.cashAccount.name}</div>
          <div className="text-xs text-gray-500">{receipt.cashAccount.accountType}</div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'receiptDate',
      header: 'Receipt Date',
      cell: (receipt: SalesReceipt) => new Date(receipt.receiptDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (receipt: SalesReceipt) => receipt.reference || '-',
      width: 'w-32'
    },
    {
      key: 'user.name',
      header: 'Received By',
      width: 'w-32'
    }
  ];

  const handleCreateReceipt = () => {
    refetch();
    setShowCreateModal(false);
  };

  const actions = (receipt: SalesReceipt) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          // View details functionality can be added later
          console.log('View receipt details:', receipt);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Receipts</h1>
          <p className="text-gray-600">Manage customer payments and receipts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Receipt
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Customers</option>
              {customers?.customers?.map((customer: any) => (
                <option key={customer.id} value={customer.id}>
                  {customer.code} - {customer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cash Account
            </label>
            <select
              value={cashAccountFilter}
              onChange={(e) => setCashAccountFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Accounts</option>
              {cashAccounts?.accounts?.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Receipts
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-2xl font-semibold text-green-600">
                    ₦{data?.receipts?.reduce((sum: number, r: SalesReceipt) => sum + r.amountReceived, 0).toLocaleString() || '0'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Receipts
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.receipts?.filter((r: SalesReceipt) => 
                      new Date(r.receiptDate).toDateString() === new Date().toDateString()
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.receipts || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSalesReceiptModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateReceipt}
        />
      )}
    </div>
  );
};

export default SalesReceipts;