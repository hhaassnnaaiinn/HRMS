/*
  # Add Leave Management Tables

  1. New Tables
    - employee_leave_balances
      - Track employee leave allocations
      - Link to leave types and employees
      - Track yearly balances
    
  2. Changes
    - Add leave_type_id to leave_requests
    - Add triggers for automatic balance updates
    - Add RLS policies
*/

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

-- Add leave_type_id to leave_requests if it doesn't exist
DO $$ BEGIN
  ALTER TABLE leave_requests
  ADD COLUMN leave_type_id uuid REFERENCES leave_types;
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE employee_leave_balances ENABLE ROW LEVEL SECURITY;

-- Create policies
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
DO $$ BEGIN
  CREATE TRIGGER create_employee_leave_balances_trigger
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION create_employee_leave_balances();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
DO $$ BEGIN
  CREATE TRIGGER update_leave_balance_trigger
    AFTER UPDATE ON leave_requests
    FOR EACH ROW
    WHEN (OLD.status = 'pending'::leave_status_enum AND NEW.status = 'approved'::leave_status_enum)
    EXECUTE FUNCTION update_leave_balance();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create initial leave balances for existing employees
INSERT INTO employee_leave_balances (
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
  SELECT 1 FROM employee_leave_balances elb
  WHERE elb.employee_id = e.id
  AND elb.leave_type_id = lt.id
  AND elb.year = EXTRACT(YEAR FROM CURRENT_DATE)
);