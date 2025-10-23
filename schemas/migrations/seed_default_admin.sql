-- Seed Default Admin User
-- 
-- This migration creates a default admin user for development purposes.
-- 
-- IMPORTANT SECURITY NOTES:
-- 1. This creates a user with a TEMPORARY password that MUST be changed
-- 2. For PRODUCTION: Delete this user or change the password immediately
-- 3. For DEVELOPMENT: This provides a convenient default admin account
--
-- Default Credentials:
--   Email: superadmin001@gmail.com
--   Password: ChangeMe123!@#
--   Role: admin
--
-- ⚠️ CHANGE THE PASSWORD AFTER FIRST LOGIN ⚠️

-- Insert admin user into auth.users
-- Note: This uses Supabase's internal auth schema
-- The password will be hashed automatically by Supabase

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'superadmin001@gmail.com';

  -- Only create if doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
    -- Note: We're using a raw SQL approach here
    -- The password 'ChangeMe123!@#' will be hashed by Supabase
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- instance_id
      gen_random_uuid(), -- id
      'authenticated', -- aud
      'authenticated', -- role
      'superadmin001@gmail.com', -- email
      crypt('ChangeMe123!@#', gen_salt('bf')), -- encrypted_password (using bcrypt)
      now(), -- email_confirmed_at (auto-confirm)
      NULL, -- invited_at
      '', -- confirmation_token
      NULL, -- confirmation_sent_at
      '', -- recovery_token
      NULL, -- recovery_sent_at
      '', -- email_change_token_new
      '', -- email_change
      NULL, -- email_change_sent_at
      NULL, -- last_sign_in_at
      '{"provider":"email","providers":["email"]}', -- raw_app_meta_data
      '{"role":"admin"}', -- raw_user_meta_data (ADMIN ROLE SET HERE)
      false, -- is_super_admin
      now(), -- created_at
      now(), -- updated_at
      NULL, -- phone
      NULL, -- phone_confirmed_at
      '', -- phone_change
      '', -- phone_change_token
      NULL, -- phone_change_sent_at
      '', -- email_change_token_current
      0, -- email_change_confirm_status
      NULL, -- banned_until
      '', -- reauthentication_token
      NULL, -- reauthentication_sent_at
      false, -- is_sso_user
      NULL -- deleted_at
    )
    RETURNING id INTO admin_user_id;

    -- Also create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'superadmin001@gmail.com',
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Default admin user created: superadmin001@gmail.com';
    RAISE NOTICE 'Password: ChangeMe123!@#';
    RAISE NOTICE '⚠️  PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN ⚠️';
  ELSE
    RAISE NOTICE 'Admin user already exists: superadmin001@gmail.com';
  END IF;
END $$;

-- Verify the user was created with admin role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'superadmin001@gmail.com';

