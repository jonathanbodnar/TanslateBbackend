-- Verify and Fix Admin Role
-- Run this to check if your admin user has the correct role in metadata

-- Step 1: Check current role for your user
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'adminuser001@gmail.com';

-- Step 2: If role is missing or incorrect, fix it
-- Update raw_user_meta_data (this is what Supabase uses)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
),
updated_at = now()
WHERE email = 'adminuser001@gmail.com';

-- Step 3: Verify the fix
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE email = 'adminuser001@gmail.com';

-- Expected output:
-- role should be 'admin'
-- raw_user_meta_data should contain {"role": "admin", ...other fields...}

