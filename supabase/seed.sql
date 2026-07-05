-- ChamaVault Seed Data: Wema Savings Group
-- Run this in Supabase SQL Editor after creating a test user account.
-- Create a user account first, then replace 'USER-UUID-HERE' with that user's UUID.

-- Step 1: Create the demo chama
INSERT INTO chamas (id, name, founding_date, objective, meeting_day, meeting_frequency, contribution_amount, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Wema Savings Group',
  '2025-01-15',
  'Kuokoleana na kuwekeza pamoja',
  'sunday',
  'monthly',
  500,
  'USER-UUID-HERE'
);

-- Step 2: Add 8 members
INSERT INTO chama_members (id, chama_id, full_name, phone, role, joined_at, share_units) VALUES
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Jane Wanjiku',    '0712345678', 'chairperson', '2025-01-15', 10),
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Peter Mwangi',    '0722345678', 'treasurer',   '2025-01-15', 10),
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Mary Auma',       '0732345678', 'secretary',   '2025-01-15', 10),
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'John Kamau',      '0742345678', 'member',      '2025-01-15', 10),
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Alice Njeri',     '0752345678', 'member',      '2025-01-15', 10),
  ('71111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'David Ochieng',   '0762345678', 'member',      '2025-02-01', 10),
  ('81111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Grace Wambui',    '0772345678', 'member',      '2025-02-01', 10),
  ('91111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Samuel Muthoka',  '0782345678', 'member',      '2025-03-01', 10);

-- Step 3: 12 months of contributions (Jan - Dec 2025), KES 500/month
-- Member 1 (Jane) - paid all
INSERT INTO contributions (chama_id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method) VALUES
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-01-01', 500, 500, '2025-01-05 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-02-01', 500, 500, '2025-02-03 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-03-01', 500, 500, '2025-03-02 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-04-01', 500, 500, '2025-04-06 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-05-01', 500, 500, '2025-05-04 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-06-01', 500, 500, '2025-06-01 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-07-01', 500, 500, '2025-07-06 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-08-01', 500, 500, '2025-08-03 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-09-01', 500, 500, '2025-09-02 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-10-01', 500, 500, '2025-10-05 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-11-01', 500, 500, '2025-11-03 10:00:00+00', 'mpesa'),
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '2025-12-01', 500, 500, '2025-12-02 10:00:00+00', 'mpesa');

-- Member 2 (Peter) - missed Feb and Oct
INSERT INTO contributions (chama_id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method) VALUES
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-01-01', 500, 500, '2025-01-05 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-02-01', 500, 0, NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-03-01', 500, 500, '2025-03-02 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-04-01', 500, 500, '2025-04-06 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-05-01', 500, 500, '2025-05-04 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-06-01', 500, 500, '2025-06-01 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-07-01', 500, 500, '2025-07-06 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-08-01', 500, 500, '2025-08-03 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-09-01', 500, 500, '2025-09-02 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-10-01', 500, 0, NULL, NULL),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-11-01', 500, 500, '2025-11-03 10:00:00+00', 'cash'),
  ('11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '2025-12-01', 500, 500, '2025-12-02 10:00:00+00', 'cash');

-- Remaining 6 members (John, Alice, David, Grace, Samuel, Mary) - 12 months each with 80% payment rate
DO $$
DECLARE
  member_ids uuid[] := ARRAY[
    '41111111-1111-1111-1111-111111111111', -- Mary
    '51111111-1111-1111-1111-111111111111', -- John
    '61111111-1111-1111-1111-111111111111', -- Alice
    '71111111-1111-1111-1111-111111111111', -- David
    '81111111-1111-1111-1111-111111111111', -- Grace
    '91111111-1111-1111-1111-111111111111'  -- Samuel
  ];
  m_id uuid;
  m int;
  chama uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  FOREACH m_id IN ARRAY member_ids LOOP
    FOR m IN 1..12 LOOP
      INSERT INTO contributions (chama_id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method)
      VALUES (
        chama,
        m_id,
        make_date(2025, m, 1),
        500,
        CASE WHEN (random() * 100)::int > 20 THEN 500 ELSE 0 END,
        CASE WHEN (random() * 100)::int > 20 THEN make_timestamptz(2025, m, 5, 10, 0, 0, 'Africa/Nairobi') ELSE NULL END,
        CASE WHEN (random() * 100)::int > 50 THEN 'mpesa' ELSE 'cash' END
      );
    END LOOP;
  END LOOP;
END $$;

-- Step 4: 2 active loans
INSERT INTO loans (chama_id, member_id, amount, interest_rate, disbursed_at, due_date, status) VALUES
  ('11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 5000, 5, '2025-03-01 10:00:00+00', '2025-09-01', 'active'),
  ('11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 3000, 10, '2025-06-01 10:00:00+00', '2025-12-01', 'active');

-- Loan repayments (Jane has repaid 3 months, John 2 months)
INSERT INTO loan_repayments (loan_id, amount, paid_at)
SELECT l.id, 500, gs.month::timestamptz
FROM loans l
CROSS JOIN (VALUES ('2025-04-01'), ('2025-05-01'), ('2025-06-01')) AS gs(month)
WHERE l.member_id = '21111111-1111-1111-1111-111111111111';

INSERT INTO loan_repayments (loan_id, amount, paid_at)
SELECT l.id, 300, gs.month::timestamptz
FROM loans l
CROSS JOIN (VALUES ('2025-07-01'), ('2025-08-01')) AS gs(month)
WHERE l.member_id = '51111111-1111-1111-1111-111111111111';

-- Step 5: 3 expenses
INSERT INTO expenses (chama_id, description, amount, category, expense_date) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Meeting venue - March', 500, 'venue', '2025-03-02'),
  ('11111111-1111-1111-1111-111111111111', 'Snacks and stationery - June', 350, 'admin', '2025-06-01'),
  ('11111111-1111-1111-1111-111111111111', 'Bank withdrawal fees - September', 100, 'admin', '2025-09-02');

-- Step 6: 2 past meetings
INSERT INTO meetings (chama_id, date, agenda, venue, minutes_text) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-03-02 14:00:00+00',
   '1. Opening prayer\n2. Review of February contributions\n3. Loan application review\n4. Investment discussion\n5. AOB',
   'St. Peter''s Hall, Nairobi',
   'Meeting opened at 2pm with prayer by Jane Wanjiku.\nFebruary contributions reviewed — 6 out of 8 members paid.\nJohn Kamau loan application of KES 3,000 discussed and deferred to next meeting.\nDiscussed investing chama funds in land in Kitengela.\nMeeting closed at 4:30pm.'),
  ('11111111-1111-1111-1111-111111111111', '2025-06-01 14:00:00+00',
   '1. Opening prayer\n2. Mid-year review\n3. Loan approvals\n4. Dividend planning\n5. AOB',
   'St. Peter''s Hall, Nairobi',
   'Meeting opened at 2pm.\nMid-year review: total contributions KES 24,000, treasury balance KES 20,000.\nJohn Kamau loan of KES 3,000 approved at 10% interest.\nDividend planning deferred to December AGM.\nApologies: Peter Mwangi (family commitment).\nMeeting closed at 5pm.');

-- Meeting attendance for both meetings
INSERT INTO meeting_attendance (meeting_id, member_id, present)
SELECT m.id, mb.id, true
FROM meetings m
CROSS JOIN chama_members mb
WHERE m.chama_id = '11111111-1111-1111-1111-111111111111'
  AND mb.chama_id = '11111111-1111-1111-1111-111111111111'
  AND mb.full_name != 'Peter Mwangi'; -- Peter missed June

INSERT INTO meeting_attendance (meeting_id, member_id, present)
SELECT m.id, mb.id, false
FROM meetings m
CROSS JOIN chama_members mb
WHERE m.date = '2025-06-01 14:00:00+00'
  AND mb.full_name = 'Peter Mwangi';

-- Step 7: 1 fine (David late to March meeting)
INSERT INTO fines (chama_id, member_id, reason, amount, paid) VALUES
  ('11111111-1111-1111-1111-111111111111', '71111111-1111-1111-1111-111111111111', 'Late to March meeting', 100, true);

-- Step 8: 2 chama investments
INSERT INTO investments (chama_id, name, investment_type, description, purchase_date, cost, current_value) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Kitengela Land Plot', 'property', 'Residential plot in Kitengela Phase 2', '2025-07-15', 150000, 180000),
  ('11111111-1111-1111-1111-111111111111', 'Safaricom Shares', 'stock', '1000 shares on Nairobi Securities Exchange', '2025-04-01', 25000, 32000);
