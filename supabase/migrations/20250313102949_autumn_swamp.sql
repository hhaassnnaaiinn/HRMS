/*
  # Fix Working Days Calculation Function

  1. Changes
    - Fix syntax error in calculate_working_days function
    - Use proper variable naming to avoid conflicts
*/

-- Create function to calculate working days between two dates
CREATE OR REPLACE FUNCTION calculate_working_days(start_date date, end_date date)
RETURNS integer AS $$
DECLARE
  days integer := 0;
  curr_date date := start_date;
BEGIN
  WHILE curr_date <= end_date LOOP
    -- Only count weekdays (1 = Monday through 5 = Friday)
    IF EXTRACT(DOW FROM curr_date) BETWEEN 1 AND 5 THEN
      days := days + 1;
    END IF;
    curr_date := curr_date + 1;
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
      SELECT %I - %I FROM employees WHERE id = $1',
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;

-- Create new trigger
CREATE TRIGGER update_leave_balance_trigger
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_leave_balance();