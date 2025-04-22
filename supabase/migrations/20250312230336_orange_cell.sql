/*
  # Admin Features Migration

  1. New Tables
    - roles
      - Role definitions (admin, employee)
    - leave_balances
      - Track employee leave allocations
    - leave_types
      - Configurable leave types
    
  2. Changes
    - Add role to employees table
    - Add policies for admin access
*/

-- Create roles enum
CREATE TYPE user_role_enum AS ENUM ('admin', 'employee');

-- Add role to employees
ALTER TABLE employees
ADD COLUMN role user_role_enum NOT NULL DEFAULT 'employee';

-- Create leave_types table
CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  default_days integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create leave_balances table
CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees NOT NULL,
  leave_type_id uuid REFERENCES leave_types NOT NULL,
  total_days integer NOT NULL,
  used_days integer NOT NULL DEFAULT 0,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, year)
);

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Admin Policies
CREATE POLICY "Admins can do all operations on employees"
  ON employees
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage leave types"
  ON leave_types
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage leave balances"
  ON leave_balances
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage attendance"
  ON attendance
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage leave requests"
  ON leave_requests
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

-- Employee Policies for leave balances
CREATE POLICY "Employees can view their leave balances"
  ON leave_balances
  FOR SELECT
  TO authenticated
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Insert default leave types
INSERT INTO leave_types (name, description, default_days) VALUES
  ('Annual', 'Regular annual leave', 20),
  ('Sick', 'Medical and health related leave', 10),
  ('Personal', 'Personal or family matters', 5),
  ('Unpaid', 'Leave without pay', 0);

-- Add trigger for leave balance creation
CREATE OR REPLACE FUNCTION create_leave_balances_for_new_employee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leave_balances (employee_id, leave_type_id, total_days, year)
  SELECT 
    NEW.id,
    lt.id,
    lt.default_days,
    EXTRACT(YEAR FROM CURRENT_DATE)
  FROM leave_types lt;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_employee_leave_balances
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_leave_balances_for_new_employee();