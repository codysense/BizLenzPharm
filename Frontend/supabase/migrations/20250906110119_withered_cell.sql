/*
  # Point of Sales (POS) Module

  1. New Tables
    - `pos_sessions`
      - `id` (text, primary key)
      - `sessionNo` (text, unique)
      - `userId` (text, foreign key)
      - `warehouseId` (text, foreign key)
      - `cashAccountId` (text, foreign key)
      - `openingBalance` (decimal)
      - `closingBalance` (decimal)
      - `totalSales` (decimal)
      - `totalReturns` (decimal)
      - `openedAt` (timestamp)
      - `closedAt` (timestamp, optional)
      - `status` (text) - OPEN, CLOSED
      - `createdAt` (timestamp)

    - `pos_sales`
      - `id` (text, primary key)
      - `saleNo` (text, unique)
      - `sessionId` (text, foreign key)
      - `customerId` (text, foreign key, optional)
      - `warehouseId` (text, foreign key)
      - `cashAccountId` (text, foreign key)
      - `subtotal` (decimal)
      - `taxAmount` (decimal)
      - `discountAmount` (decimal)
      - `totalAmount` (decimal)
      - `amountPaid` (decimal)
      - `changeAmount` (decimal)
      - `paymentMethod` (text) - CASH, CARD, TRANSFER
      - `status` (text) - COMPLETED, RETURNED
      - `notes` (text, optional)
      - `userId` (text, foreign key)
      - `createdAt` (timestamp)

    - `pos_sale_lines`
      - `id` (text, primary key)
      - `posSaleId` (text, foreign key)
      - `itemId` (text, foreign key)
      - `qty` (decimal)
      - `unitPrice` (decimal)
      - `discountPercent` (decimal)
      - `lineTotal` (decimal)
      - `createdAt` (timestamp)

    - `pos_returns`
      - `id` (text, primary key)
      - `returnNo` (text, unique)
      - `originalSaleId` (text, foreign key)
      - `sessionId` (text, foreign key)
      - `customerId` (text, foreign key, optional)
      - `warehouseId` (text, foreign key)
      - `totalAmount` (decimal)
      - `refundAmount` (decimal)
      - `reason` (text)
      - `userId` (text, foreign key)
      - `createdAt` (timestamp)

    - `pos_return_lines`
      - `id` (text, primary key)
      - `posReturnId` (text, foreign key)
      - `originalLineId` (text, foreign key)
      - `itemId` (text, foreign key)
      - `qtyReturned` (decimal)
      - `unitPrice` (decimal)
      - `lineTotal` (decimal)
      - `createdAt` (timestamp)

  2. Updates
    - Add `warehouseId` to users table for warehouse assignment
    - Add `outstandingBalance` calculation for customers
    - Add POS role and permissions

  3. Security
    - Enable RLS on all new tables
    - Add warehouse-based policies for POS users
*/

-- Add warehouseId to users table for warehouse assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'warehouseId'
  ) THEN
    ALTER TABLE users ADD COLUMN warehouseId TEXT;
    ALTER TABLE users ADD CONSTRAINT users_warehouseId_fkey 
      FOREIGN KEY (warehouseId) REFERENCES warehouses(id);
  END IF;
END $$;

-- Create pos_sessions table
CREATE TABLE IF NOT EXISTS pos_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sessionNo TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  warehouseId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  openingBalance DECIMAL(15,2) NOT NULL DEFAULT 0,
  closingBalance DECIMAL(15,2),
  totalSales DECIMAL(15,2) NOT NULL DEFAULT 0,
  totalReturns DECIMAL(15,2) NOT NULL DEFAULT 0,
  openedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closedAt TIMESTAMP(3),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id)
);

-- Create pos_sales table
CREATE TABLE IF NOT EXISTS pos_sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  saleNo TEXT UNIQUE NOT NULL,
  sessionId TEXT NOT NULL,
  customerId TEXT,
  warehouseId TEXT NOT NULL,
  cashAccountId TEXT NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  taxAmount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discountAmount DECIMAL(15,2) NOT NULL DEFAULT 0,
  totalAmount DECIMAL(15,2) NOT NULL,
  amountPaid DECIMAL(15,2) NOT NULL,
  changeAmount DECIMAL(15,2) NOT NULL DEFAULT 0,
  paymentMethod TEXT NOT NULL DEFAULT 'CASH' CHECK (paymentMethod IN ('CASH', 'CARD', 'TRANSFER')),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'RETURNED')),
  notes TEXT,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sessionId) REFERENCES pos_sessions(id),
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
  FOREIGN KEY (cashAccountId) REFERENCES cash_accounts(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create pos_sale_lines table
CREATE TABLE IF NOT EXISTS pos_sale_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  posSaleId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  qty DECIMAL(15,4) NOT NULL,
  unitPrice DECIMAL(15,2) NOT NULL,
  discountPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
  lineTotal DECIMAL(15,2) NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posSaleId) REFERENCES pos_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES items(id)
);

-- Create pos_returns table
CREATE TABLE IF NOT EXISTS pos_returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  returnNo TEXT UNIQUE NOT NULL,
  originalSaleId TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  customerId TEXT,
  warehouseId TEXT NOT NULL,
  totalAmount DECIMAL(15,2) NOT NULL,
  refundAmount DECIMAL(15,2) NOT NULL,
  reason TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (originalSaleId) REFERENCES pos_sales(id),
  FOREIGN KEY (sessionId) REFERENCES pos_sessions(id),
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (warehouseId) REFERENCES warehouses(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create pos_return_lines table
CREATE TABLE IF NOT EXISTS pos_return_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  posReturnId TEXT NOT NULL,
  originalLineId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  qtyReturned DECIMAL(15,4) NOT NULL,
  unitPrice DECIMAL(15,2) NOT NULL,
  lineTotal DECIMAL(15,2) NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posReturnId) REFERENCES pos_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (originalLineId) REFERENCES pos_sale_lines(id),
  FOREIGN KEY (itemId) REFERENCES items(id)
);

-- Enable RLS on all new tables
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_return_lines ENABLE ROW LEVEL SECURITY;

-- Create warehouse-based policies for POS users
CREATE POLICY "Users can read pos sessions for their warehouse"
  ON pos_sessions FOR SELECT TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can manage pos sessions for their warehouse"
  ON pos_sessions FOR ALL TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can read pos sales for their warehouse"
  ON pos_sales FOR SELECT TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can manage pos sales for their warehouse"
  ON pos_sales FOR ALL TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can read pos sale lines"
  ON pos_sale_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage pos sale lines"
  ON pos_sale_lines FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read pos returns for their warehouse"
  ON pos_returns FOR SELECT TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can manage pos returns for their warehouse"
  ON pos_returns FOR ALL TO authenticated 
  USING (
    warehouseId = (SELECT warehouseId FROM users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (
      SELECT string_agg(r.name, ',') FROM user_roles ur 
      JOIN roles r ON ur.roleId = r.id 
      WHERE ur.userId = auth.uid()
    ) ~ '(CFO|General Manager)')
  );

CREATE POLICY "Users can read pos return lines"
  ON pos_return_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage pos return lines"
  ON pos_return_lines FOR ALL TO authenticated USING (true);

-- Create POS role and permissions
INSERT INTO roles (id, name, description, createdAt)
VALUES ('role-pos', 'POS User', 'Point of Sales user with warehouse-specific access', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Create POS-specific permissions
INSERT INTO permissions (id, name, resource, action, description)
VALUES 
  ('perm-pos-read', 'pos.sale.read', 'pos', 'read', 'Read POS sales'),
  ('perm-pos-create', 'pos.sale.create', 'pos', 'create', 'Create POS sales'),
  ('perm-pos-return', 'pos.return.create', 'pos', 'return', 'Process returns'),
  ('perm-pos-session', 'pos.session.manage', 'pos', 'manage', 'Manage POS sessions')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to POS role
INSERT INTO role_permissions (id, roleId, permissionId)
SELECT 
  gen_random_uuid()::text,
  'role-pos',
  p.id
FROM permissions p
WHERE p.name IN (
  'pos.sale.read', 'pos.sale.create', 'pos.return.create', 'pos.session.manage',
  'inventory.item.read', 'sales.customer.read', 'sales.customer.create'
)
ON CONFLICT (roleId, permissionId) DO NOTHING;

-- Create customer outstanding balance view
CREATE OR REPLACE VIEW customer_outstanding_balances AS
SELECT 
  c.id as customer_id,
  c.code as customer_code,
  c.name as customer_name,
  COALESCE(sales_total.total, 0) - COALESCE(receipts_total.total, 0) as outstanding_balance
FROM customers c
LEFT JOIN (
  SELECT 
    customerId,
    SUM(totalAmount) as total
  FROM sales 
  WHERE status IN ('INVOICED', 'PAID')
  GROUP BY customerId
) sales_total ON c.id = sales_total.customerId
LEFT JOIN (
  SELECT 
    customerId,
    SUM(amountReceived) as total
  FROM sales_receipts
  GROUP BY customerId
) receipts_total ON c.id = receipts_total.customerId;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pos_sessions_warehouse ON pos_sessions(warehouseId);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_user ON pos_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_pos_sales_warehouse ON pos_sales(warehouseId);
CREATE INDEX IF NOT EXISTS idx_pos_sales_session ON pos_sales(sessionId);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer ON pos_sales(customerId);
CREATE INDEX IF NOT EXISTS idx_users_warehouse ON users(warehouseId);