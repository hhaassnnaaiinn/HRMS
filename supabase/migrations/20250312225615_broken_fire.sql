/*
  # Fix ENUM Types Migration

  1. Changes
    - Remove default value before type conversion
    - Re-add default value after type conversion
    - Update existing data to ensure compatibility
*/

-- First, remove the default constraint
ALTER TABLE leave_requests 
  ALTER COLUMN status DROP DEFAULT;

-- Create ENUM types if they don't exist
DO $$ BEGIN
  CREATE TYPE leave_type_enum AS ENUM ('annual', 'sick', 'personal', 'unpaid');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status_enum AS ENUM ('pending', 'approved', 'rejected');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'half-day');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update existing data to ensure it matches the enum values
UPDATE leave_requests 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'approved', 'rejected');

UPDATE leave_requests 
SET leave_type = 'annual' 
WHERE leave_type NOT IN ('annual', 'sick', 'personal', 'unpaid');

UPDATE attendance 
SET status = 'present' 
WHERE status NOT IN ('present', 'absent', 'half-day');

-- Alter the columns to use the new types
ALTER TABLE leave_requests
  ALTER COLUMN leave_type TYPE leave_type_enum USING leave_type::leave_type_enum,
  ALTER COLUMN status TYPE leave_status_enum USING status::leave_status_enum;

ALTER TABLE attendance
  ALTER COLUMN status TYPE attendance_status_enum USING status::attendance_status_enum;

-- Add back the default value with the correct type
ALTER TABLE leave_requests 
  ALTER COLUMN status SET DEFAULT 'pending'::leave_status_enum;

-- Add constraints
ALTER TABLE leave_requests
  ADD CONSTRAINT valid_leave_dates CHECK (end_date >= start_date);

ALTER TABLE attendance
  ADD CONSTRAINT valid_attendance_times CHECK (check_out IS NULL OR check_out > check_in);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
  ON attendance(employee_id, date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates 
  ON leave_requests(employee_id, start_date, end_date);

-- Add INSERT policy if it doesn't exist
DO $$ BEGIN
  CREATE POLICY "Employees can create their own leave requests"
    ON leave_requests FOR INSERT
    TO authenticated
    WITH CHECK (employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    ));
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add employee record policy if it doesn't exist
DO $$ BEGIN
  CREATE POLICY "Employees can only view their own employee record"
    ON employees FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;