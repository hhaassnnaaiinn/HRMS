/*
  # Drop leave_balances table

  1. Changes
    - Drop leave_balances table since data is now in employees table
    - Drop related triggers and functions
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS create_employee_leave_balances_trigger ON employees;
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;

-- Drop functions
DROP FUNCTION IF EXISTS create_employee_leave_balances();
DROP FUNCTION IF EXISTS update_leave_balance();

-- Drop table
DROP TABLE IF EXISTS leave_balances CASCADE;