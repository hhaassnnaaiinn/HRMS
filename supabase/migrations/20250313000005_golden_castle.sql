/*
  # Add remarks to attendance table

  1. Changes
    - Add remarks column to attendance table
    - Add remote and leave status options
*/

-- Add remarks column to attendance
ALTER TABLE attendance
ADD COLUMN remarks text;

-- Update attendance status enum
ALTER TYPE attendance_status_enum ADD VALUE IF NOT EXISTS 'remote';
ALTER TYPE attendance_status_enum ADD VALUE IF NOT EXISTS 'leave';
ALTER TYPE attendance_status_enum ADD VALUE IF NOT EXISTS 'late';