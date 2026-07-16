import { z } from 'zod';

// Company Settings
export const updateCompanySettingsSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  baseCurrency: z.string().default('NGN'),
  timezone: z.string().default('Africa/Lagos'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
});

// Fiscal Year
export const createFiscalYearSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date format"
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date format"
  }),
});

// System Settings
export const updateSystemSettingSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  dataType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).default('STRING'),
  description: z.string().optional(),
});

// Approval Workflow
export const createApprovalWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  entity: z.enum(['PURCHASE_ORDER', 'SALES_ORDER', 'PRODUCTION_ORDER', 'INVENTORY_ADJUSTMENT']),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  steps: z.array(z.object({
    name: z.string().min(1, 'Step name is required'),
    roleId: z.string().cuid('Invalid role ID'),
    isRequired: z.boolean().default(true),
  })).min(1, 'At least one approval step is required'),
});

// Approval Action
export const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().optional(),
});

// Role Management
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string().cuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').optional(),
  description: z.string().optional(),
  permissions: z.array(z.string().cuid()).optional(),
});

export type UpdateCompanySettingsRequest = z.infer<typeof updateCompanySettingsSchema>;
export type CreateFiscalYearRequest = z.infer<typeof createFiscalYearSchema>;
export type UpdateSystemSettingRequest = z.infer<typeof updateSystemSettingSchema>;
export type CreateApprovalWorkflowRequest = z.infer<typeof createApprovalWorkflowSchema>;
export type ApprovalActionRequest = z.infer<typeof approvalActionSchema>;
export type CreateRoleRequest = z.infer<typeof createRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>;

// Chart of Accounts
export const createChartAccountSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Account name is required'),
  accountType: z.enum([
    'INCOME', 
    'EXPENSES', 
    'OTHER_INCOME', 
    'CURRENT_ASSETS', 
    'NON_CURRENT_ASSETS', 
    'CURRENT_LIABILITY', 
    'NON_CURRENT_LIABILITY', 
    'COST_OF_SALES',
    'TRADE_RECEIVABLES',
    'TRADE_PAYABLES',
    'EQUITY'
  ]),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateChartAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountType: z.enum([
    'INCOME', 
    'EXPENSES', 
    'OTHER_INCOME', 
    'CURRENT_ASSETS', 
    'NON_CURRENT_ASSETS', 
    'CURRENT_LIABILITY', 
    'NON_CURRENT_LIABILITY', 
    'COST_OF_SALES',
    'TRADE_RECEIVABLES',
    'TRADE_PAYABLES',
    'EQUITY'
  ]),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateChartAccountRequest = z.infer<typeof createChartAccountSchema>;
export type UpdateChartAccountRequest = z.infer<typeof updateChartAccountSchema>;

// Import cash account schemas
export { createCashAccountSchema, updateCashAccountSchema } from './cash';