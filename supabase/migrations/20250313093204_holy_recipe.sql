/*
  # Fix Leave Balance Deduction

  1. Changes
    - Add trigger to update leave balances when leave is approved
    - Add function to calculate working days
    - Add validation to prevent approving leaves without sufficient balance
*/

-- Create function to calculate working days between two dates
CREATE OR REPLACE FUNCTION calculate_working_days(start_date date, end_date date)
RETURNS integer AS $$
DECLARE
  days integer := 0;
  current_date date := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    -- Only count weekdays (Monday = 1, Sunday = 7)
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      days := days + 1;
    END IF;
    current_date := current_date + 1;
  END LOOP;
  RETURN days;
END;
$$ LANGUAGE plpgsql;

-- Create function to check and update leave balance
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
    leave_days := calculate_working_days(NEW.start_date, NEW.end_date);
    
    -- Get leave type details
    SELECT * INTO leave_type_record
    FROM leave_types
    WHERE id = NEW.leave_type_id;
    
    -- Get current balance based on leave type
    SELECT 
      CASE 
        WHEN leave_type_record.name = 'Annual Leave' THEN annual_leave_balance - annual_leave_used
        WHEN leave_type_record.name = 'Sick Leave' THEN sick_leave_balance - sick_leave_used
        WHEN leave_type_record.name = 'Casual Leave' THEN casual_leave_balance - casual_leave_used
        WHEN leave_type_record.name = 'Umrah Leave' THEN umrah_leave_balance - umrah_leave_used
        WHEN leave_type_record.name = 'Unpaid Leave' THEN unpaid_leave_balance - unpaid_leave_used
        ELSE 0
      END INTO current_balance
    FROM employees
    WHERE id = NEW.employee_id;

    -- Check if enough balance is available
    IF leave_type_record.is_paid AND current_balance < leave_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. Available: %, Required: %', current_balance, leave_days;
    END IF;

    -- Update the appropriate balance column
    EXECUTE format('
      UPDATE employees 
      SET %I = %I + $1
      WHERE id = $2',
      CASE 
        WHEN leave_type_record.name = 'Annual Leave' THEN 'annual_leave_used'
        WHEN leave_type_record.name = 'Sick Leave' THEN 'sick_leave_used'
        WHEN leave_type_record.name = 'Casual Leave' THEN 'casual_leave_used'
        WHEN leave_type_record.name = 'Umrah Leave' THEN 'umrah_leave_used'
        WHEN leave_type_record.name = 'Unpaid Leave' THEN 'unpaid_leave_used'
      END,
      CASE 
        WHEN leave_type_record.name = 'Annual Leave' THEN 'annual_leave_used'
        WHEN leave_type_record.name = 'Sick Leave' THEN 'sick_leave_used'
        WHEN leave_type_record.name = 'Casual Leave' THEN 'casual_leave_used'
        WHEN leave_type_record.name = 'Umrah Leave' THEN 'umrah_leave_used'
        WHEN leave_type_record.name = 'Unpaid Leave' THEN 'unpaid_leave_used'
      END
    ) USING leave_days, NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;

-- Create new trigger
CREATE TRIGGER update_leave_balance_trigger
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_leave_balance();