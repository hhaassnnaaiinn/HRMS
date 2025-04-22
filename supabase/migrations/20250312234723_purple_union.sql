/*
  # Fix shift_configs table

  1. Changes
    - Drop existing table if it exists
    - Create shift_configs table with proper schema
    - Add RLS policies
    - Add default shifts
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS shift_configs CASCADE;

-- Create shift_configs table
CREATE TABLE shift_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_ramadan boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shift_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage shift configs"
  ON shift_configs
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Everyone can view shift configs"
  ON shift_configs FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_shift_configs_updated_at
      BEFORE UPDATE ON shift_configs
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert default shifts
INSERT INTO shift_configs (name, start_time, end_time, is_ramadan) VALUES
  ('Regular Shift 1', '09:00', '18:00', false),
  ('Regular Shift 2', '10:00', '19:00', false),
  ('Ramadan Shift', '09:00', '16:00', true);