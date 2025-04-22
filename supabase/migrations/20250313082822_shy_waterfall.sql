/*
  # Add is_paid column to leave_types

  1. Changes
    - Add is_paid column to leave_types table
    - Set default value for existing records
*/

-- Add is_paid column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE leave_types
  ADD COLUMN is_paid boolean NOT NULL DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update existing records to have is_paid set appropriately
UPDATE leave_types
SET is_paid = CASE
  WHEN name ILIKE '%unpaid%' THEN false
  ELSE true
END
WHERE is_paid IS NULL;