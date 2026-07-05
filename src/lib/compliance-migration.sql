-- Migration: Add SACCO compliance fields to chamas table

-- Create compliance_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE compliance_type AS ENUM ('informal_chama', 'registered_group', 'sacco');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to chamas table
ALTER TABLE chamas 
ADD COLUMN IF NOT EXISTS compliance_type compliance_type DEFAULT 'informal_chama',
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS sasra_license_number TEXT,
ADD COLUMN IF NOT EXISTS sasra_license_expiry DATE,
ADD COLUMN IF NOT EXISTS auditor_name TEXT,
ADD COLUMN IF NOT EXISTS financial_year_start DATE,
ADD COLUMN IF NOT EXISTS financial_year_end DATE,
ADD COLUMN IF NOT EXISTS core_capital NUMERIC,
ADD COLUMN IF NOT EXISTS fosa_enabled BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN chamas.compliance_type IS 'The legal/regulatory status of the chama';
COMMENT ON COLUMN chamas.registration_number IS 'Official registration number for registered groups or SACCOs';
COMMENT ON COLUMN chamas.sasra_license_number IS 'SASRA license number for SACCOs';
COMMENT ON COLUMN chamas.sasra_license_expiry IS 'Expiry date of the SASRA license';
COMMENT ON COLUMN chamas.auditor_name IS 'Name of the appointed external auditor';
COMMENT ON COLUMN chamas.financial_year_start IS 'Start date of the financial year';
COMMENT ON COLUMN chamas.financial_year_end IS 'End date of the financial year';
COMMENT ON COLUMN chamas.core_capital IS 'Core capital of the SACCO in KES';
COMMENT ON COLUMN chamas.fosa_enabled IS 'Whether Front Office Service Activity is enabled';

-- Create board_members table if it doesn't exist (referenced in compliance page)
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL, -- Chairman, Treasurer, Secretary, Director, etc.
    status TEXT DEFAULT 'active', -- active, inactive
    appointed_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create annual_returns table if it doesn't exist (referenced in compliance page)
CREATE TABLE IF NOT EXISTS annual_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    filed_date DATE NOT NULL,
    status TEXT DEFAULT 'filed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
