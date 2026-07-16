import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Plus, Play, Square, X, CheckCircle } from 'lucide-react';
import { managementApi } from '../../lib/api';
import { FiscalYear, FiscalPeriod } from '../../types/api';
import { DataTable } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const createFiscalYearSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

type CreateFiscalYearFormData = z.infer<typeof createFiscalYearSchema>;

const FiscalCalendar = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const queryClient = useQueryClient();

  const { data: fiscalYearsData, isLoading: loadingYears } = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: () => managementApi.getFiscalYears()
  });

  const { data: periodsData, isLoading: loadingPeriods } = useQuery({
    queryKey: ['fiscal-periods', selectedFiscalYear],
    queryFn: () => managementApi.getFiscalPeriods(selectedFiscalYear || undefined)
  });

  const createYearMutation = useMutation({
    mutationFn: (data: CreateFiscalYearFormData) => managementApi.createFiscalYear(data),
    onSuccess: () => {
      toast.success('Fiscal year created successfully');
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      setShowCreateModal(false);
    },
    onError: (error) => {
      console.error('Create fiscal year error:', error);
      toast.error('Failed to create fiscal year');
    }
  });

  const activatePeriodMutation = useMutation({
    mutationFn: (id: string) => managementApi.activateFiscalPeriod(id),
    onSuccess: () => {
      toast.success('Fiscal period activated successfully');
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });
    },
    onError: (error) => {
      console.error('Activate period error:', error);
      toast.error('Failed to activate fiscal period');
    }
  });

  const closePeriodMutation = useMutation({
    mutationFn: (id: string) => managementApi.closeFiscalPeriod(id),
    onSuccess: () => {
      toast.success('Fiscal period closed successfully');
      queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });
    },
    onError: (error) => {
      console.error('Close period error:', error);
      toast.error('Failed to close fiscal period');
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateFiscalYearFormData>({
    resolver: zodResolver(createFiscalYearSchema),
    defaultValues: {
      year: new Date().getFullYear() + 1,
      startDate: `${new Date().getFullYear() + 1}-01-01`,
      endDate: `${new Date().getFullYear() + 1}-12-31`,
    }
  });

  const fiscalYearColumns = [
    {
      key: 'year',
      header: 'Year',
      width: 'w-24'
    },
    {
      key: 'startDate',
      header: 'Start Date',
      cell: (year: FiscalYear) => new Date(year.startDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'endDate',
      header: 'End Date',
      cell: (year: FiscalYear) => new Date(year.endDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (year: FiscalYear) => (
        <div className="space-y-1">
          <StatusBadge status={year.isActive ? 'Active' : 'Inactive'} />
          {year.isClosed && <StatusBadge status="Closed" variant="error" />}
        </div>
      ),
      width: 'w-32'
    },
    {
      key: '_count.periods',
      header: 'Periods',
      cell: (year: FiscalYear) => `${year._count?.periods || 0} periods`,
      width: 'w-24'
    }
  ];

  const periodColumns = [
    {
      key: 'periodNumber',
      header: 'Period',
      width: 'w-24'
    },
    {
      key: 'name',
      header: 'Name',
      width: 'w-48'
    },
    {
      key: 'startDate',
      header: 'Start Date',
      cell: (period: FiscalPeriod) => new Date(period.startDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'endDate',
      header: 'End Date',
      cell: (period: FiscalPeriod) => new Date(period.endDate).toLocaleDateString(),
      width: 'w-32'
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (period: FiscalPeriod) => (
        <div className="space-y-1">
          <StatusBadge status={period.isActive ? 'Active' : 'Inactive'} />
          {period.isClosed && <StatusBadge status="Closed" variant="error" />}
        </div>
      ),
      width: 'w-32'
    }
  ];

  const periodActions = (period: FiscalPeriod) => (
    <div className="flex space-x-2">
      {!period.isActive && !period.isClosed && (
        <button
          onClick={() => activatePeriodMutation.mutate(period.id)}
          className="text-green-600 hover:text-green-900"
          title="Activate Period"
        >
          <Play className="h-4 w-4" />
        </button>
      )}
      {period.isActive && !period.isClosed && (
        <button
          onClick={() => closePeriodMutation.mutate(period.id)}
          className="text-red-600 hover:text-red-900"
          title="Close Period"
        >
          <Square className="h-4 w-4" />
        </button>
      )}
      {period.isClosed && (
        <CheckCircle className="h-4 w-4 text-gray-400" title="Period Closed" />
      )}
    </div>
  );

  const onSubmit = (data: CreateFiscalYearFormData) => {
    createYearMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal Calendar</h1>
          <p className="text-gray-600">Manage fiscal years and accounting periods</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Fiscal Year
        </button>
      </div>

      {/* Fiscal Years */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Fiscal Years
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={fiscalYearsData?.fiscalYears || []}
            columns={fiscalYearColumns}
            loading={loadingYears}
          />
        </div>
      </div>

      {/* Fiscal Year Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Periods for Fiscal Year
            </label>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Periods</option>
              {fiscalYearsData?.fiscalYears?.map((year: FiscalYear) => (
                <option key={year.id} value={year.id}>
                  FY {year.year} ({year.isActive ? 'Active' : 'Inactive'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fiscal Periods */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Fiscal Periods
          </h3>
        </div>
        <div className="p-6">
          <DataTable
            data={periodsData?.periods || []}
            columns={periodColumns}
            loading={loadingPeriods}
            actions={periodActions}
          />
        </div>
      </div>

      {/* Create Fiscal Year Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Create Fiscal Year
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fiscal Year *
                    </label>
                    <input
                      {...register('year', { valueAsNumber: true })}
                      type="number"
                      min="2020"
                      max="2050"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.year && (
                      <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Date *
                      </label>
                      <input
                        {...register('startDate')}
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Date *
                      </label>
                      <input
                        {...register('endDate')}
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Note:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Creating a new fiscal year will automatically generate 12 monthly periods</li>
                      <li>• The new fiscal year will be set as active</li>
                      <li>• Previous fiscal years will be deactivated</li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Fiscal Year'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalCalendar;