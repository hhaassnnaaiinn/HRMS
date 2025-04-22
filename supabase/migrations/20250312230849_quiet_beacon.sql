/*
  # Fix Employee RLS Policies

  1. Changes
    - Remove recursive admin policy
    - Add separate policies for admin and employee access
    - Fix infinite recursion issue
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read employees" ON employees;
DROP POLICY IF EXISTS "Employees can only view their own employee record" ON employees;
DROP POLICY IF EXISTS "Admins can do all operations on employees" ON employees;

-- Create new policies for employees table
CREATE POLICY "Employees can read all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can update their own record"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Admins can update any employee"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'::user_role_enum
    )
  );