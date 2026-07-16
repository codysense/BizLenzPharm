/*
  # Enhanced Cash Management System

  1. New Tables
    - Enhanced `cash_accounts` with GL account linking
    - Enhanced `cash_transactions` with GL account and contra account support
    - `bank_reconciliations` for reconciliation tracking
    - `bank_statement_lines` for imported bank statements
    - Enhanced `sales_receipts` and `purchase_payments`

  2. Features
    - GL account integration for proper double-entry bookkeeping
    - Bank reconciliation support
    - Bank statement import capability
    - Running balance tracking
    - Contra account support for transfers

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing cash tables if they exist
DROP TABLE IF EXISTS purchase_payments CASCADE;
DROP TABLE IF EXISTS sales_receipts CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS cash_accounts CASCADE;

-- Create enhanced cash_accounts table
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  accountType TEXT NOT NULL CHECK (accountType IN ('CASH', 'BANK')),
  accountNumber TEXT,
  bankName TEXT,
  glAccountId TEXT NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (glAccountId) REFERENCES chart_of_accounts(id)
);

-- Create enhanced cash_transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transactionNo TEXT UNIQUE NOT NULL,
  cashAccountId TEXT NOT NULL,
  glAccountId TEXT NOT NULL,
  contraAccountId TEXT,
  transactionType TEXT NOT NULL CHECK (transactionType IN ('RECEIPT', 'PAYMENT')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  transactionDate TIMESTAMP(3) NOT NULL,
  isReconciled BOOLEAN NOT NULL DEFAULT false,
  reconciledAt TIMESTAMP(3),
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (glAccountId) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (contraAccountId) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create bank_reconciliations table
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cashAccountId TEXT NOT NULL,
  statementDate DATE NOT NULL,
  statementBalance DECIMAL(15,2) NOT NULL,
  bookBalance DECIMAL(15,2) NOT NULL,
  reconciledBy TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (reconciledBy) REFERENCES users(id)
);

-- Create bank_statement_lines table
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cashAccountId TEXT NOT NULL,
  statementDate DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transactionType TEXT NOT NULL CHECK (transactionType IN ('RECEIPT', 'PAYMENT')),
  reference TEXT,
  isMatched BOOLEAN NOT NULL DEFAULT false,
  matchedTransactionId TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (matchedTransactionId) REFERENCES cash_transactions(id)
);

-- Create enhanced sales_receipts table
CREATE TABLE IF NOT EXISTS sales_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receiptNo TEXT UNIQUE NOT NULL,
  saleId TEXT,
  customerId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  amountReceived DECIMAL(15,2) NOT NULL,
  receiptDate TIMESTAMP(3) NOT NULL,
  reference TEXT,
  notes TEXT,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saleId) REFERENCES sales(id),
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create enhanced purchase_payments table
CREATE TABLE IF NOT EXISTS purchase_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  paymentNo TEXT UNIQUE NOT NULL,
  purchaseId TEXT,
  vendorId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  amountPaid DECIMAL(15,2) NOT NULL,
  paymentDate TIMESTAMP(3) NOT NULL,
  reference TEXT,
  notes TEXT,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchaseId) REFERENCES purchases(id),
  FOREIGN KEY (vendorId) REFERENCES vendors(id),
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Enable RLS on all tables
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read cash accounts"
  ON cash_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage cash accounts"
  ON cash_accounts FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read cash transactions"
  ON cash_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage cash transactions"
  ON cash_transactions FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read bank reconciliations"
  ON bank_reconciliations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage bank reconciliations"
  ON bank_reconciliations FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read bank statement lines"
  ON bank_statement_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage bank statement lines"
  ON bank_statement_lines FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read sales receipts"
  ON sales_receipts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage sales receipts"
  ON sales_receipts FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read purchase payments"
  ON purchase_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage purchase payments"
  ON purchase_payments FOR ALL TO authenticated USING (true);

-- Create default cash accounts with GL account links
INSERT INTO cash_accounts (id, code, name, accountType, glAccountId, balance, isActive, createdAt)
VALUES 
  ('cash-001', 'CASH-001', 'Petty Cash', 'CASH', 
   (SELECT id FROM chart_of_accounts WHERE code = '1100' LIMIT 1), 
   50000.00, true, CURRENT_TIMESTAMP),
  ('bank-001', 'BANK-001', 'First Bank Current Account', 'BANK', 
   (SELECT id FROM chart_of_accounts WHERE code = '1100' LIMIT 1), 
   1000000.00, true, CURRENT_TIMESTAMP),
  ('bank-002', 'BANK-002', 'GTBank Savings Account', 'BANK', 
   (SELECT id FROM chart_of_accounts WHERE code = '1100' LIMIT 1), 
   500000.00, true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;