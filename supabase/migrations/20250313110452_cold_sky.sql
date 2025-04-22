/*
  # Fix Leave Requests Table

  1. Changes
    - Add status column to leave_requests table
    - Add proper enum type and constraints
    - Update existing records
*/

-- Create leave status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE leave_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column to leave_requests
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS status leave_status_enum NOT NULL DEFAULT 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_status 
ON leave_requests(status);

-- Add constraint to ensure valid status values
ALTER TABLE leave_requests
ADD CONSTRAINT valid_leave_status 
CHECK (status IN ('pending', 'approved', 'rejected'));