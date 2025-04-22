/*
  # Add Grace Minutes to Shift Configs

  1. Changes
    - Add grace_minutes column to shift_configs table
    - Set default value of 15 minutes
    - Update existing records
*/

-- Add grace_minutes column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE shift_configs
    ADD COLUMN grace_minutes integer NOT NULL DEFAULT 15;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update existing records to have default grace period
UPDATE shift_configs
SET grace_minutes = 15
WHERE grace_minutes IS NULL;