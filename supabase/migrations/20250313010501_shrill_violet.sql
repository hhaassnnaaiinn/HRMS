/*
  # Add Probation Period Management

  1. Changes
    - Add probation_end_date to employees table
    - Add is_permanent to employees table
    - Add RLS policies for probation management
    - Add trigger to automatically update permanent status
*/

-- Add probation columns to employees
ALTER TABLE employees
ADD COLUMN probation_end_date date,
ADD COLUMN is_permanent boolean NOT NULL DEFAULT false;

-- Create function to check if employee is on probation
CREATE OR REPLACE FUNCTION is_employee_on_probation(employee_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE id = employee_id
    AND probation_end_date >= CURRENT_DATE
    AND NOT is_permanent
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically update permanent status
CREATE OR REPLACE FUNCTION update_permanent_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If probation end date is in the past, make employee permanent
  IF NEW.probation_end_date < CURRENT_DATE AND NOT NEW.is_permanent THEN
    NEW.is_permanent := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic permanent status update
CREATE TRIGGER employee_permanent_status_trigger
  BEFORE INSERT OR UPDATE OF probation_end_date ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_permanent_status();

-- Add policy to prevent leave requests during probation
CREATE POLICY "Prevent leave requests during probation"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT is_employee_on_probation(employee_id)
  );