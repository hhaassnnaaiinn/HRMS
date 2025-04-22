/*
  # Fix Leave Request Relationships

  1. Changes
    - Drop duplicate foreign key constraints
    - Recreate single foreign key constraint
    - Update select queries to use correct relationship
*/

-- Drop existing foreign key constraints
ALTER TABLE leave_requests
DROP CONSTRAINT IF EXISTS fk_leave_type,
DROP CONSTRAINT IF EXISTS leave_requests_leave_type_id_fkey;

-- Add single foreign key constraint
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_leave_type_id_fkey
FOREIGN KEY (leave_type_id)
REFERENCES leave_types(id);

-- Add index for better performance
DROP INDEX IF EXISTS idx_leave_requests_leave_type_id;
CREATE INDEX idx_leave_requests_leave_type_id 
ON leave_requests(leave_type_id);