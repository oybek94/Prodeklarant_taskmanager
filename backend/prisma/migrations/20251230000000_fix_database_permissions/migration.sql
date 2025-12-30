-- Migration: Fix database permissions for app user
-- This fixes PostgreSQL error 42501: permission denied for table "User"
-- 
-- Root cause: The database user 'app' was created but didn't receive proper
-- permissions on tables, sequences, and schema. This migration grants all
-- necessary permissions for Prisma ORM to function correctly.
--
-- Why this happened:
-- - Database was created via Docker or manual setup
-- - User 'app' was created but permissions weren't granted
-- - Prisma migrations create tables but don't grant permissions to non-owner users
--
-- Solution:
-- - Grant SELECT, INSERT, UPDATE, DELETE on all existing tables
-- - Grant USAGE and SELECT on sequences (for auto-increment IDs)
-- - Set default privileges for future tables/sequences

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
END $$;

