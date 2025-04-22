/*
  # Fix Attendance Time Validation

  1. Changes
    - Update valid_attendance_times constraint
    - Add check for check-in/check-out only on present status
*/

-- Drop existing constraint if it exists
ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS valid_attendance_times;

-- Add new constraint that only checks times for present status
ALTER TABLE attendance
ADD CONSTRAINT valid_attendance_times 
CHECK (
  (status = 'present' OR status = 'late') AND (
    (check_in IS NOT NULL AND check_out IS NULL) OR 
    (check_in IS NOT NULL AND check_out IS NOT NULL AND check_out > check_in)
  ) OR 
  (status IN ('absent', 'half-day', 'remote', 'leave', 'wfh') AND check_in IS NULL AND check_out IS NULL)
);