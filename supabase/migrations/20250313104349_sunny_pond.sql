/*
  # Fix Schema Alignment

  1. Changes
    - Drop and recreate leave_requests table with proper schema
    - Add proper constraints and relationships
    - Migrate existing data
    - Set up correct indexes
*/

-- Recreate leave_requests table with proper schema
CREATE TABLE IF NOT EXISTS new_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status leave_status_enum NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
);

-- Copy data from old table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
    INSERT INTO new_leave_requests (
      id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      status,
      created_at,
      updated_at
    )
    SELECT 
      id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      COALESCE(status, 'pending'::leave_status_enum),
      created_at,
      updated_at
    FROM leave_requests;
  END IF;
END $$;

-- Drop old table and rename new one
DROP TABLE IF EXISTS leave_requests CASCADE;
ALTER TABLE new_leave_requests RENAME TO leave_requests;

-- Create indexes
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all leave requests"
  ON leave_requests
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate leave balance update trigger
CREATE OR REPLACE FUNCTION check_and_update_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  leave_days integer;
  current_balance integer;
  leave_type_record RECORD;
  balance_column text;
  used_column text;
BEGIN
  -- Only proceed if status is being changed to approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Calculate working days
    leave_days := calculate_working_days(NEW.start_date::date, NEW.end_date::date);
    
    -- Get leave type details
    SELECT * INTO leave_type_record
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    -- Determine which columns to update based on leave type
    SELECT 
      CASE 
        WHEN leave_type_record.name = 'Annual Leave' THEN 'annual_leave_balance'
        WHEN leave_type_record.name = 'Sick Leave' THEN 'sick_leave_balance'
        WHEN leave_type_record.name = 'Casual Leave' THEN 'casual_leave_balance'
        WHEN leave_type_record.name = 'Umrah Leave' THEN 'umrah_leave_balance'
        WHEN leave_type_record.name = 'Unpaid Leave' THEN 'unpaid_leave_balance'
      END,
      CASE 
        WHEN leave_type_record.name = 'Annual Leave' THEN 'annual_leave_used'
        WHEN leave_type_record.name = 'Sick Leave' THEN 'sick_leave_used'
        WHEN leave_type_record.name = 'Casual Leave' THEN 'casual_leave_used'
        WHEN leave_type_record.name = 'Umrah Leave' THEN 'umrah_leave_used'
        WHEN leave_type_record.name = 'Unpaid Leave' THEN 'unpaid_leave_used'
      END
    INTO balance_column, used_column;
    
    -- Get current balance
    EXECUTE format('
      SELECT %I - COALESCE(%I, 0) FROM employees WHERE id = $1',
      balance_column, used_column
    ) USING NEW.employee_id INTO current_balance;

    -- Check if enough balance is available for paid leaves
    IF leave_type_record.is_paid AND current_balance < leave_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. Available: %, Required: %', current_balance, leave_days;
    END IF;

    -- Update the used days
    EXECUTE format('
      UPDATE employees 
      SET %I = COALESCE(%I, 0) + $1
      WHERE id = $2
      AND (NOT $3 OR %I - COALESCE(%I, 0) >= $1)',
      used_column, used_column,
      balance_column, used_column
    ) USING leave_days, NEW.employee_id, leave_type_record.is_paid;
    
    -- Check if update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update leave balance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave balance updates
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;
CREATE TRIGGER update_leave_balance_trigger
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_leave_balance();