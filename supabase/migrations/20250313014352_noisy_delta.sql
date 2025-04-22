/*
  # Fix Attendance Shift Configuration

  1. Changes
    - Add shift_id to attendance table
    - Add foreign key constraint
    - Update existing records
*/

-- Add shift_id to attendance
ALTER TABLE attendance
ADD COLUMN shift_id uuid REFERENCES shift_configs(id);

-- Create index for better performance
CREATE INDEX idx_attendance_shift ON attendance(shift_id);

-- Update existing records to use default shift
UPDATE attendance a
SET shift_id = (
  SELECT id FROM shift_configs
  WHERE is_active = true AND is_ramadan = false
  LIMIT 1
)
WHERE shift_id IS NULL;