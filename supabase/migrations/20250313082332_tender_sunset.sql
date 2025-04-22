/*
  # Enhanced Leave Management

  1. New Tables
    - leave_types
      - Different types of leaves (Annual, Sick, Umrah, etc.)
    - employee_leave_balances
      - Track individual employee leave balances
      - Separate balances for each leave type
    
  2. Changes
    - Add leave type reference to leave_requests
    - Add policies for leave management
*/

-- Create leave_types table
CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_paid boolean NOT NULL DEFAULT true,
  default_days integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_leave_balances table
CREATE TABLE employee_leave_balances (
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

-- Add leave_type_id to leave_requests
ALTER TABLE leave_requests
ADD COLUMN leave_type_id uuid REFERENCES leave_types;

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage leave types"
  ON leave_types
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Everyone can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage leave balances"
  ON employee_leave_balances
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Employees can view their own leave balances"
  ON employee_leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Insert default leave types
INSERT INTO leave_types (name, description, is_paid, default_days) VALUES
  ('Annual Leave', 'Regular annual paid leave', true, 20),
  ('Sick Leave', 'Medical and health related leave', true, 10),
  ('Casual Leave', 'Short-term personal leave', true, 5),
  ('Umrah Leave', 'Leave for performing Umrah', true, 15),
  ('Unpaid Leave', 'Leave without pay', false, 0);

-- Create function to automatically create leave balances for new employees
CREATE OR REPLACE FUNCTION create_employee_leave_balances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO employee_leave_balances (
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

-- Create trigger to create leave balances for new employees
CREATE TRIGGER create_employee_leave_balances_trigger
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_employee_leave_balances();

-- Create function to update used days when leave is approved
CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  leave_days integer;
BEGIN
  IF NEW.status = 'approved'::leave_status_enum THEN
    -- Calculate number of days
    leave_days := (NEW.end_date - NEW.start_date + 1);
    
    -- Update leave balance
    UPDATE employee_leave_balances
    SET used_days = used_days + leave_days
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update leave balance on leave approval
CREATE TRIGGER update_leave_balance_trigger
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending'::leave_status_enum AND NEW.status = 'approved'::leave_status_enum)
  EXECUTE FUNCTION update_leave_balance();