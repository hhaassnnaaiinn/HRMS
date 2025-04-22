/*
  # Fix Leave Request Schema

  1. Changes
    - Drop leave_type column from leave_requests
    - Add leave_type_id reference to leave_types table
    - Update existing records
*/

-- Drop leave_type column from leave_requests
ALTER TABLE leave_requests 
DROP COLUMN IF EXISTS leave_type CASCADE;

-- Make sure leave_type_id is required
ALTER TABLE leave_requests
ALTER COLUMN leave_type_id SET NOT NULL;

-- Add constraint to ensure leave_type_id exists
ALTER TABLE leave_requests
ADD CONSTRAINT fk_leave_type
FOREIGN KEY (leave_type_id)
REFERENCES leave_types(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id 
ON leave_requests(leave_type_id);