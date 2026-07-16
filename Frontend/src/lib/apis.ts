import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private baseURL: string;
  
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const { accessToken, refreshToken } = useAuthStore.getState();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 - token expired
      if (response.status === 401 && accessToken && refreshToken) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          // Retry original request with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          const retryResponse = await fetch(url, config);
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        } else {
          // Refresh failed, redirect to login
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || error.message || 'Request failed');
      }

      // Handle no content responses
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      const { refreshToken } = useAuthStore.getState();
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        // Update only the access token in store
        const { user, refreshToken: currentRefreshToken } = useAuthStore.getState();
        if (user) {
          useAuthStore.getState().setAuth(user, accessToken, currentRefreshToken!);
        }
        return accessToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; roleId: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// User Management API
export const userApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/auth/users${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createUser: (data: { name: string; email: string; password: string; roleId: string; warehouseId?: string }) =>
    api.post('/auth/users', data),
  updateUserStatus: (userId: string, status: string) =>
    api.patch(`/auth/users/${userId}/status`, { status }),
  getRoles: () => api.get('/auth/roles'),
};

// Inventory API
export const inventoryApi = {
  getItems: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
    api.get(`/inventory/items?includeStock=true${params ? '&' + new URLSearchParams(params as any).toString() : ''}`),
  createItem: (data: any) => api.post('/inventory/items', data),
   deleteItem: (sku: string) => api.delete(`/inventory/items/${sku}`),
  getBoms: (params?: { itemId?: string }) =>
    api.get(`/inventory/boms${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createBom: (data: any) => api.post('/inventory/boms', data),
  adjustInventory: (data: any) => api.post('/inventory/adjust', data),
  transferInventory: (data: any) => api.post('/inventory/transfer', data),
  getInventoryLedger: (params?: { 
    itemId?: string; 
    warehouseId?: string; 
    userId?: string;
    itemType?: string;
    refType?: string;
    direction?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number; 
    limit?: number 
  }) =>
    api.get(`/inventory/ledger${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  exportInventoryLedger: async (format: 'csv' | 'excel' | 'pdf', filters: any) => {
    const params = { format, ...filters };
    if (format === 'csv') {
      // For CSV, download directly
      const response = await fetch(`${API_BASE_URL}/inventory/ledger/export?${new URLSearchParams(params).toString()}`, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-ledger-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } else {
      // For Excel and PDF, get JSON data and process on frontend
      const data = await api.get(`/inventory/ledger/export?${new URLSearchParams(params).toString()}`);
      
      if (format === 'excel') {
        // TODO: Implement Excel export using a library like xlsx
        console.log('Excel export data:', data);
        throw new Error('Excel export not yet implemented');
      } else if (format === 'pdf') {
        // TODO: Implement PDF export using jsPDF
        console.log('PDF export data:', data);
        throw new Error('PDF export not yet implemented');
      }
    }
  },
  getUsers: () => api.get('/auth/users?limit=100'),
  getInventoryValuation: (params?: { warehouseId?: string }) =>
    api.get(`/inventory/valuation${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  getWarehouses: () => api.get('/inventory/warehouses'),
  getWarehousesList: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/inventory/warehouses/list${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createWarehouse: (data: any) => api.post('/inventory/warehouses', data),
  getInventoryTransfers: (params?: { page?: number; limit?: number }) =>
    api.get(`/inventory/transfers${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  getItemStock: (itemId: string, warehouseId: string) =>
    api.get(`/inventory/stock/${itemId}/${warehouseId}`),
  getLocations: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/inventory/locations${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createLocation: (data: any) => api.post('/inventory/locations', data),
  updateLocation: (id: string, data: any) => api.put(`/inventory/locations/${id}`, data),
  updateWarehouse: (id: string, data: any) => api.put(`/inventory/warehouses/${id}`, data),
};

// Production API
export const productionApi = {
  getProductionOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`/production/orders${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createProductionOrder: (data: any) => api.post('/production/orders', data),
  updateProductionOrder: (id: string, data: any) => api.put(`/production/orders/${id}`, data),
  deleteProductionOrder: (id: string) => api.delete(`/production/orders/${id}`),
  printProductionOrder: (id: string) => api.get(`/production/orders/${id}/print`),
  releaseProductionOrder: (id: string) => api.post(`/production/orders/${id}/release`),
  issueMaterials: (id: string, data: any) => api.post(`/production/orders/${id}/issue-materials`, data),
  addLabor: (id: string, data: any) => api.post(`/production/orders/${id}/add-labor`, data),
  addOverhead: (id: string, data: any) => api.post(`/production/orders/${id}/add-overhead`, data),
  receiveFinishedGoods: (id: string, data: any) => api.post(`/production/orders/${id}/receive-fg`, data),
  finishProductionOrder: (id: string) => api.post(`/production/orders/${id}/finish`),
  getWipSummary: (params?: { productionOrderId?: string }) =>
    api.get(`/production/wip-summary${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
};

// Purchase API
export const purchaseApi = {
  getPurchases: (params?: { page?: number; limit?: number; status?: string; vendorId?: string }) =>
    api.get(`/purchase/orders${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createPurchase: (data: any) => api.post('/purchase/orders', data),
  updatePurchase: (id: string, data: any) => api.put(`/purchase/orders/${id}`, data),
  deletePurchase: (id: string) => api.delete(`/purchase/orders/${id}`),
  printPurchaseOrder: (id: string) => api.get(`/purchase/orders/${id}/print`),
  receivePurchase: (id: string, data: any) => api.post(`/purchase/orders/${id}/receive`, data),
  invoicePurchase: (id: string, data?: any) => api.post(`/purchase/orders/${id}/invoice`, data),
  getVendors: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/purchase/vendors${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createVendor: (data: any) => api.post('/purchase/vendors', data),
};

// Sales API
export const salesApi = {
  getSales: (params?: { page?: number; limit?: number; status?: string; customerId?: string }) =>
    api.get(`/sales/orders${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createSale: (data: any) => api.post('/sales/orders', data),
  updateSale: (id: string, data: any) => api.put(`/sales/orders/${id}`, data),
  deleteSale: (id: string) => api.delete(`/sales/orders/${id}`),
  printSaleInvoice: (id: string) => api.get(`/sales/orders/${id}/print`),
  deliverSale: (id: string, data: any) => api.post(`/sales/orders/${id}/deliver`, data),
  invoiceSale: (id: string) => api.post(`/sales/orders/${id}/invoice`),
  getCustomers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/sales/customers${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createCustomer: (data: any) => api.post('/sales/customers', data),
};

// Cash Management API
export const cashApi = {
  getCashAccounts: () => api.get('/cash/accounts'),
  createCashAccount: (data: any) => api.post('/cash/accounts', data),
  updateCashAccount: (id: string, data: any) => api.put(`/cash/accounts/${id}`, data),
  deleteCashAccount: (id: string) => api.delete(`/cash/accounts/${id}`),
  getCashTransactions: (params?: { 
    page?: number; 
    limit?: number; 
    cashAccountId?: string;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    api.get(`/cash/transactions${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createCashTransaction: (data: any) => api.post('/cash/transactions', data),
  
  // Customer and Vendor Payments
  createCustomerPayment: (data: any) => api.post('/cash/customer-payments', data),
  createVendorPayment: (data: any) => api.post('/cash/vendor-payments', data),
  createSalesReceipt: (data: any) => api.post('/cash/sales-receipts', data),
  createPurchasePayment: (data: any) => api.post('/cash/purchase-payments', data),
  getSalesReceipts: (params?: any) => api.get(`/cash/sales-receipts${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  getPurchasePayments: (params?: any) => api.get(`/cash/purchase-payments${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  
  // Cashbook
  getCashbook: (params?: { 
    page?: number; 
    limit?: number; 
    cashAccountId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    api.get(`/cash/cashbook${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  exportCashbook: async (filters: any) => {
    const response = await fetch(`${API_BASE_URL}/cash/cashbook/export?${new URLSearchParams(filters).toString()}`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashbook-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error('Export failed');
    }
  },
  
  // Bank Reconciliation
  getBankReconciliation: (params: { cashAccountId: string; statementDate: string }) =>
    api.get(`/cash/reconciliation?${new URLSearchParams(params).toString()}`),
  reconcileTransactions: (data: any) => api.post('/cash/reconciliation', data),
  
  // Bank Statement Import
  importBankStatement: (data: any) => api.post('/cash/import-statement', data),
};

// Reports API
export const reportsApi = {
  // Financial Reports
  getBalanceSheet: (params: { asOfDate: string }) =>
    api.get(`/reports/balance-sheet?${new URLSearchParams(params).toString()}`),
  getProfitAndLoss: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/profit-loss?${new URLSearchParams(params).toString()}`),
  getTrialBalance: (params?: { asOfDate?: string }) =>
    api.get(`/reports/trial-balance${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  getGeneralLedger: (params: { dateFrom: string; dateTo: string; accountId?: string }) =>
    api.get(`/reports/general-ledger?${new URLSearchParams(params as any).toString()}`),
  getCashFlow: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/cash-flow?${new URLSearchParams(params).toString()}`),
  getVendorBalances: (params: { asOfDate: string }) =>
    api.get(`/reports/vendor-balances?${new URLSearchParams(params).toString()}`),
  getCustomerBalances: (params: { asOfDate: string }) =>
    api.get(`/reports/customer-balances?${new URLSearchParams(params).toString()}`),
  getCustomerLedger: (params: { dateFrom: string; dateTo: string; customerId: string }) =>
    api.get(`/reports/customer-ledger?${new URLSearchParams(params as any).toString()}`),
  getVendorLedger: (params: {  dateFrom?: string; dateTo?: string;vendorId: string }) =>
    api.get(`/reports/vendor-ledger?${new URLSearchParams(params as any).toString()}`),
  
  // Operational Reports
  getInventoryAging: (params: { asOfDate: string; warehouseId?: string }) =>
    api.get(`/reports/inventory-aging?${new URLSearchParams(params as any).toString()}`),
  getStockCard: (params: { itemId: string; warehouseId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get(`/reports/stock-card?${new URLSearchParams(params as any).toString()}`),
  getProductionVariance: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/production-variance?${new URLSearchParams(params).toString()}`),
  getSalesByItem: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/sales-by-item?${new URLSearchParams(params).toString()}`),
  getSalesByCustomer: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/sales-by-customer?${new URLSearchParams(params).toString()}`),
  getPurchasesByVendor: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/purchases-by-vendor?${new URLSearchParams(params).toString()}`),
  getArApAging: (params: { asOfDate: string; type: 'AR' | 'AP' }) =>
    api.get(`/reports/ar-ap-aging?${new URLSearchParams(params).toString()}`),
  getProductionSummary: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/production-summary?${new URLSearchParams(params).toString()}`),
  getProductionReport: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/production-report?${new URLSearchParams(params).toString()}`),
  getMaterialUsage: (params: { dateFrom: string; dateTo: string }) =>
    api.get(`/reports/material-usage?${new URLSearchParams(params).toString()}`),
  
  

};

// Management API
export const managementApi = {
  // Company Settings
  getCompanySettings: () => api.get('/management/company'),
  updateCompanySettings: (data: any) => api.put('/management/company', data),
  
  // System Settings
  getSystemSettings: (category?: string) => 
    api.get(`/management/settings${category ? '?category=' + category : ''}`),
  updateSystemSetting: (data: any) => api.put('/management/settings', data),
  getCostingPolicy: () => api.get('/management/costing-policy'),
  updateCostingPolicy: (method: 'FIFO' | 'WEIGHTED_AVG') => 
    api.put('/management/costing-policy', { method }),
  
  // Fiscal Calendar
  getFiscalYears: () => api.get('/management/fiscal-years'),
  createFiscalYear: (data: any) => api.post('/management/fiscal-years', data),
  getFiscalPeriods: (fiscalYearId?: string) => 
    api.get(`/management/fiscal-periods${fiscalYearId ? '?fiscalYearId=' + fiscalYearId : ''}`),
  activateFiscalPeriod: (id: string) => api.patch(`/management/fiscal-periods/${id}/activate`),
  closeFiscalPeriod: (id: string) => api.patch(`/management/fiscal-periods/${id}/close`),
  
  // Approval Workflows
  getApprovalWorkflows: () => api.get('/management/approval-workflows'),
  createApprovalWorkflow: (data: any) => api.post('/management/approval-workflows', data),
  getApprovalRequests: (params?: { userId?: string; status?: string }) =>
    api.get(`/management/approval-requests${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  processApprovalAction: (id: string, data: { action: 'APPROVE' | 'REJECT'; comments?: string }) =>
    api.post(`/management/approval-requests/${id}/action`, data),
  
  // Enhanced Role Management
  getRolesWithPermissions: () => api.get('/management/roles'),
  createRole: (data: any) => api.post('/management/roles', data),
  updateRole: (id: string, data: any) => api.put(`/management/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/management/roles/${id}`),
  getAllPermissions: () => api.get('/management/permissions'),
  
  // Enhanced User Management
  getUsersWithDetails: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`/management/users${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  updateUserRoles: (id: string, roleIds: string[]) => 
    api.put(`/management/users/${id}/roles`, { roleIds }),

  // Chart of Accounts Management
  getChartOfAccounts: () => api.get('/management/chart-of-accounts'),
  createChartAccount: (data: any) => api.post('/management/chart-of-accounts', data),
  updateChartAccount: (id: string, data: any) => api.put(`/management/chart-of-accounts/${id}`, data),
  deleteChartAccount: (id: string) => api.delete(`/management/chart-of-accounts/${id}`),

  // Cash Account Management
  getCashAccountsManagement: () => api.get('/management/cash-accounts'),
  createCashAccountManagement: (data: any) => api.post('/management/cash-accounts', data),
  updateCashAccountManagement: (id: string, data: any) => api.put(`/management/cash-accounts/${id}`, data),
  deleteCashAccountManagement: (id: string) => api.delete(`/management/cash-accounts/${id}`),
};

// Assets API
export const assetsApi = {
  // Asset Categories
  getAssetCategories: () => api.get('/assets/categories'),
  createAssetCategory: (data: any) => api.post('/assets/categories', data),
  
  // Assets
  getAssets: (params?: { page?: number; limit?: number; categoryId?: string; status?: string; locationId?: string }) =>
    api.get(`/assets${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  createAsset: (data: any) => api.post('/assets', data),
  updateAsset: (id: string, data: any) => api.put(`/assets/${id}`, data),
  deleteAsset: (id: string) => api.delete(`/assets/${id}`),
  
  // Capitalization
  getPurchaseOrdersForCapitalization: () => api.get('/assets/purchase-orders'),
  capitalizeFromPurchase: (data: any) => api.post('/assets/capitalize', data),
  
  // Depreciation
  runDepreciation: (data: any) => api.post('/assets/depreciation/run', data),
  getDepreciationSchedule: (assetId: string) => api.get(`/assets/${assetId}/depreciation`),
  
  // Disposal
  disposeAsset: (assetId: string, data: any) => api.post(`/assets/${assetId}/dispose`, data),
  
  // Reports
  getAssetRegister: (params?: { categoryId?: string; status?: string; locationId?: string; asOfDate?: string }) =>
    api.get(`/assets/register${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  getAssetValuation: (params?: { asOfDate?: string }) =>
    api.get(`/assets/valuation${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

  //AuditLogs
  getAuditLogs:() => api.get('/management/audit-log'),
};

// POS API
export const posApi = {
  // Sessions
  createSession: (data: CreatePosSessionRequest) => api.post('/pos/sessions', data),
  closeSession: (sessionId: string, data: { closingBalance: number }) => 
    api.patch(`/pos/sessions/${sessionId}/close`, data),
  getCurrentSession: () => api.get('/pos/sessions/current'),
  
  // Sales
  createSale: (data: CreatePosSaleRequest) => api.post('/pos/sales', data),
  getSales: (params?: { page?: number; limit?: number; sessionId?: string; customerId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get(`/pos/sales${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  printReceipt: (saleId: string) => api.get(`/pos/sales/${saleId}/print`),
  
  // Returns
  createReturn: (data: CreatePosReturnRequest) => api.post('/pos/returns', data),
  
  // Customers
  getCustomersWithBalances: () => api.get('/pos/customers-with-balances'),
};