/*
  # Fix shift toggle functionality

  1. Changes
    - Add policy for admins to update shift configs
    - Add function to ensure only one active shift per type
*/

-- Add update policy for admins
CREATE POLICY "Admins can update shift configs"
  ON shift_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

-- Create function to handle shift activation
CREATE OR REPLACE FUNCTION handle_shift_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate other shifts of the same type (Ramadan or regular)
    UPDATE shift_configs
    SET is_active = false
    WHERE is_ramadan = NEW.is_ramadan
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shift activation
CREATE TRIGGER shift_activation_trigger
  BEFORE UPDATE OF is_active ON shift_configs
  FOR EACH ROW
  EXECUTE FUNCTION handle_shift_activation();