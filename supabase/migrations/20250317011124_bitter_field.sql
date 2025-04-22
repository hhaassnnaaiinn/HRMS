/*
  # Fix Avatar Storage and RLS Policies

  1. Changes
    - Drop all existing storage policies to avoid conflicts
    - Create proper storage bucket with correct settings
    - Add comprehensive storage policies for avatar management
    - Add RLS policies for avatar_url column
    - Fix policy syntax and permissions
*/

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar_url" ON employees;

-- Create storage policy to allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Create storage policy to allow users to update their avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Create storage policy to allow users to delete their avatars
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Create storage policy to allow public access to avatars
CREATE POLICY "Allow public access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Add RLS policy for avatar_url updates
CREATE POLICY "Users can update their own avatar_url"
ON employees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure avatar_url column exists
DO $$ BEGIN
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;