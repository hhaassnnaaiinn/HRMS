/*
  # Fix Attendance Management

  1. Changes
    - Add grace_minutes column to shift_configs if not exists
    - Add check_out_time column to attendance table
    - Add function to handle attendance check-out
*/

-- Add check_out_time to attendance if it doesn't exist
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_out_time timestamptz;

-- Create function to handle attendance check-out
CREATE OR REPLACE FUNCTION handle_attendance_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Update check_out time
  IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendance check-out
DROP TRIGGER IF EXISTS attendance_checkout_trigger ON attendance;
CREATE TRIGGER attendance_checkout_trigger
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION handle_attendance_checkout();