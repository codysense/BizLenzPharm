export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Location Types
export interface Location {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateLocationRequest {
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Item Types
export interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  type: "RAW_MATERIAL" | "WORK_IN_PROGRESS" | "FINISHED_GOODS" | "CONSUMABLE";
  uom: string;
  costingMethod: "GLOBAL" | "FIFO" | "WEIGHTED_AVG";
  standardCost?: string;
  sellingPriceOrdinary?: string;
  sellingPriceBulk?: string;
  sellingPriceWIC?: string;
  taxCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  priceList: {
    id: string;
    customerGroup: string;
    price: number;
  };
}

export interface CreateItemRequest {
  sku: string;
  name: string;
  description?: string;
  type: "RAW_MATERIAL" | "WORK_IN_PROGRESS" | "FINISHED_GOODS" | "CONSUMABLE";
  uom?: string;
  costingMethod?: "GLOBAL" | "FIFO" | "WEIGHTED_AVG";
  standardCost?: number;
  sellingPrice?: number;
  taxCode?: string;
}

// BOM Types
export interface BomLine {
  id: string;
  componentItemId: string;
  qtyPer: number;
  scrapPercent: number;
  componentItem: {
    sku: string;
    name: string;
    uom: string;
  };
}

export interface Bom {
  id: string;
  itemId: string;
  version: string;
  isActive: boolean;
  item: {
    sku: string;
    name: string;
  };
  bomLines: BomLine[];
  createdAt: string;
}

export interface CreateBomRequest {
  itemId: string;
  version?: string;
  bomLines: {
    componentItemId: string;
    qtyPer: number;
    scrapPercent?: number;
  }[];
}

// Purchase Types
export interface Vendor {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseLine {
  id: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  item: {
    sku: string;
    name: string;
    uom: string;
  };
  assetName?: string; // For asset purchases
}

export interface Purchase {
  id: string;
  orderNo: string;
  vendorId: string;
  orderDate: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "INVOICED" | "PAID";
  totalAmount: number;
  balanceAmount: number;
  notes?: string;
  vendor: {
    code: string;
    name: string;
  };
  purchaseLines: PurchaseLine[];
  createdAt: string;
}

export interface CreatePurchaseRequest {
  vendorId: string;
  orderDate: string;
  notes?: string;
  purchaseLines: {
    itemId: string;
    qty: number;
    unitPrice: number;
  }[];
}

// Customer Types
export interface Customer {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  creditLimit?: number;
  customerGroupId: string;
  customerGroup?: CustomerGroup[];
  isActive: boolean;
  createdAt: string;
}

//Customer Groups types
export interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  customerCount?: number;
  isActive: boolean;
}

// Sales Types
export interface SaleLine {
  id: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  item: {
    sku: string;
    name: string;
    uom: string;
  };
}

export interface Sale {
  id: string;
  orderNo: string;
  customerId: string;
  orderDate: string;
  status: "DRAFT" | "CONFIRMED" | "DELIVERED" | "INVOICED" | "PAID";
  totalAmount: number;
  notes?: string;
  customer: {
    code: string;
    name: string;
  };
  saleLines: SaleLine[];
  createdAt: string;
  createdBy: string;
  preparer?: {
    name: string;
  };
}

export interface CreateSaleRequest {
  customerId: string;
  orderDate: string;
  notes?: string;
  saleLines: {
    itemId: string;
    qty: number;
    unitPrice: number;
  }[];
}

// Production Types
export interface ProductionOrder {
  id: string;
  orderNo: string;
  itemId: string;
  qtyTarget: number;
  qtyProduced: number;
  status: "PLANNED" | "RELEASED" | "IN_PROGRESS" | "FINISHED" | "CLOSED";
  warehouseId: string;
  bomId?: string;
  startedAt?: string;
  finishedAt?: string;
  item: {
    sku: string;
    name: string;
    type: string;
  };
  warehouse: {
    code: string;
    name: string;
  };
  bom?: {
    bomLines: BomLine[];
  };
  createdAt: string;
}

export interface CreateProductionOrderRequest {
  itemId: string;
  qtyTarget: number;
  warehouseId: string;
  bomId?: string;
}

// Inventory Types
export interface InventoryLedgerEntry {
  id: string;
  itemId: string;
  warehouseId: string;
  refType: string;
  refId: string;
  direction: "IN" | "OUT";
  qty: number;
  unitCost: number;
  value: number;
  runningQty: number;
  runningValue: number;
  runningAvgCost: number;
  batchId?: string;
  postedAt: string;
  user?: {
    name: string;
    email: string;
  };
  item: {
    sku: string;
    name: string;
    type: string;
    uom: string;
  };
  warehouse: {
    code: string;
    name: string;
  };
}

// Warehouse Types
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  locationId: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  location?: {
    code: string;
    name: string;
    city?: string;
    state?: string;
  };
}

export interface CreateWarehouseRequest {
  code: string;
  name: string;
  locationId: string;
  address?: string;
}

export interface InventoryValuation {
  itemId: string;
  sku: string;
  name: string;
  type: string;
  costingMethod: string;
  qty: number;
  unitCost: number;
  totalValue: number;
}

// Cash Management Types
export interface CashAccount {
  id: string;
  code: string;
  name: string;
  accountType: "CASH" | "BANK";
  accountNumber?: string;
  bankName?: string;
  glAccountId?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  warehouseId?: string;
}

export interface CashTransaction {
  id: string;
  transactionNo: string;
  cashAccountId: string;
  transactionType: "RECEIPT" | "PAYMENT";
  amount: number;
  //description: string;
  refType?: "SALES_RECEIPT" | "PURCHASE_PAYMENT" | "OTHER";
  status: "PREPARED" | "APPROVED" | "AUTHORIZED" | "PAID";
  refId?: string;
  transactionDate: string;
  userId: string;
  createdAt: string;
  cashAccount: {
    code: string;
    name: string;
    accountType: string;
  };
  user: {
    name: string;
    email: string;
  };
  CashTransactionLine: CashTransactionLine[];
}

export interface CashTransactionLine {
  glAccountId: string;
  contraAccountId: string;
  lineAmount: number;
  description: string;
}

export interface SalesReceipt {
  id: string;
  receiptNo: string;
  saleId: string;
  customerId: string;
  cashAccountId: string;
  amountReceived: number;
  receiptDate: string;
  notes?: string;
  userId: string;
  createdAt: string;
  sale: {
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

export interface PurchasePayment {
  id: string;
  paymentNo: string;
  purchaseId: string;
  vendorId: string;
  cashAccountId: string;
  amountPaid: number;
  paymentDate: string;
  notes?: string;
  userId: string;
  createdAt: string;
  purchase: {
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

// Management Types
export interface CompanySettings {
  id: string;
  name: string;
  baseCurrency: string;
  timezone: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  createdAt: string;
  _count?: {
    periods: number;
  };
}

export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  createdAt: string;
  fiscalYear?: {
    year: number;
  };
}

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  dataType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  description?: string;
  isEditable: boolean;
  updatedBy: string;
  updatedAt: string;
  updatedByUser?: {
    name: string;
    email: string;
  };
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  entity: string;
  minAmount?: number;
  maxAmount?: number;
  isActive: boolean;
  createdAt: string;
  steps: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  roleId: string;
  isRequired: boolean;
  createdAt: string;
  role?: {
    name: string;
  };
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  currentStepId?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  completedAt?: string;
  workflow?: {
    name: string;
    entity: string;
  };
  requestedByUser?: {
    name: string;
    email: string;
  };
  currentStep?: {
    name: string;
    role: {
      name: string;
    };
  };
  actions?: ApprovalAction[];
}

export interface ApprovalAction {
  id: string;
  requestId: string;
  stepId: string;
  userId: string;
  action: "APPROVE" | "REJECT";
  comments?: string;
  actionDate: string;
  user?: {
    name: string;
  };
  step?: {
    name: string;
  };
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  rolePermissions: {
    permission: Permission;
  }[];
  _count: {
    userRoles: number;
  };
}

export interface CreateCompanySettingsRequest {
  name: string;
  baseCurrency?: string;
  timezone?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CreateFiscalYearRequest {
  year: number;
  startDate: string;
  endDate: string;
}

export interface CreateSystemSettingRequest {
  category: string;
  key: string;
  value: string;
  dataType?: "STRING" | "NUMBER" | "BOOLEAN" | "JSON";
  description?: string;
}

export interface CreateApprovalWorkflowRequest {
  name: string;
  entity:
    | "PURCHASE_ORDER"
    | "SALES_ORDER"
    | "PRODUCTION_ORDER"
    | "INVENTORY_ADJUSTMENT";
  minAmount?: number;
  maxAmount?: number;
  steps: {
    name: string;
    roleId: string;
    isRequired?: boolean;
  }[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions?: string[];
}

// Chart of Accounts Types
export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  parent?: {
    code: string;
    name: string;
  };
  children?: {
    id: string;
    code: string;
    name: string;
  }[];
  _count?: {
    journalLines: number;
  };
}

export interface CreateChartAccountRequest {
  code?: string;
  code: string;
  name: string;
  accountType:
    | "INCOME"
    | "EXPENSES"
    | "OTHER_INCOME"
    | "CURRENT_ASSETS"
    | "NON_CURRENT_ASSETS"
    | "CURRENT_LIABILITY"
    | "NON_CURRENT_LIABILITY"
    | "COST_OF_SALES"
    | "TRADE_RECEIVABLES"
    | "TRADE_PAYABLES"
    | "EQUITY";
  description?: string;
  parentId?: string;
}

export interface CreateSalesReceiptRequest {
  saleId: string;
  cashAccountId: string;
  amountReceived: number;
  receiptDate: string;
  notes?: string;
}

export interface CreatePurchasePaymentRequest {
  purchaseId: string;
  cashAccountId: string;
  amountPaid: number;
  paymentDate: string;
  notes?: string;
}

export interface CreateCashTransactionRequest {
  cashAccountId: string;
  transactionType: "RECEIPT" | "PAYMENT";
  amount: number;
  description: string;
  transactionDate: string;
}
export interface CreateCustomerJournalRequest {
  customerId: string;
  transactionType: "CREDIT" | "DEBIT";
  amount: number;
  description: string;
  transactionDate: string;
}

// Asset Types
export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  depreciationMethod: "STRAIGHT_LINE" | "REDUCING_BALANCE";
  usefulLife: number;
  residualValue: number;
  glAssetAccountId: string;
  glDepreciationAccountId: string;
  glAccumulatedDepreciationAccountId: string;
  isActive: boolean;
  createdAt: string;
  glAssetAccount?: {
    code: string;
    name: string;
  };
  glDepreciationAccount?: {
    code: string;
    name: string;
  };
  glAccumulatedDepreciationAccount?: {
    code: string;
    name: string;
  };
  _count?: {
    assets: number;
  };
}

export interface Asset {
  id: string;
  assetNo: string;
  name: string;
  description?: string;
  categoryId: string;
  acquisitionDate: string;
  acquisitionCost: number;
  residualValue: number;
  usefulLife: number;
  depreciationMethod: "STRAIGHT_LINE" | "REDUCING_BALANCE";
  locationId?: string;
  serialNumber?: string;
  supplier?: string;
  purchaseOrderId?: string;
  status: "ACTIVE" | "DISPOSED" | "SOLD" | "WRITTEN_OFF";
  disposalDate?: string;
  disposalAmount?: number;
  disposalMethod?: string;
  createdBy: string;
  createdAt: string;
  category?: {
    code: string;
    name: string;
    depreciationMethod: string;
  };
  location?: {
    code: string;
    name: string;
  };
  createdByUser?: {
    name: string;
  };
  purchaseOrder?: {
    orderNo: string;
  };

  accumulatedDepreciation?: number;
  netBookValue?: number;

  _count?: {
    depreciationEntries: number;
  };
}

export interface AssetDepreciation {
  id: string;
  assetId: string;
  periodYear: number;
  periodMonth: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  isPosted: boolean;
  postedAt?: string;
  journalId?: string;
  createdAt: string;
}

export interface AssetDisposal {
  id: string;
  assetId: string;
  disposalDate: string;
  disposalAmount: number;
  disposalMethod: "SALE" | "SCRAP" | "DONATION" | "WRITE_OFF";
  buyerDetails?: string;
  gainLoss: number;
  notes?: string;
  journalId?: string;
  disposedBy: string;
  createdAt: string;
}

export interface CreateAssetCategoryRequest {
  code: string;
  name: string;
  description?: string;
  depreciationMethod: "STRAIGHT_LINE" | "REDUCING_BALANCE";
  usefulLife: number;
  residualValue: number;
  glAssetAccountId: string;
  glDepreciationAccountId: string;
  glAccumulatedDepreciationAccountId: string;
}

export interface CreateAssetRequest {
  name: string;
  description?: string;
  categoryId: string;
  acquisitionDate: string;
  acquisitionCost: number;
  residualValue?: number;
  usefulLife?: number;
  depreciationMethod?: "STRAIGHT_LINE" | "REDUCING_BALANCE";
  locationId?: string;
  serialNumber?: string;
  supplier?: string;
  purchaseOrderId?: string;
}

export interface CapitalizeFromPurchaseRequest {
  purchaseOrderId: string;
  assets: {
    name: string;
    categoryId: string;
    acquisitionCost: number;
    serialNumber?: string;
    locationId?: string;
  }[];
}

export interface DisposeAssetRequest {
  disposalDate: string;
  disposalAmount: number;
  disposalMethod: "SALE" | "SCRAP" | "DONATION" | "WRITE_OFF";
  buyerDetails?: string;
  notes?: string;
}

export interface RunDepreciationRequest {
  periodYear: number;
  periodMonth: number;
  assetIds?: string[];
}

// POS Types
export interface PosSession {
  id: string;
  sessionNo: string;
  userId: string;
  warehouseId: string;
  cashAccountId: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalReturns: number;
  openedAt: string;
  closedAt?: string;
  status: "OPEN" | "CLOSED";
  warehouse: {
    code: string;
    name: string;
  };
  cashAccount: {
    code: string;
    name: string;
  };
}

export interface PosSale {
  id: string;
  saleNo: string;
  sessionId: string;
  customerId?: string;
  warehouseId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  payments: {
    method: "CASH" | "TRANSFER" | "CARD";
    cashAccountId: string;
    amount: number;
  }[];
  // paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  status: "COMPLETED" | "RETURNED";
  notes?: string;
  createdAt: string;
  customer?: {
    code: string;
    name: string;
  };
  warehouse: {
    code: string;
    name: string;
  };
  saleLines: PosSaleLine[];
  user: {
    name: string;
  };
}

export interface PosSaleLine {
  id: string;
  itemId: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  item: {
    sku: string;
    name: string;
    uom: string;
  };
}

export interface PosReturn {
  id: string;
  returnNo: string;
  originalSaleId: string;
  sessionId: string;
  customerId?: string;
  warehouseId: string;
  totalAmount: number;
  refundAmount: number;
  reason: string;
  createdAt: string;
  returnLines: PosReturnLine[];
}

export interface PosReturnLine {
  id: string;
  originalLineId: string;
  itemId: string;
  qtyReturned: number;
  unitPrice: number;
  lineTotal: number;
  item: {
    sku: string;
    name: string;
    uom: string;
  };
}

export interface CustomerWithBalance {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  outstandingBalance: number;
}

export interface CreatePosSessionRequest {
  warehouseId: string;
  cashAccountId: string;
  openingBalance: number;
}

export interface CreatePosSaleRequest {
  sessionId: string;
  customerId?: string;
  saleLines: {
    itemId: string;
    qty: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  amountPaid: number;
  changeAmount?: number;
  paymentMethod?: "CASH" | "CARD" | "TRANSFER";
  notes?: string;
}

export interface CreatePosReturnRequest {
  originalSaleId: string;
  sessionId: string;
  reason: string;
  returnLines: {
    originalLineId: string;
    itemId: string;
    qtyReturned: number;
    unitPrice: number;
  }[];
}
