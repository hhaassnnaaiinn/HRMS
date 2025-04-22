/*
  # Fix Leave Management Schema

  1. Changes
    - Drop leave_type column from leave_requests
    - Make leave_type_id required
    - Fix relationships between tables
    - Update triggers and functions
*/

-- Drop the leave_type column from leave_requests
ALTER TABLE leave_requests 
DROP COLUMN IF EXISTS leave_type CASCADE;

-- Make sure leave_type_id is required and properly referenced
ALTER TABLE leave_requests
ALTER COLUMN leave_type_id SET NOT NULL,
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_id_fkey,
ADD CONSTRAINT leave_requests_leave_type_id_fkey 
  FOREIGN KEY (leave_type_id) 
  REFERENCES leave_types(id) 
  ON DELETE RESTRICT;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id 
ON leave_requests(leave_type_id);

-- Update leave request policies
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

-- Add leave type policies if they don't exist
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