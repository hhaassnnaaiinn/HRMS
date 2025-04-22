/*
  # Fix Leave Requests Table

  1. Changes
    - Add status column to leave_requests table
    - Add proper type and constraints
    - Update existing records
*/

-- Add status column to leave_requests if it doesn't exist
DO $$ BEGIN
  ALTER TABLE leave_requests
  ADD COLUMN status leave_status_enum NOT NULL DEFAULT 'pending';
  EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Make sure all existing records have a status
UPDATE leave_requests
SET status = 'pending'
WHERE status IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_status 
ON leave_requests(status);

-- Add constraint to ensure valid status values
ALTER TABLE leave_requests
ADD CONSTRAINT valid_leave_status 
CHECK (status IN ('pending', 'approved', 'rejected'));