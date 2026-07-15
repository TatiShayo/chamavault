-- Supabase Schema for ChamaVault
-- Defines the database schema for chamas, members, contributions, fines, loans, repayments, expenses, meetings, attendance, votes, and vote records.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Chamas Table
CREATE TABLE IF NOT EXISTS chamas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    currency VARCHAR(10) DEFAULT 'KES',
    status VARCHAR(50) DEFAULT 'active'
);

-- 2. Chama Members Table
CREATE TABLE IF NOT EXISTS chama_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Member', -- 'Chairperson', 'Treasurer', 'Secretary', 'Member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_member_email_per_chama UNIQUE (chama_id, email)
);

-- 3. Contributions Table
CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID REFERENCES chama_members(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    contribution_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'paid', 'pending', 'overdue'
    payment_method VARCHAR(50), -- 'M-Pesa', 'Cash', 'Bank Transfer'
    transaction_reference VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fines Table
CREATE TABLE IF NOT EXISTS fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID REFERENCES chama_members(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    issue_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'paid', 'pending'
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    member_id UUID REFERENCES chama_members(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL, -- e.g., 10.00 for 10%
    term_months INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'active', 'fully_paid'
    application_date DATE NOT NULL,
    approval_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Loan Repayments Table
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    repayment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'M-Pesa',
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'refreshments', 'stationery', 'charity', 'registration', 'other'
    description TEXT NOT NULL,
    date DATE NOT NULL,
    receipt_url TEXT,
    recorded_by UUID REFERENCES chama_members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    minutes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Meeting Attendance Table
CREATE TABLE IF NOT EXISTS meeting_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES chama_members(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'absent_with_apology'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attendance UNIQUE (meeting_id, member_id)
);

-- 10. Votes (Resolutions) Table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chama_id UUID REFERENCES chamas(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Vote Records Table
CREATE TABLE IF NOT EXISTS vote_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    member_id UUID REFERENCES chama_members(id) ON DELETE CASCADE,
    choice VARCHAR(50) NOT NULL, -- 'yes', 'no', 'abstain'
    cast_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vote UNIQUE (vote_id, member_id)
);

-- Atomic contribution increment (prevents race condition on concurrent officer POSTs)
-- Called via supabase.rpc('increment_contribution', { p_id, p_amount, p_method, p_recorder })
CREATE OR REPLACE FUNCTION increment_contribution(
  p_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT NULL,
  p_recorder UUID DEFAULT NULL
) RETURNS SETOF contributions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE contributions
  SET amount_paid = amount_paid + p_amount,
      paid_at = NOW(),
      payment_method = COALESCE(p_method, payment_method),
      recorded_by = COALESCE(p_recorder, recorded_by)
  WHERE id = p_id
  RETURNING *;
END;
$$;
