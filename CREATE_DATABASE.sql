-- Database yaratish
CREATE DATABASE prodeklarant;

-- User yaratish
CREATE USER app WITH PASSWORD 'app';

-- Huquqlar berish
GRANT ALL PRIVILEGES ON DATABASE prodeklarant TO app;

-- Database'ga ulanish
\c prodeklarant

-- Schema'ga huquqlar
GRANT ALL ON SCHEMA public TO app;

