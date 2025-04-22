/*
  # Fix Attendance Status Logic

  1. Changes
    - Add function to determine attendance status based on time
    - Update attendance status handling
    - Add constraints for check-in/check-out times
*/

-- Create function to determine attendance status
CREATE OR REPLACE FUNCTION determine_attendance_status(
  check_in_time timestamptz,
  check_out_time timestamptz,
  shift_start time,
  shift_end time,
  grace_minutes integer
) RETURNS text AS $$
DECLARE
  check_in_minutes integer;
  check_out_minutes integer;
  shift_start_minutes integer;
  shift_end_minutes integer;
  work_duration_minutes integer;
  expected_duration_minutes integer;
BEGIN
  -- Convert times to minutes for easier comparison
  shift_start_minutes := EXTRACT(HOUR FROM shift_start) * 60 + EXTRACT(MINUTE FROM shift_start);
  shift_end_minutes := EXTRACT(HOUR FROM shift_end) * 60 + EXTRACT(MINUTE FROM shift_end);
  check_in_minutes := EXTRACT(HOUR FROM check_in_time::time) * 60 + EXTRACT(MINUTE FROM check_in_time::time);
  
  -- Calculate expected work duration
  expected_duration_minutes := shift_end_minutes - shift_start_minutes;
  IF expected_duration_minutes < 0 THEN
    expected_duration_minutes := expected_duration_minutes + (24 * 60);
  END IF;

  -- Check if employee is late
  IF check_in_minutes > (shift_start_minutes + grace_minutes) THEN
    -- If employee comes after 12:00 PM, mark as half-day
    IF check_in_minutes >= (12 * 60) THEN
      RETURN 'half-day';
    ELSE
      RETURN 'late';
    END IF;
  END IF;

  -- If check-out time exists, check for early departure
  IF check_out_time IS NOT NULL THEN
    check_out_minutes := EXTRACT(HOUR FROM check_out_time::time) * 60 + EXTRACT(MINUTE FROM check_out_time::time);
    work_duration_minutes := check_out_minutes - check_in_minutes;
    
    IF work_duration_minutes < 0 THEN
      work_duration_minutes := work_duration_minutes + (24 * 60);
    END IF;

    -- If working less than 4 hours before expected end time, mark as half-day
    IF (expected_duration_minutes - work_duration_minutes) >= (4 * 60) THEN
      RETURN 'half-day';
    END IF;
  END IF;

  RETURN 'present';
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update status based on time
CREATE OR REPLACE FUNCTION update_attendance_status()
RETURNS TRIGGER AS $$
DECLARE
  shift_record RECORD;
BEGIN
  -- Only update status for present/late attendance
  IF NEW.status NOT IN ('remote', 'wfh', 'absent', 'leave') THEN
    -- Get shift configuration
    SELECT * INTO shift_record
    FROM shift_configs
    WHERE id = NEW.shift_id;

    IF FOUND THEN
      NEW.status := determine_attendance_status(
        NEW.check_in,
        NEW.check_out,
        shift_record.start_time::time,
        shift_record.end_time::time,
        shift_record.grace_minutes
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendance status updates
DROP TRIGGER IF EXISTS update_attendance_status_trigger ON attendance;
CREATE TRIGGER update_attendance_status_trigger
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_status();