/*
  # Create Cash Management Tables

  1. New Tables
    - `cash_accounts`
      - `id` (text, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `accountType` (text) - CASH, BANK
      - `accountNumber` (text, optional)
      - `bankName` (text, optional)
      - `balance` (decimal)
      - `isActive` (boolean, default true)
      - `createdAt` (timestamp)

    - `cash_transactions`
      - `id` (text, primary key)
      - `transactionNo` (text, unique)
      - `cashAccountId` (text, foreign key)
      - `transactionType` (text) - RECEIPT, PAYMENT
      - `amount` (decimal)
      - `description` (text)
      - `refType` (text, optional) - SALES_RECEIPT, PURCHASE_PAYMENT, OTHER
      - `refId` (text, optional)
      - `transactionDate` (timestamp)
      - `userId` (text, foreign key)
      - `createdAt` (timestamp)

    - `sales_receipts`
      - `id` (text, primary key)
      - `receiptNo` (text, unique)
      - `saleId` (text, foreign key)
      - `customerId` (text, foreign key)
      - `cashAccountId` (text, foreign key)
      - `amountReceived` (decimal)
      - `receiptDate` (timestamp)
      - `notes` (text, optional)
      - `userId` (text, foreign key)
      - `createdAt` (timestamp)

    - `purchase_payments`
      - `id` (text, primary key)
      - `paymentNo` (text, unique)
      - `purchaseId` (text, foreign key)
      - `vendorId` (text, foreign key)
      - `cashAccountId` (text, foreign key)
      - `amountPaid` (decimal)
      - `paymentDate` (timestamp)
      - `notes` (text, optional)
      - `userId` (text, foreign key)
      - `createdAt` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  3. Initial Data
    - Create default cash and bank accounts
*/

-- Create cash_accounts table
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  accountType TEXT NOT NULL CHECK (accountType IN ('CASH', 'BANK')),
  accountNumber TEXT,
  bankName TEXT,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create cash_transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transactionNo TEXT UNIQUE NOT NULL,
  cashAccountId TEXT NOT NULL,
  transactionType TEXT NOT NULL CHECK (transactionType IN ('RECEIPT', 'PAYMENT')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  refType TEXT CHECK (refType IN ('SALES_RECEIPT', 'PURCHASE_PAYMENT', 'OTHER')),
  refId TEXT,
  transactionDate TIMESTAMP(3) NOT NULL,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_receipts table
CREATE TABLE IF NOT EXISTS sales_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receiptNo TEXT UNIQUE NOT NULL,
  saleId TEXT NOT NULL,
  customerId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  amountReceived DECIMAL(15,2) NOT NULL,
  receiptDate TIMESTAMP(3) NOT NULL,
  notes TEXT,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_payments table
CREATE TABLE IF NOT EXISTS purchase_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  paymentNo TEXT UNIQUE NOT NULL,
  purchaseId TEXT NOT NULL,
  vendorId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  amountPaid DECIMAL(15,2) NOT NULL,
  paymentDate TIMESTAMP(3) NOT NULL,
  notes TEXT,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
DO $$
BEGIN
  -- Cash transactions foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cash_transactions_cashAccountId_fkey'
  ) THEN
    ALTER TABLE cash_transactions 
    ADD CONSTRAINT cash_transactions_cashAccountId_fkey 
    FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cash_transactions_userId_fkey'
  ) THEN
    ALTER TABLE cash_transactions 
    ADD CONSTRAINT cash_transactions_userId_fkey 
    FOREIGN KEY (userId) REFERENCES users(id);
  END IF;

  -- Sales receipts foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_receipts_saleId_fkey'
  ) THEN
    ALTER TABLE sales_receipts 
    ADD CONSTRAINT sales_receipts_saleId_fkey 
    FOREIGN KEY (saleId) REFERENCES sales(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_receipts_customerId_fkey'
  ) THEN
    ALTER TABLE sales_receipts 
    ADD CONSTRAINT sales_receipts_customerId_fkey 
    FOREIGN KEY (customerId) REFERENCES customers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_receipts_cashAccountId_fkey'
  ) THEN
    ALTER TABLE sales_receipts 
    ADD CONSTRAINT sales_receipts_cashAccountId_fkey 
    FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_receipts_userId_fkey'
  ) THEN
    ALTER TABLE sales_receipts 
    ADD CONSTRAINT sales_receipts_userId_fkey 
    FOREIGN KEY (userId) REFERENCES users(id);
  END IF;

  -- Purchase payments foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_payments_purchaseId_fkey'
  ) THEN
    ALTER TABLE purchase_payments 
    ADD CONSTRAINT purchase_payments_purchaseId_fkey 
    FOREIGN KEY (purchaseId) REFERENCES purchases(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_payments_vendorId_fkey'
  ) THEN
    ALTER TABLE purchase_payments 
    ADD CONSTRAINT purchase_payments_vendorId_fkey 
    FOREIGN KEY (vendorId) REFERENCES vendors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_payments_cashAccountId_fkey'
  ) THEN
    ALTER TABLE purchase_payments 
    ADD CONSTRAINT purchase_payments_cashAccountId_fkey 
    FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_payments_userId_fkey'
  ) THEN
    ALTER TABLE purchase_payments 
    ADD CONSTRAINT purchase_payments_userId_fkey 
    FOREIGN KEY (userId) REFERENCES users(id);
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read cash accounts"
  ON cash_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage cash accounts"
  ON cash_accounts
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read cash transactions"
  ON cash_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage cash transactions"
  ON cash_transactions
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read sales receipts"
  ON sales_receipts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage sales receipts"
  ON sales_receipts
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read purchase payments"
  ON purchase_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage purchase payments"
  ON purchase_payments
  FOR ALL
  TO authenticated
  USING (true);

-- Insert default cash accounts
INSERT INTO cash_accounts (id, code, name, accountType, balance, isActive, createdAt)
VALUES 
  ('cash-001', 'CASH-001', 'Petty Cash', 'CASH', 50000.00, true, CURRENT_TIMESTAMP),
  ('bank-001', 'BANK-001', 'First Bank Current Account', 'BANK', 1000000.00, true, CURRENT_TIMESTAMP),
  ('bank-002', 'BANK-002', 'GTBank Savings Account', 'BANK', 500000.00, true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;