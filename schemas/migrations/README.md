# Database Migrations

## Admin Panel Setup

Run these migrations in order:

### 1. Create Admin Config Table
```sql
-- File: add_admin_config.sql
-- Creates: admin_configs table with default configuration
-- Purpose: Stores application configuration (tunables)
```

### 2. Seed Default Admin User
```sql
-- File: seed_default_admin.sql
-- Creates: Default admin user (superadmin001@gmail.com)
-- Purpose: Provides immediate admin access for development
```

---

## Default Admin Credentials

**Email**: `superadmin001@gmail.com`  
**Password**: `ChangeMe123!@#`  
**Role**: `admin`

⚠️ **Change this password in production!**

---

## Helpers

### Promote User to Admin
```sql
-- File: helpers/promote_user_to_admin.sql
-- Purpose: Manually promote any existing user to admin role
```

---

## Quick Start

1. Open Supabase SQL Editor
2. Run `add_admin_config.sql`
3. Run `seed_default_admin.sql`
4. Login with default credentials
5. Navigate to `/admin`

Done! 🎉

---

## Documentation

- **Setup Guide**: `../../ADMIN_USER_SETUP_GUIDE.md`
- **Quick Start**: `../../ADMIN_QUICK_START.md`
- **Credentials**: `../../DEFAULT_ADMIN_CREDENTIALS.md`

