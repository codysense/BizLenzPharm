import axios from 'axios';

export type MemoType = 'CREDIT' | 'DEBIT';

export async function createSalesMemo(payload: { memoType: MemoType; amount: number; accountId: string; customerId: string; description?: string }) {
  const res = await axios.post('/api/memos/sales', payload);
  return res.data;
}

export async function createPurchaseMemo(payload: { memoType: MemoType; amount: number; accountId: string; vendorId: string; description?: string }) {
  const res = await axios.post('/api/memos/purchases', payload);
  return res.data;
}

export async function listChartAccounts() {
  // adjust endpoint if your management API differs
  const res = await axios.get('/api/management/chart-accounts');
  return res.data;
}

export async function listCustomers() {
  const res = await axios.get('/api/management/customers');
  return res.data;
}

export async function listVendors() {
  const res = await axios.get('/api/management/vendors');
  return res.data;
}
