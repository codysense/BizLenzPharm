/*
  # Add Locations and update Warehouses

  1. New Tables
    - `locations`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `address` (text, optional)
      - `city` (text, optional)
      - `state` (text, optional)
      - `country` (text, default 'Nigeria')
      - `isActive` (boolean, default true)
      - `createdAt` (timestamp)

  2. Changes
    - Add `locationId` column to `warehouses` table
    - Add foreign key relationship from warehouses to locations

  3. Data Migration
    - Create default locations for existing warehouses
    - Update existing warehouses to reference default locations
*/

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create default locations for existing data
INSERT INTO locations (id, code, name, address, city, state, country, isActive, createdAt)
VALUES 
  ('default-lagos', 'LAG', 'Lagos Location', 'Lagos State, Nigeria', 'Lagos', 'Lagos', 'Nigeria', true, CURRENT_TIMESTAMP),
  ('default-abuja', 'ABJ', 'Abuja Location', 'FCT, Nigeria', 'Abuja', 'FCT', 'Nigeria', true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Add locationId column to warehouses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouses' AND column_name = 'locationId'
  ) THEN
    ALTER TABLE warehouses ADD COLUMN locationId TEXT;
  END IF;
END $$;

-- Update existing warehouses to reference default location
UPDATE warehouses 
SET locationId = 'default-lagos' 
WHERE locationId IS NULL;

-- Make locationId NOT NULL after setting default values
ALTER TABLE warehouses ALTER COLUMN locationId SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'warehouses_locationId_fkey'
  ) THEN
    ALTER TABLE warehouses 
    ADD CONSTRAINT warehouses_locationId_fkey 
    FOREIGN KEY (locationId) REFERENCES locations(id);
  END IF;
END $$;