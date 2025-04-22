/*
  # Fix Leave Requests Migration

  1. Changes
    - Map existing leave_type values to leave_type_id
    - Update existing records
    - Add NOT NULL constraint
*/

-- First, update existing records to have proper leave_type_id
UPDATE leave_requests lr
SET leave_type_id = lt.id
FROM leave_types lt
WHERE lr.leave_type_id IS NULL
AND (
  CASE 
    WHEN lr.leave_type = 'annual' THEN lt.name = 'Annual Leave'
    WHEN lr.leave_type = 'sick' THEN lt.name = 'Sick Leave'
    WHEN lr.leave_type = 'personal' THEN lt.name = 'Personal Leave'
    WHEN lr.leave_type = 'unpaid' THEN lt.name = 'Unpaid Leave'
    ELSE false
  END
);

-- Now we can safely make the column required
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