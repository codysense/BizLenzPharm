/*
  # Assets Management System

  1. New Tables
    - `asset_categories`
      - `id` (text, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text, optional)
      - `depreciationMethod` (text) - STRAIGHT_LINE, REDUCING_BALANCE
      - `usefulLife` (integer) - in years
      - `residualValue` (decimal) - percentage
      - `glAssetAccountId` (text, foreign key)
      - `glDepreciationAccountId` (text, foreign key)
      - `glAccumulatedDepreciationAccountId` (text, foreign key)
      - `isActive` (boolean, default true)
      - `createdAt` (timestamp)

    - `assets`
      - `id` (text, primary key)
      - `assetNo` (text, unique)
      - `name` (text)
      - `description` (text, optional)
      - `categoryId` (text, foreign key)
      - `acquisitionDate` (date)
      - `acquisitionCost` (decimal)
      - `residualValue` (decimal)
      - `usefulLife` (integer) - in years
      - `depreciationMethod` (text)
      - `locationId` (text, foreign key)
      - `serialNumber` (text, optional)
      - `supplier` (text, optional)
      - `purchaseOrderId` (text, foreign key, optional)
      - `status` (text) - ACTIVE, DISPOSED, SOLD, WRITTEN_OFF
      - `disposalDate` (date, optional)
      - `disposalAmount` (decimal, optional)
      - `disposalMethod` (text, optional)
      - `createdBy` (text, foreign key)
      - `createdAt` (timestamp)

    - `asset_depreciation`
      - `id` (text, primary key)
      - `assetId` (text, foreign key)
      - `periodYear` (integer)
      - `periodMonth` (integer)
      - `depreciationAmount` (decimal)
      - `accumulatedDepreciation` (decimal)
      - `netBookValue` (decimal)
      - `isPosted` (boolean, default false)
      - `postedAt` (timestamp, optional)
      - `journalId` (text, foreign key, optional)
      - `createdAt` (timestamp)

    - `asset_disposals`
      - `id` (text, primary key)
      - `assetId` (text, foreign key)
      - `disposalDate` (date)
      - `disposalAmount` (decimal)
      - `disposalMethod` (text) - SALE, SCRAP, DONATION, WRITE_OFF
      - `buyerDetails` (text, optional)
      - `gainLoss` (decimal)
      - `notes` (text, optional)
      - `journalId` (text, foreign key, optional)
      - `disposedBy` (text, foreign key)
      - `createdAt` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  3. Initial Data
    - Create default asset categories
    - Set up GL accounts for assets
*/

-- Create asset_categories table
CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  depreciationMethod TEXT NOT NULL CHECK (depreciationMethod IN ('STRAIGHT_LINE', 'REDUCING_BALANCE')),
  usefulLife INTEGER NOT NULL DEFAULT 5,
  residualValue DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  glAssetAccountId TEXT NOT NULL,
  glDepreciationAccountId TEXT NOT NULL,
  glAccumulatedDepreciationAccountId TEXT NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (glAssetAccountId) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (glDepreciationAccountId) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (glAccumulatedDepreciationAccountId) REFERENCES chart_of_accounts(id)
);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assetNo TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  categoryId TEXT NOT NULL,
  acquisitionDate DATE NOT NULL,
  acquisitionCost DECIMAL(15,2) NOT NULL,
  residualValue DECIMAL(15,2) NOT NULL DEFAULT 0,
  usefulLife INTEGER NOT NULL,
  depreciationMethod TEXT NOT NULL CHECK (depreciationMethod IN ('STRAIGHT_LINE', 'REDUCING_BALANCE')),
  locationId TEXT,
  serialNumber TEXT,
  supplier TEXT,
  purchaseOrderId TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPOSED', 'SOLD', 'WRITTEN_OFF')),
  disposalDate DATE,
  disposalAmount DECIMAL(15,2),
  disposalMethod TEXT CHECK (disposalMethod IN ('SALE', 'SCRAP', 'DONATION', 'WRITE_OFF')),
  createdBy TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoryId) REFERENCES asset_categories(id),
  FOREIGN KEY (locationId) REFERENCES locations(id),
  FOREIGN KEY (purchaseOrderId) REFERENCES purchases(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- Create asset_depreciation table
CREATE TABLE IF NOT EXISTS asset_depreciation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assetId TEXT NOT NULL,
  periodYear INTEGER NOT NULL,
  periodMonth INTEGER NOT NULL,
  depreciationAmount DECIMAL(15,2) NOT NULL,
  accumulatedDepreciation DECIMAL(15,2) NOT NULL,
  netBookValue DECIMAL(15,2) NOT NULL,
  isPosted BOOLEAN NOT NULL DEFAULT false,
  postedAt TIMESTAMP(3),
  journalId TEXT,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (journalId) REFERENCES journals(id),
  UNIQUE(assetId, periodYear, periodMonth)
);

-- Create asset_disposals table
CREATE TABLE IF NOT EXISTS asset_disposals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assetId TEXT NOT NULL,
  disposalDate DATE NOT NULL,
  disposalAmount DECIMAL(15,2) NOT NULL,
  disposalMethod TEXT NOT NULL CHECK (disposalMethod IN ('SALE', 'SCRAP', 'DONATION', 'WRITE_OFF')),
  buyerDetails TEXT,
  gainLoss DECIMAL(15,2) NOT NULL,
  notes TEXT,
  journalId TEXT,
  disposedBy TEXT NOT NULL,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assetId) REFERENCES assets(id),
  FOREIGN KEY (journalId) REFERENCES journals(id),
  FOREIGN KEY (disposedBy) REFERENCES users(id)
);

-- Enable RLS on all new tables
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read asset categories"
  ON asset_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage asset categories"
  ON asset_categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read assets"
  ON assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage assets"
  ON assets FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read asset depreciation"
  ON asset_depreciation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage asset depreciation"
  ON asset_depreciation FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can read asset disposals"
  ON asset_disposals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage asset disposals"
  ON asset_disposals FOR ALL TO authenticated USING (true);

-- Create default GL accounts for assets
INSERT INTO chart_of_accounts (id, code, name, accountType, description, isActive, createdAt)
VALUES 
  -- Asset Accounts
  ('coa-1510', '1510', 'Plant and Equipment', 'NON_CURRENT_ASSETS', 'Plant and equipment at cost', true, CURRENT_TIMESTAMP),
  ('coa-1520', '1520', 'Motor Vehicles', 'NON_CURRENT_ASSETS', 'Motor vehicles at cost', true, CURRENT_TIMESTAMP),
  ('coa-1530', '1530', 'Office Equipment', 'NON_CURRENT_ASSETS', 'Office equipment at cost', true, CURRENT_TIMESTAMP),
  ('coa-1540', '1540', 'Computer Equipment', 'NON_CURRENT_ASSETS', 'Computer equipment at cost', true, CURRENT_TIMESTAMP),
  
  -- Accumulated Depreciation Accounts
  ('coa-1610', '1610', 'Accumulated Depreciation - Plant', 'NON_CURRENT_ASSETS', 'Accumulated depreciation on plant and equipment', true, CURRENT_TIMESTAMP),
  ('coa-1620', '1620', 'Accumulated Depreciation - Vehicles', 'NON_CURRENT_ASSETS', 'Accumulated depreciation on motor vehicles', true, CURRENT_TIMESTAMP),
  ('coa-1630', '1630', 'Accumulated Depreciation - Office Equipment', 'NON_CURRENT_ASSETS', 'Accumulated depreciation on office equipment', true, CURRENT_TIMESTAMP),
  ('coa-1640', '1640', 'Accumulated Depreciation - Computer Equipment', 'NON_CURRENT_ASSETS', 'Accumulated depreciation on computer equipment', true, CURRENT_TIMESTAMP),
  
  -- Depreciation Expense Accounts
  ('coa-6310', '6310', 'Depreciation - Plant and Equipment', 'EXPENSES', 'Depreciation expense for plant and equipment', true, CURRENT_TIMESTAMP),
  ('coa-6320', '6320', 'Depreciation - Motor Vehicles', 'EXPENSES', 'Depreciation expense for motor vehicles', true, CURRENT_TIMESTAMP),
  ('coa-6330', '6330', 'Depreciation - Office Equipment', 'EXPENSES', 'Depreciation expense for office equipment', true, CURRENT_TIMESTAMP),
  ('coa-6340', '6340', 'Depreciation - Computer Equipment', 'EXPENSES', 'Depreciation expense for computer equipment', true, CURRENT_TIMESTAMP),
  
  -- Asset Disposal Accounts
  ('coa-4700', '4700', 'Gain on Asset Disposal', 'OTHER_INCOME', 'Gains from asset disposals', true, CURRENT_TIMESTAMP),
  ('coa-6400', '6400', 'Loss on Asset Disposal', 'EXPENSES', 'Losses from asset disposals', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Create default asset categories
INSERT INTO asset_categories (id, code, name, description, depreciationMethod, usefulLife, residualValue, glAssetAccountId, glDepreciationAccountId, glAccumulatedDepreciationAccountId, isActive, createdAt)
VALUES 
  ('cat-plant', 'PLANT', 'Plant and Equipment', 'Manufacturing plant and equipment', 'STRAIGHT_LINE', 10, 10.00, 
   (SELECT id FROM chart_of_accounts WHERE code = '1510'), 
   (SELECT id FROM chart_of_accounts WHERE code = '6310'), 
   (SELECT id FROM chart_of_accounts WHERE code = '1610'), true, CURRENT_TIMESTAMP),
  
  ('cat-vehicles', 'VEHICLES', 'Motor Vehicles', 'Company motor vehicles', 'REDUCING_BALANCE', 5, 20.00,
   (SELECT id FROM chart_of_accounts WHERE code = '1520'), 
   (SELECT id FROM chart_of_accounts WHERE code = '6320'), 
   (SELECT id FROM chart_of_accounts WHERE code = '1620'), true, CURRENT_TIMESTAMP),
  
  ('cat-office', 'OFFICE', 'Office Equipment', 'Office furniture and equipment', 'STRAIGHT_LINE', 5, 5.00,
   (SELECT id FROM chart_of_accounts WHERE code = '1530'), 
   (SELECT id FROM chart_of_accounts WHERE code = '6330'), 
   (SELECT id FROM chart_of_accounts WHERE code = '1630'), true, CURRENT_TIMESTAMP),
  
  ('cat-computer', 'COMPUTER', 'Computer Equipment', 'Computer hardware and software', 'STRAIGHT_LINE', 3, 0.00,
   (SELECT id FROM chart_of_accounts WHERE code = '1540'), 
   (SELECT id FROM chart_of_accounts WHERE code = '6340'), 
   (SELECT id FROM chart_of_accounts WHERE code = '1640'), true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;