import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { cashApi, purchaseApi } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import CreatePurchasePaymentModal from './CreatePurchasePaymentModal';

interface PurchasePayment {
  id: string;
  paymentNo: string;
  purchaseId?: string;
  vendorId: string;
  cashAccountId: string;
  amountPaid: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
  userId: string;
  createdAt: string;
  purchase?: {
    orderNo: string;
    totalAmount: number;
    status: string;
  };
  vendor: {
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

const PurchasePayments = () => {
  const [page, setPage] = useState(1);
  const [vendorFilter, setVendorFilter] = useState('');
  const [cashAccountFilter, setCashAccountFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchase-payments', { 
      page, 
      vendorId: vendorFilter,
      cashAccountId: cashAccountFilter
    }],
    queryFn: () => cashApi.getPurchasePayments({ 
      page, 
      limit: 10,
      ...(vendorFilter && { vendorId: vendorFilter }),
      ...(cashAccountFilter && { cashAccountId: cashAccountFilter })
    })
  });
console.log(data)
  const { data: vendors } = useQuery({
    queryKey: ['vendors-for-payments'],
    queryFn: () => purchaseApi.getVendors({ limit: 100 })
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ['cash-accounts-for-payments'],
    queryFn: () => cashApi.getCashAccounts()
  });

  const columns = [
    {
      key: 'paymentNo',
      header: 'Payment No',
      width: 'w-32'
    },
    {
      key: 'vendor.name',
      header: 'Vendor',
      width: 'w-48'
    },
    {
      key: 'purchase.orderNo',
      header: 'Purchase Order',
      cell: (payment: PurchasePayment) => payment.purchase?.orderNo || 'General Payment',
      width: 'w-32'
    },
    {
      key: 'amountPaid',
      header: 'Amount Paid',
      cell: (payment: PurchasePayment) => `₦${payment.amountPaid.toLocaleString()}`,
      width: 'w-32'
    },
    {
      key: 'cashAccount.name',
      header: 'Cash Account',
      cell: (payment: PurchasePayment) => (
        <div>
          <div className="font-medium">{payment.cashAccount.name}</div>
          <div className="text-xs text-gray-500">{payment.cashAccount.accountType}</div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      cell: (payment: PurchasePayment) => new Date(payment.paymentDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'reference',
      header: 'Reference',
      cell: (payment: PurchasePayment) => payment.reference || '-',
      width: 'w-32'
    },
    {
      key: 'user.name',
      header: 'Paid By',
      width: 'w-32'
    }
  ];

  const handleCreatePayment = () => {
    refetch();
    setShowCreateModal(false);
  };

  const actions = (payment: PurchasePayment) => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          // View details functionality can be added later
          console.log('View payment details:', payment);
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
          <h1 className="text-2xl font-bold text-gray-900">Purchase Payments</h1>
          <p className="text-gray-600">Manage vendor payments and disbursements</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Vendors</option>
              {vendors?.vendors?.map((vendor: any) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.code} - {vendor.name}
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
                <CreditCard className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Payments
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
                <DollarSign className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-2xl font-semibold text-red-600">
                    ₦{data?.payments?.reduce((sum: number, p: PurchasePayment) => sum + Number(p.amountPaid), 0).toLocaleString() || '0'}
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
                    Today's Payments
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.payments?.filter((p: PurchasePayment) => 
                      new Date(p.paymentDate).toDateString() === new Date().toDateString()
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
        data={data?.payments || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePurchasePaymentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreatePayment}
        />
      )}
    </div>
  );
};

export default PurchasePayments;