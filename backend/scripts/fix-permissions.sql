-- Fix Database Permissions Script
-- 
-- Purpose: Grant necessary PostgreSQL permissions to the 'app' user
-- This fixes error 42501: permission denied for table "User"
--
-- Root Cause:
-- When database is created via Docker or manual setup, the 'app' user
-- may not receive proper permissions on tables and sequences. Prisma
-- migrations create tables but don't grant permissions to non-owner users.
--
-- Solution:
-- This script grants all necessary permissions:
-- 1. Schema usage permissions
-- 2. Table CRUD permissions (SELECT, INSERT, UPDATE, DELETE)
-- 3. Sequence permissions (for auto-increment IDs)
-- 4. Default privileges for future tables/sequences
--
-- Usage:
--   psql -U postgres -d prodeklarant -f fix-permissions.sql
--   OR via pgAdmin: Tools -> Query Tool -> Execute

-- Grant permissions on schema
GRANT USAGE ON SCHEMA public TO app;
GRANT USAGE ON SCHEMA public TO postgres;

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;

-- Grant permissions on all sequences (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set default privileges for future tables and sequences
-- This ensures new tables created by Prisma migrations will have proper permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app;

-- Explicitly grant permissions on critical tables (in case they exist)
-- Note: These will fail silently if tables don't exist, which is fine
DO $$
BEGIN
    -- User table (most critical for authentication)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "User" TO postgres;
    END IF;
    
    -- Other critical tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Task') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Task" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'TaskStage') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TaskStage" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'TaskDocument') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TaskDocument" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Client') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Client" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Branch') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Branch" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Worker') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Worker" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Invoice') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Invoice" TO app;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Contract') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Contract" TO app;
    END IF;
END $$;

-- Verify permissions were granted
SELECT 
    table_name, 
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'User' 
AND grantee IN ('app', 'postgres')
ORDER BY grantee, privilege_type;

