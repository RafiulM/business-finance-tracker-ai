-- Initialize database for Finance Tracker
-- This script runs automatically when the PostgreSQL container starts

-- Create the main database if it doesn't exist
CREATE DATABASE IF NOT EXISTS finance_tracker;

-- Connect to the finance_tracker database
\c finance_tracker;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user for the application (optional, if you want a dedicated user)
-- CREATE USER finance_tracker_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE finance_tracker TO finance_tracker_user;

-- Set up timezone
SET timezone = 'UTC';

-- Create schema and basic indexes will be handled by Drizzle migrations
-- This is just the basic setup to ensure the database is ready