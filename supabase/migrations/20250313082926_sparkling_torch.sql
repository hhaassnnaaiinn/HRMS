/*
  # Fix Leave Balances Table Name

  1. Changes
    - Rename employee_leave_balances to leave_balances
    - Update references and policies
*/

-- Rename table if it exists
DO $$ BEGIN
  ALTER TABLE IF EXISTS employee_leave_balances 
  RENAME TO leave_balances;
  EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  leave_type_id uuid REFERENCES leave_types NOT NULL,
  total_days integer NOT NULL DEFAULT 0,
  used_days integer NOT NULL DEFAULT 0,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, year)
);

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage leave balances" ON leave_balances;
DROP POLICY IF EXISTS "Employees can view their own leave balances" ON leave_balances;

-- Create policies
CREATE POLICY "Admins can manage leave balances"
  ON leave_balances
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Employees can view their own leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Update function to use new table name
CREATE OR REPLACE FUNCTION create_employee_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leave_balances (
    employee_id,
    leave_type_id,
    total_days,
    year
  )
  SELECT
    NEW.id,
    id,
    default_days,
    EXTRACT(YEAR FROM CURRENT_DATE)
  FROM leave_types;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;