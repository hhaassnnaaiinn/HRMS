/*
  # Clean up and optimize schema

  1. Changes
    - Drop unused tables
    - Clean up unused columns
    - Add missing indexes
    - Update constraints
*/

-- Drop unused tables
DROP TABLE IF EXISTS leave_balances CASCADE;

-- Clean up leave_requests table
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_id_fkey,
DROP CONSTRAINT IF EXISTS fk_leave_type;

-- Add proper foreign key constraint
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_id_fkey
FOREIGN KEY (leave_type_id)
REFERENCES leave_types(id)
ON DELETE RESTRICT;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- Update RLS policies for leave management
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON leave_requests;
CREATE POLICY "Employees can view their own leave requests"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees can create their own leave requests" ON leave_requests;
CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all leave requests" ON leave_requests;
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

-- Update RLS policies for leave types
DROP POLICY IF EXISTS "Everyone can view leave types" ON leave_types;
CREATE POLICY "Everyone can view leave types"
  ON leave_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage leave types" ON leave_types;
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