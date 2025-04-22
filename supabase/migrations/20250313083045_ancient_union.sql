/*
  # Fix Leave Balances Migration

  1. Changes
    - Drop old table if exists
    - Create new table with proper schema
    - Migrate data if needed
    - Set up policies
*/

-- Drop old table if exists
DROP TABLE IF EXISTS employee_leave_balances CASCADE;

-- Create leave_balances table if it doesn't exist
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

-- Create initial leave balances for existing employees
INSERT INTO leave_balances (
  employee_id,
  leave_type_id,
  total_days,
  year
)
SELECT 
  e.id as employee_id,
  lt.id as leave_type_id,
  lt.default_days as total_days,
  EXTRACT(YEAR FROM CURRENT_DATE) as year
FROM employees e
CROSS JOIN leave_types lt
WHERE NOT EXISTS (
  SELECT 1 FROM leave_balances lb
  WHERE lb.employee_id = e.id
  AND lb.leave_type_id = lt.id
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);