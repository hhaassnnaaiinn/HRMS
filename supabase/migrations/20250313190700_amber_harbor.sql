/*
  # Fix Leave Migration Order

  1. Changes
    - Create leave_balances table first
    - Update check_and_update_leave_balance function
    - Set default values for new employees
*/

-- Create leave_balances table
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
  USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Create initial leave balances for all employees
INSERT INTO leave_balances (employee_id, leave_type_id, total_days, year)
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

-- Create function to automatically create leave balances for new employees
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

-- Create trigger for new employee leave balances
DROP TRIGGER IF EXISTS create_employee_leave_balances_trigger ON employees;
CREATE TRIGGER create_employee_leave_balances_trigger
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_employee_leave_balances();

-- Create function to update leave balance when leave is approved
CREATE OR REPLACE FUNCTION check_and_update_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  leave_days integer;
  current_balance integer;
  leave_type_record RECORD;
BEGIN
  -- Only proceed if status is being changed to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Calculate working days
    leave_days := calculate_working_days(NEW.start_date::date, NEW.end_date::date);
    
    -- Get leave type details
    SELECT * INTO leave_type_record
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    -- Get current balance
    SELECT total_days - used_days INTO current_balance
    FROM leave_balances
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = EXTRACT(YEAR FROM NEW.start_date);

    -- Check if enough balance is available for paid leaves
    IF leave_type_record.is_paid AND current_balance < leave_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. Available: %, Required: %', current_balance, leave_days;
    END IF;

    -- Update the used days
    UPDATE leave_balances
    SET used_days = used_days + leave_days
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = EXTRACT(YEAR FROM NEW.start_date)
    AND (NOT leave_type_record.is_paid OR total_days - used_days >= leave_days);
    
    -- Check if update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update leave balance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;