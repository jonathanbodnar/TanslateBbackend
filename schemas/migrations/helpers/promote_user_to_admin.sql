-- Helper Script: Promote User to Admin
-- 
-- This script promotes an existing user to admin role by updating their metadata.
-- Run this manually in your Supabase SQL Editor after creating a user account.
--
-- USAGE:
--   1. Create a user account through Supabase Auth (email/password or OAuth)
--   2. Find the user's UUID from the auth.users table
--   3. Replace 'YOUR_USER_EMAIL_HERE' below with the actual email
--   4. Run this script in Supabase SQL Editor
--
-- SECURITY NOTE:
--   Only run this for trusted users. Admin role grants full access to:
--   - View admin dashboard
--   - Edit application configuration
--   - All admin-protected routes

-- Option 1: Promote user by email
update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
where email = 'adminuser001@gmail.com';

-- Option 2: Promote user by UUID (if you know the user ID)
-- Uncomment and use this if you prefer to use UUID instead of email
-- 
-- update auth.users
-- set raw_user_meta_data = jsonb_set(
--   coalesce(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"admin"'::jsonb
-- )
-- where id = 'YOUR_USER_UUID_HERE'::uuid;

-- Verify the update
select 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at
from auth.users
where raw_user_meta_data->>'role' = 'admin';

