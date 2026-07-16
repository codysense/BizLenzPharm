/*
  # Consolidate Account Types with New Mapping

  1. Changes
    - Update account type constraints to include new types
    - Add Trade Receivables and Trade Payables types
    - Add Equity type for owner's equity accounts
    - Update existing account types to match new mapping
    - Allow editing of account types after creation

  2. Account Type Mapping
    - REVENUE -> INCOME
    - EXPENSE -> EXPENSES  
    - ASSET -> CURRENT_ASSETS
    - LIABILITY -> CURRENT_LIABILITY
    - Add TRADE_RECEIVABLES
    - Add TRADE_PAYABLES
    - Add EQUITY

  3. Code Generation Ranges
    - Current Assets: 1000-1499
    - Non-Current Assets: 1500-1999
    - Trade Receivables: 1200-1299
    - Current Liability: 2000-2499
    - Non-Current Liability: 2500-2999
    - Trade Payables: 2100-2199
    - Equity: 3000-3999
    - Income: 4000-4499
    - Other Income: 4500-4999
    - Cost of Sales: 5000-5999
    - Expenses: 6000-8999
*/

-- Update account type constraint to include all new types
ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_accounttype_check;
ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_accounttype_check 
  CHECK (accountType IN (
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
  ));

-- Update existing accounts to match new mapping
UPDATE chart_of_accounts SET accountType = 'INCOME' WHERE accountType = 'REVENUE';
UPDATE chart_of_accounts SET accountType = 'EXPENSES' WHERE accountType = 'EXPENSE';
UPDATE chart_of_accounts SET accountType = 'CURRENT_ASSETS' WHERE accountType = 'ASSET';
UPDATE chart_of_accounts SET accountType = 'CURRENT_LIABILITY' WHERE accountType = 'LIABILITY';

-- Create default accounts for new types
INSERT INTO chart_of_accounts (id, code, name, accountType, description, isActive, createdAt)
VALUES 
  -- Trade Receivables
  ('coa-1210', '1210', 'Trade Receivables - Local', 'TRADE_RECEIVABLES', 'Receivables from local customers', true, CURRENT_TIMESTAMP),
  ('coa-1220', '1220', 'Trade Receivables - Export', 'TRADE_RECEIVABLES', 'Receivables from export customers', true, CURRENT_TIMESTAMP),
  
  -- Trade Payables
  ('coa-2110', '2110', 'Trade Payables - Local', 'TRADE_PAYABLES', 'Payables to local suppliers', true, CURRENT_TIMESTAMP),
  ('coa-2120', '2120', 'Trade Payables - Import', 'TRADE_PAYABLES', 'Payables to import suppliers', true, CURRENT_TIMESTAMP),
  
  -- Equity
  ('coa-3000', '3000', 'Share Capital', 'EQUITY', 'Issued share capital', true, CURRENT_TIMESTAMP),
  ('coa-3100', '3100', 'Retained Earnings', 'EQUITY', 'Accumulated retained earnings', true, CURRENT_TIMESTAMP),
  ('coa-3200', '3200', 'Current Year Earnings', 'EQUITY', 'Current year profit/loss', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(accountType);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active ON chart_of_accounts(isActive);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parentId);