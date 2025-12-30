# Database Permissions Documentation

## Overview

This document explains the PostgreSQL database permissions setup required for the Prodeklarant application, particularly regarding Prisma ORM usage.

## Previous Error

**Error Code:** `42501`  
**Error Message:** `ОШИБКА: нет доступа к таблице User`  
**Translation:** "ERROR: permission denied for table User"

## Root Cause

The application database user (`app`) did not have the necessary permissions to access tables created by Prisma. This occurred because:

1. Prisma creates tables with quoted identifiers (e.g., `"User"` instead of `user`)
2. PostgreSQL requires explicit GRANT permissions for each table
3. Default privileges were not set for future tables

## Why Prisma Uses Quoted Table Names

Prisma uses quoted identifiers (`"User"`) to preserve case sensitivity. In PostgreSQL:

- Unquoted identifiers are automatically lowercased: `User` becomes `user`
- Quoted identifiers preserve exact case: `"User"` stays `"User"`

This allows Prisma to maintain consistency between the Prisma schema and the database schema, especially when working with TypeScript/JavaScript naming conventions (PascalCase for models).

## Solution

### SQL Commands to Grant Permissions

Run these commands as a PostgreSQL superuser (typically `postgres`):

```sql
-- Grant permissions to the 'app' user on the "User" table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO app;

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO app;

-- Grant all privileges on existing tables in the public schema to 'app'
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app;

-- Grant all privileges on existing sequences in the public schema to 'app'
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app;

-- Alter default privileges for future tables and sequences in the public schema to 'app'
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app;
```

### For Production (Optional)

If you also need the `postgres` user to have access (e.g., for pgAdmin):

```sql
-- Also grant to 'postgres' user for broader access if needed
GRANT ALL PRIVILEGES ON TABLE "User" TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
```

## Applying the Fix

### Option 1: Using psql Command Line

```bash
psql -U postgres -d your_database_name -f fix-permissions.sql
```

### Option 2: Using pgAdmin

1. Connect to your database in pgAdmin
2. Open Query Tool
3. Paste the SQL commands above
4. Execute

### Option 3: Using Docker (Local Development)

If using Docker Compose for local development:

```bash
docker exec -i postgres_container psql -U postgres -d your_database < fix-permissions.sql
```

## Verification

After applying permissions, verify with:

```sql
-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'User' AND grantee = 'app';

-- Check default privileges
SELECT defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl
FROM pg_default_acl
WHERE defaclrole = 'app'::regrole;
```

## Important Notes

1. **Quoted Identifiers:** Always use quoted identifiers (`"User"`) when referencing Prisma-created tables in SQL
2. **Default Privileges:** `ALTER DEFAULT PRIVILEGES` ensures future tables created by Prisma migrations automatically have correct permissions
3. **Schema:** The `public` schema is the default schema in PostgreSQL. If using a different schema, adjust the commands accordingly
4. **Security:** Only grant necessary permissions. The `app` user should not have superuser privileges

## Related Files

- `backend/prisma/schema.prisma` - Prisma schema definition
- `backend/scripts/fix-permissions.sql` - Standalone SQL script (if exists)
- `backend/src/prisma.ts` - Prisma client initialization

## Migration History

This fix was applied to resolve authentication and database access issues encountered during development. The error occurred when Prisma ORM tried to query the `User` table but the database user lacked necessary permissions.

