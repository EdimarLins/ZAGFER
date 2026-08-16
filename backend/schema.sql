-- Create tables for ZAGFER

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  matricula TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Added for local auth
  active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'))
);

CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT,
  bmp TEXT,
  sector TEXT NOT NULL,
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'UNAVAILABLE'))
);

CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp BIGINT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('CHECKOUT', 'RETURN', 'RENEWAL')),
  dispatcher_id UUID REFERENCES users(id),
  dispatcher_name TEXT NOT NULL,
  dispatcher_matricula TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  responsible_matricula TEXT NOT NULL,
  tool_ids TEXT[] NOT NULL, -- Array of tool IDs
  tools_summary TEXT NOT NULL,
  expected_return_date BIGINT,
  received_by_name TEXT,
  observations TEXT
);
