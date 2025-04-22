/*
  # Add Shift Configuration Management

  1. Changes
    - Add shift configuration management table
    - Add policies for admin access
    - Add default shifts
*/

-- Create shift_configs table if not exists
CREATE TABLE IF NOT EXISTS shift_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 15,
  is_ramadan boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shift_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage shift configs"
  ON shift_configs
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Everyone can view shift configs"
  ON shift_configs FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_shift_configs_updated_at
      BEFORE UPDATE ON shift_configs
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert default shifts if not exists
INSERT INTO shift_configs (name, start_time, end_time, grace_minutes, is_ramadan)
SELECT 'Regular Shift', '09:00', '18:00', 15, false
WHERE NOT EXISTS (
  SELECT 1 FROM shift_configs WHERE name = 'Regular Shift' AND is_ramadan = false
);

INSERT INTO shift_configs (name, start_time, end_time, grace_minutes, is_ramadan)
SELECT 'Ramadan Shift', '09:00', '16:00', 15, true
WHERE NOT EXISTS (
  SELECT 1 FROM shift_configs WHERE name = 'Ramadan Shift' AND is_ramadan = true
);