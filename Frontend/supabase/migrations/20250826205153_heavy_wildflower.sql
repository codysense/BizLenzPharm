/*
  # Chart of Accounts Management Enhancement

  1. New Tables
    - Enhanced `chart_of_accounts` table structure
    - Add proper account type constraints
    - Add automatic code generation support

  2. Changes
    - Update account types to match business requirements
    - Add description field
    - Ensure proper indexing for performance

  3. Initial Data
    - Create default chart of accounts structure
    - Set up account hierarchy
*/

-- Update chart_of_accounts table with enhanced structure
DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chart_of_accounts' AND column_name = 'description'
  ) THEN
    ALTER TABLE chart_of_accounts ADD COLUMN description TEXT;
  END IF;
END $$;

-- Update account type constraint to match business requirements
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_accounttype_check;
ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_accounttype_check 
  CHECK (accountType IN ('INCOME', 'EXPENSES', 'OTHER_INCOME', 'CURRENT_ASSETS', 'NON_CURRENT_ASSETS', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'COST_OF_SALES'));

-- Create default chart of accounts if not exists
INSERT INTO chart_of_accounts (id, code, name, accountType, description, isActive, createdAt)
VALUES 
  -- Current Assets
  ('coa-1000', '1000', 'Current Assets', 'CURRENT_ASSETS', 'Short-term assets convertible to cash within one year', true, CURRENT_TIMESTAMP),
  ('coa-1100', '1100', 'Cash and Cash Equivalents', 'CURRENT_ASSETS', 'Cash on hand and in bank accounts', true, CURRENT_TIMESTAMP),
  ('coa-1200', '1200', 'Accounts Receivable', 'CURRENT_ASSETS', 'Money owed by customers', true, CURRENT_TIMESTAMP),
  ('coa-1300', '1300', 'Inventory - Raw Materials', 'CURRENT_ASSETS', 'Raw materials inventory', true, CURRENT_TIMESTAMP),
  ('coa-1350', '1350', 'Inventory - Finished Goods', 'CURRENT_ASSETS', 'Finished goods inventory', true, CURRENT_TIMESTAMP),
  ('coa-1400', '1400', 'Work in Progress', 'CURRENT_ASSETS', 'Manufacturing work in progress', true, CURRENT_TIMESTAMP),
  
  -- Non-Current Assets
  ('coa-1500', '1500', 'Property, Plant & Equipment', 'NON_CURRENT_ASSETS', 'Fixed assets used in operations', true, CURRENT_TIMESTAMP),
  ('coa-1600', '1600', 'Accumulated Depreciation', 'NON_CURRENT_ASSETS', 'Accumulated depreciation on fixed assets', true, CURRENT_TIMESTAMP),
  
  -- Current Liabilities
  ('coa-2000', '2000', 'Accounts Payable', 'CURRENT_LIABILITY', 'Money owed to suppliers', true, CURRENT_TIMESTAMP),
  ('coa-2100', '2100', 'Wages Payable', 'CURRENT_LIABILITY', 'Unpaid employee wages', true, CURRENT_TIMESTAMP),
  ('coa-2150', '2150', 'Goods Received Not Invoiced', 'CURRENT_LIABILITY', 'Received goods pending invoice', true, CURRENT_TIMESTAMP),
  
  -- Non-Current Liabilities
  ('coa-2500', '2500', 'Long-term Debt', 'NON_CURRENT_LIABILITY', 'Long-term loans and debt', true, CURRENT_TIMESTAMP),
  
  -- Income
  ('coa-4000', '4000', 'Sales Revenue', 'INCOME', 'Revenue from sales of goods and services', true, CURRENT_TIMESTAMP),
  ('coa-4100', '4100', 'Service Revenue', 'INCOME', 'Revenue from services provided', true, CURRENT_TIMESTAMP),
  
  -- Other Income
  ('coa-4500', '4500', 'Interest Income', 'OTHER_INCOME', 'Income from interest and investments', true, CURRENT_TIMESTAMP),
  ('coa-4600', '4600', 'Other Income', 'OTHER_INCOME', 'Miscellaneous income', true, CURRENT_TIMESTAMP),
  
  -- Cost of Sales
  ('coa-5000', '5000', 'Cost of Goods Sold', 'COST_OF_SALES', 'Direct costs of goods sold', true, CURRENT_TIMESTAMP),
  ('coa-5100', '5100', 'Direct Labor', 'COST_OF_SALES', 'Direct labor costs', true, CURRENT_TIMESTAMP),
  ('coa-5150', '5150', 'Scrap Loss', 'COST_OF_SALES', 'Manufacturing scrap and waste', true, CURRENT_TIMESTAMP),
  ('coa-5200', '5200', 'Manufacturing Overhead', 'COST_OF_SALES', 'Manufacturing overhead costs', true, CURRENT_TIMESTAMP),
  
  -- Expenses
  ('coa-6000', '6000', 'Operating Expenses', 'EXPENSES', 'General operating expenses', true, CURRENT_TIMESTAMP),
  ('coa-6100', '6100', 'Administrative Expenses', 'EXPENSES', 'Administrative and office expenses', true, CURRENT_TIMESTAMP),
  ('coa-6200', '6200', 'Selling Expenses', 'EXPENSES', 'Sales and marketing expenses', true, CURRENT_TIMESTAMP),
  ('coa-6300', '6300', 'Depreciation Expense', 'EXPENSES', 'Depreciation of fixed assets', true, CURRENT_TIMESTAMP),
  ('coa-8100', '8100', 'Inventory Adjustments', 'EXPENSES', 'Inventory adjustment variances', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(accountType);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active ON chart_of_accounts(isActive);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parentId);