/*
  # Add is_active column to employees

  1. Changes
    - Add is_active column to employees table with default true
    - Update existing employees to have is_active = true
*/

-- Add is_active column to employees
ALTER TABLE employees
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Update existing employees to have is_active = true
UPDATE employees SET is_active = true WHERE is_active IS NULL;

-- Create index for better performance
CREATE INDEX idx_employees_is_active ON employees(is_active);