-- Management Module Migration
-- Company Settings, Fiscal Calendar, Approval Flows, System Configuration

-- Create fiscal_years table
CREATE TABLE IF NOT EXISTS fiscal_years (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year INTEGER UNIQUE NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT false,
  isClosed BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create fiscal_periods table
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  fiscalYearId TEXT NOT NULL,
  periodNumber INTEGER NOT NULL,
  name TEXT NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT false,
  isClosed BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fiscalYearId) REFERENCES fiscal_years(id) ON DELETE CASCADE,
  UNIQUE(fiscalYearId, periodNumber)
);

-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  entity TEXT NOT NULL,
  minAmount DECIMAL(15,2),
  maxAmount DECIMAL(15,2),
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create approval_steps table
CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workflowId TEXT NOT NULL,
  stepOrder INTEGER NOT NULL,
  name TEXT NOT NULL,
  roleId TEXT NOT NULL,
  isRequired BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflowId) REFERENCES approval_workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id),
  UNIQUE(workflowId, stepOrder)
);

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workflowId TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  requestedBy TEXT NOT NULL,
  currentStepId TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requestedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP(3),
  FOREIGN KEY (workflowId) REFERENCES approval_workflows(id),
  FOREIGN KEY (requestedBy) REFERENCES users(id),
  FOREIGN KEY (currentStepId) REFERENCES approval_steps(id)
);

-- Create approval_actions table
CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  requestId TEXT NOT NULL,
  stepId TEXT NOT NULL,
  userId TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('APPROVE', 'REJECT')),
  comments TEXT,
  actionDate TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requestId) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (stepId) REFERENCES approval_steps(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  dataType TEXT NOT NULL DEFAULT 'STRING' CHECK (dataType IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
  description TEXT,
  isEditable BOOLEAN NOT NULL DEFAULT true,
  updatedBy TEXT NOT NULL,
  updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updatedBy) REFERENCES users(id),
  UNIQUE(category, key)
);

-- Add approval columns to existing tables
DO $$
BEGIN
  -- Add approval columns to purchases table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'approvalStatus'
  ) THEN
    ALTER TABLE purchases ADD COLUMN approvalStatus TEXT DEFAULT 'APPROVED';
    ALTER TABLE purchases ADD COLUMN approvalRequestId TEXT;
    ALTER TABLE purchases ADD COLUMN approvedBy TEXT;
    ALTER TABLE purchases ADD COLUMN approvedAt TIMESTAMP(3);
  END IF;

  -- Add approval columns to sales table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'approvalStatus'
  ) THEN
    ALTER TABLE sales ADD COLUMN approvalStatus TEXT DEFAULT 'APPROVED';
    ALTER TABLE sales ADD COLUMN approvalRequestId TEXT;
    ALTER TABLE sales ADD COLUMN approvedBy TEXT;
    ALTER TABLE sales ADD COLUMN approvedAt TIMESTAMP(3);
  END IF;

  -- Add approval columns to production_orders table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_orders' AND column_name = 'approvalStatus'
  ) THEN
    ALTER TABLE production_orders ADD COLUMN approvalStatus TEXT DEFAULT 'APPROVED';
    ALTER TABLE production_orders ADD COLUMN approvalRequestId TEXT;
    ALTER TABLE production_orders ADD COLUMN approvedBy TEXT;
    ALTER TABLE production_orders ADD COLUMN approvedAt TIMESTAMP(3);
  END IF;
END $$;

-- Insert default fiscal year (2025)
INSERT INTO fiscal_years (id, year, startDate, endDate, isActive, isClosed, createdAt)
VALUES 
  ('fy-2025', 2025, '2025-01-01', '2025-12-31', true, false, CURRENT_TIMESTAMP)
ON CONFLICT (year) DO NOTHING;

-- Insert fiscal periods for 2025
INSERT INTO fiscal_periods (id, fiscalYearId, periodNumber, name, startDate, endDate, isActive, isClosed, createdAt)
VALUES 
  ('fp-2025-01', 'fy-2025', 1, 'January 2025', '2025-01-01', '2025-01-31', true, false, CURRENT_TIMESTAMP),
  ('fp-2025-02', 'fy-2025', 2, 'February 2025', '2025-02-01', '2025-02-28', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-03', 'fy-2025', 3, 'March 2025', '2025-03-01', '2025-03-31', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-04', 'fy-2025', 4, 'April 2025', '2025-04-01', '2025-04-30', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-05', 'fy-2025', 5, 'May 2025', '2025-05-01', '2025-05-31', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-06', 'fy-2025', 6, 'June 2025', '2025-06-01', '2025-06-30', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-07', 'fy-2025', 7, 'July 2025', '2025-07-01', '2025-07-31', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-08', 'fy-2025', 8, 'August 2025', '2025-08-01', '2025-08-31', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-09', 'fy-2025', 9, 'September 2025', '2025-09-01', '2025-09-30', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-10', 'fy-2025', 10, 'October 2025', '2025-10-01', '2025-10-31', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-11', 'fy-2025', 11, 'November 2025', '2025-11-01', '2025-11-30', false, false, CURRENT_TIMESTAMP),
  ('fp-2025-12', 'fy-2025', 12, 'December 2025', '2025-12-01', '2025-12-31', false, false, CURRENT_TIMESTAMP)
ON CONFLICT (fiscalYearId, periodNumber) DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (category, key, value, dataType, description, isEditable, updatedBy, updatedAt)
VALUES 
  ('COSTING', 'GLOBAL_COSTING_METHOD', 'WEIGHTED_AVG', 'STRING', 'Global inventory costing method (FIFO or WEIGHTED_AVG)', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'COMPANY_NAME', 'Manufacturing Corp', 'STRING', 'Company legal name', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'BASE_CURRENCY', 'NGN', 'STRING', 'Base currency for financial reporting', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'TIMEZONE', 'Africa/Lagos', 'STRING', 'Company timezone', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'ADDRESS', '123 Industrial Area, Lagos, Nigeria', 'STRING', 'Company address', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'PHONE', '+234-800-123-4567', 'STRING', 'Company phone number', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('COMPANY', 'EMAIL', 'info@manufacturingcorp.com', 'STRING', 'Company email address', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('APPROVAL', 'PURCHASE_APPROVAL_THRESHOLD', '100000', 'NUMBER', 'Purchase orders above this amount require approval', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('APPROVAL', 'SALES_APPROVAL_THRESHOLD', '500000', 'NUMBER', 'Sales orders above this amount require approval', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('APPROVAL', 'PRODUCTION_APPROVAL_REQUIRED', 'true', 'BOOLEAN', 'Whether production orders require approval', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('INVENTORY', 'LOW_STOCK_THRESHOLD', '10', 'NUMBER', 'Minimum stock level for low stock alerts', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP),
  ('INVENTORY', 'AUTO_REORDER_ENABLED', 'false', 'BOOLEAN', 'Enable automatic reorder point calculations', true, (SELECT id FROM users LIMIT 1), CURRENT_TIMESTAMP)
ON CONFLICT (category, key) DO NOTHING;

-- Create default approval workflows
INSERT INTO approval_workflows (id, name, entity, minAmount, maxAmount, isActive, createdAt)
VALUES 
  ('wf-purchase-high', 'High Value Purchase Approval', 'PURCHASE_ORDER', 100000, NULL, true, CURRENT_TIMESTAMP),
  ('wf-sales-high', 'High Value Sales Approval', 'SALES_ORDER', 500000, NULL, true, CURRENT_TIMESTAMP),
  ('wf-production', 'Production Order Approval', 'PRODUCTION_ORDER', NULL, NULL, false, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Create approval steps for high value purchases (CFO approval)
INSERT INTO approval_steps (id, workflowId, stepOrder, name, roleId, isRequired, createdAt)
VALUES 
  ('step-purchase-cfo', 'wf-purchase-high', 1, 'CFO Approval', (SELECT id FROM roles WHERE name = 'CFO' LIMIT 1), true, CURRENT_TIMESTAMP),
  ('step-sales-cfo', 'wf-sales-high', 1, 'CFO Approval', (SELECT id FROM roles WHERE name = 'CFO' LIMIT 1), true, CURRENT_TIMESTAMP),
  ('step-production-gm', 'wf-production', 1, 'General Manager Approval', (SELECT id FROM roles WHERE name = 'General Manager' LIMIT 1), true, CURRENT_TIMESTAMP)
ON CONFLICT (workflowId, stepOrder) DO NOTHING;