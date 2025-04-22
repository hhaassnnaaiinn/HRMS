/*
  # HRMS Schema Enhancements

  1. New Features
    - Add ENUM types for leave_type and status
    - Add date validation constraints
    - Add INSERT policies for leave requests
    - Enhance RLS policies

  2. Changes
    - Add CHECK constraints for dates
    - Add leave type and status enums
    - Add employee leave request policies
*/

-- Create ENUM types
CREATE TYPE leave_type_enum AS ENUM ('annual', 'sick', 'personal', 'unpaid');
CREATE TYPE leave_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'half-day');

-- Add constraints to existing tables
ALTER TABLE leave_requests
  ADD CONSTRAINT valid_leave_dates CHECK (end_date >= start_date),
  ALTER COLUMN leave_type TYPE leave_type_enum USING leave_type::leave_type_enum,
  ALTER COLUMN status TYPE leave_status_enum USING status::leave_status_enum;

ALTER TABLE attendance
  ADD CONSTRAINT valid_attendance_times CHECK (check_out IS NULL OR check_out > check_in),
  ALTER COLUMN status TYPE attendance_status_enum USING status::attendance_status_enum;

-- Add INSERT policy for leave requests
CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Add more specific RLS policies
CREATE POLICY "Employees can only view their own employee record"
  ON employees FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);