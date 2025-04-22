/*
  # Move Leave Fields to Employees Table

  1. Changes
    - Add leave-related fields to employees table
    - Remove leave_balances table
    - Update triggers and functions
    - Migrate existing data
*/

-- Add leave-related fields to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS annual_leave_balance integer NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS sick_leave_balance integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS casual_leave_balance integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS umrah_leave_balance integer NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS unpaid_leave_balance integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_leave_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sick_leave_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS casual_leave_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS umrah_leave_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS unpaid_leave_used integer NOT NULL DEFAULT 0;

-- Create function to update leave balance when leave is approved
CREATE OR REPLACE FUNCTION update_employee_leave_balance()
RETURNS TRIGGER AS $$
DECLARE
  leave_days integer;
  balance_column text;
  used_column text;
BEGIN
  IF NEW.status = 'approved'::leave_status_enum THEN
    -- Calculate number of days
    leave_days := (NEW.end_date - NEW.start_date + 1);
    
    -- Determine which columns to update based on leave type
    SELECT 
      CASE 
        WHEN lt.name = 'Annual Leave' THEN 'annual_leave_used'
        WHEN lt.name = 'Sick Leave' THEN 'sick_leave_used'
        WHEN lt.name = 'Casual Leave' THEN 'casual_leave_used'
        WHEN lt.name = 'Umrah Leave' THEN 'umrah_leave_used'
        WHEN lt.name = 'Unpaid Leave' THEN 'unpaid_leave_used'
      END,
      CASE 
        WHEN lt.name = 'Annual Leave' THEN 'annual_leave_balance'
        WHEN lt.name = 'Sick Leave' THEN 'sick_leave_balance'
        WHEN lt.name = 'Casual Leave' THEN 'casual_leave_balance'
        WHEN lt.name = 'Umrah Leave' THEN 'umrah_leave_balance'
        WHEN lt.name = 'Unpaid Leave' THEN 'unpaid_leave_balance'
      END
    INTO used_column, balance_column
    FROM leave_types lt
    WHERE lt.id = NEW.leave_type_id;
    
    -- Update employee leave balance
    EXECUTE format('
      UPDATE employees 
      SET %I = %I + $1
      WHERE id = $2
      AND %I >= %I + $1',
      used_column, used_column,
      balance_column, used_column
    ) USING leave_days, NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;

-- Create new trigger for leave balance updates
CREATE TRIGGER update_employee_leave_balance_trigger
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending'::leave_status_enum AND NEW.status = 'approved'::leave_status_enum)
  EXECUTE FUNCTION update_employee_leave_balance();

-- Migrate existing leave balances to employee table
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT 
      lb.employee_id,
      lt.name as leave_type,
      lb.total_days,
      lb.used_days
    FROM leave_balances lb
    JOIN leave_types lt ON lt.id = lb.leave_type_id
  ) LOOP
    CASE r.leave_type
      WHEN 'Annual Leave' THEN
        UPDATE employees 
        SET annual_leave_balance = r.total_days,
            annual_leave_used = r.used_days
        WHERE id = r.employee_id;
      WHEN 'Sick Leave' THEN
        UPDATE employees 
        SET sick_leave_balance = r.total_days,
            sick_leave_used = r.used_days
        WHERE id = r.employee_id;
      WHEN 'Casual Leave' THEN
        UPDATE employees 
        SET casual_leave_balance = r.total_days,
            casual_leave_used = r.used_days
        WHERE id = r.employee_id;
      WHEN 'Umrah Leave' THEN
        UPDATE employees 
        SET umrah_leave_balance = r.total_days,
            umrah_leave_used = r.used_days
        WHERE id = r.employee_id;
      WHEN 'Unpaid Leave' THEN
        UPDATE employees 
        SET unpaid_leave_balance = r.total_days,
            unpaid_leave_used = r.used_days
        WHERE id = r.employee_id;
    END CASE;
  END LOOP;
END $$;