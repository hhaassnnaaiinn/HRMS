/*
  # Fix Leave Balance Deduction

  1. Changes
    - Update check_and_update_leave_balance function to properly handle leave deductions
    - Add trigger to update leave balances when leave is approved
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;

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
    SELECT total_days - COALESCE(used_days, 0) INTO current_balance
    FROM leave_balances
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = EXTRACT(YEAR FROM NEW.start_date);

    -- Check if enough balance is available for paid leaves
    IF leave_type_record.is_paid AND (current_balance IS NULL OR current_balance < leave_days) THEN
      RAISE EXCEPTION 'Insufficient leave balance. Available: %, Required: %', COALESCE(current_balance, 0), leave_days;
    END IF;

    -- Update the used days
    UPDATE leave_balances
    SET used_days = COALESCE(used_days, 0) + leave_days
    WHERE employee_id = NEW.employee_id
    AND leave_type_id = NEW.leave_type_id
    AND year = EXTRACT(YEAR FROM NEW.start_date)
    AND (NOT leave_type_record.is_paid OR total_days - COALESCE(used_days, 0) >= leave_days);
    
    -- Check if update was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update leave balance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leave balance updates
CREATE TRIGGER update_leave_balance_trigger
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_and_update_leave_balance();