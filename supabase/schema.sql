-- ChamaVault Database Schema
-- Run this in Supabase SQL Editor to set up tables and RLS policies.

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Chamas (savings groups)
create table if not exists chamas (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  photo_url text,
  founding_date date default current_date,
  objective text,
  meeting_day text not null,
  meeting_frequency text not null default 'monthly', -- weekly, biweekly, monthly
  contribution_amount numeric not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid not null references auth.users(id)
);

-- Members of each chama
create table if not exists chama_members (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  user_id uuid references auth.users(id),
  full_name text not null,
  phone text,
  role text not null default 'member', -- chairperson, treasurer, secretary, member
  joined_at timestamptz default now(),
  share_units numeric default 0
);

-- Monthly contributions per member
create table if not exists contributions (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  member_id uuid not null references chama_members(id) on delete cascade,
  month_year date not null,
  amount_due numeric not null,
  amount_paid numeric default 0,
  paid_at timestamptz,
  payment_method text, -- cash, mpesa, bank
  recorded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Fines issued to members
create table if not exists fines (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  member_id uuid not null references chama_members(id) on delete cascade,
  reason text not null,
  amount numeric not null,
  paid boolean default false,
  issued_at timestamptz default now()
);

-- Loan applications and approved loans
create table if not exists loans (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  member_id uuid not null references chama_members(id) on delete cascade,
  amount numeric not null,
  interest_rate numeric default 0,
  disbursed_at timestamptz,
  due_date date,
  status text not null default 'pending', -- pending, approved, rejected, active, repaid
  approved_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Loan repayment installments
create table if not exists loan_repayments (
  id uuid primary key default uuid_generate_v4(),
  loan_id uuid not null references loans(id) on delete cascade,
  amount numeric not null,
  paid_at timestamptz default now()
);

-- Chama expenses
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  description text not null,
  amount numeric not null,
  category text not null,
  expense_date date not null,
  receipt_url text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Meetings
create table if not exists meetings (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  date timestamptz not null,
  agenda text,
  venue text,
  minutes_text text,
  created_at timestamptz default now()
);

-- Meeting attendance
create table if not exists meeting_attendance (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  member_id uuid not null references chama_members(id) on delete cascade,
  present boolean default false
);

-- Voting resolutions
create table if not exists votes (
  id uuid primary key default uuid_generate_v4(),
  chama_id uuid not null references chamas(id) on delete cascade,
  resolution_text text not null,
  created_at timestamptz default now(),
  closes_at timestamptz
);

-- Individual vote records
create table if not exists vote_records (
  id uuid primary key default uuid_generate_v4(),
  vote_id uuid not null references votes(id) on delete cascade,
  member_id uuid not null references chama_members(id) on delete cascade,
  vote_value text not null, -- yes, no, abstain
  voted_at timestamptz default now()
);

-- Prevent duplicate membership
create unique index if not exists idx_chama_members_unique on chama_members(chama_id, user_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_chama_members_user on chama_members(user_id);
create index if not exists idx_chama_members_chama on chama_members(chama_id);
create index if not exists idx_contributions_member on contributions(member_id);
create index if not exists idx_contributions_chama_month on contributions(chama_id, month_year);
create index if not exists idx_loans_member on loans(member_id);
create index if not exists idx_loans_chama on loans(chama_id);
create index if not exists idx_expenses_chama on expenses(chama_id);
create index if not exists idx_meetings_chama on meetings(chama_id);
create index if not exists idx_votes_chama on votes(chama_id);
create index if not exists idx_fines_member on fines(member_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table chamas enable row level security;
alter table chama_members enable row level security;
alter table contributions enable row level security;
alter table fines enable row level security;
alter table loans enable row level security;
alter table loan_repayments enable row level security;
alter table expenses enable row level security;
alter table meetings enable row level security;
alter table meeting_attendance enable row level security;
alter table votes enable row level security;
alter table vote_records enable row level security;

-- Helper function: get chamas where the current user is a member
create or replace function user_chama_ids()
returns setof uuid
language sql
security definer
set search_path = ''
as $$
  select chama_id from chama_members where user_id = auth.uid();
$$;

-- Helper function: get user's role in a chama
create or replace function user_role_in_chama(chama_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select role from chama_members where chama_id = $1 and user_id = auth.uid();
$$;

-- Helper: is user an officer (chairperson, treasurer, secretary) in a chama?
create or replace function is_chama_officer(chama_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from chama_members
    where chama_id = $1 and user_id = auth.uid()
    and role in ('chairperson', 'treasurer', 'secretary')
  );
$$;

-- CHAMAS policies
create policy "Members can view their chamas"
  on chamas for select
  using (id in (select user_chama_ids()));

create policy "Officers can update chama"
  on chamas for update
  using (is_chama_officer(id));

create policy "Authenticated users can create chamas"
  on chamas for insert
  with check (auth.uid() = created_by);

-- CHAMA_MEMBERS policies
create policy "Members can view members in their chamas"
  on chama_members for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can insert members"
  on chama_members for insert
  with check (is_chama_officer(chama_id));

create policy "Officers can update members"
  on chama_members for update
  using (is_chama_officer(chama_id));

-- CONTRIBUTIONS policies
create policy "Members can view contributions in their chamas"
  on contributions for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can insert contributions"
  on contributions for insert
  with check (is_chama_officer(chama_id));

create policy "Officers can update contributions"
  on contributions for update
  using (is_chama_officer(chama_id));

-- FINES policies
create policy "Members can view fines in their chamas"
  on fines for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can manage fines"
  on fines for insert
  with check (is_chama_officer(chama_id));

create policy "Officers can update fines"
  on fines for update
  using (is_chama_officer(chama_id));

-- LOANS policies
create policy "Members can view loans in their chamas"
  on loans for select
  using (chama_id in (select user_chama_ids()));

create policy "Members can apply for loans"
  on loans for insert
  with check (
    chama_id in (select user_chama_ids())
    and status = 'pending'
    and exists (
      select 1 from chama_members
      where chama_id = loans.chama_id and user_id = auth.uid() and id = loans.member_id
    )
  );

create policy "Officers can approve/reject loans"
  on loans for update
  using (is_chama_officer(chama_id));

-- LOAN_REPAYMENTS policies
create policy "Members can view loan repayments in their chamas"
  on loan_repayments for select
  using (
    exists (
      select 1 from loans
      where loans.id = loan_repayments.loan_id
      and loans.chama_id in (select user_chama_ids())
    )
  );

create policy "Officers can record repayments"
  on loan_repayments for insert
  with check (
    exists (
      select 1 from loans
      where loans.id = loan_repayments.loan_id
      and is_chama_officer(loans.chama_id)
    )
  );

-- EXPENSES policies
create policy "Members can view expenses in their chamas"
  on expenses for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can manage expenses"
  on expenses for insert
  with check (is_chama_officer(chama_id));

-- MEETINGS policies
create policy "Members can view meetings in their chamas"
  on meetings for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can manage meetings"
  on meetings for insert
  with check (is_chama_officer(chama_id));

create policy "Officers can update meetings"
  on meetings for update
  using (is_chama_officer(chama_id));

-- MEETING_ATTENDANCE policies
create policy "Members can view attendance in their chamas"
  on meeting_attendance for select
  using (
    exists (
      select 1 from meetings
      where meetings.id = meeting_attendance.meeting_id
      and meetings.chama_id in (select user_chama_ids())
    )
  );

create policy "Officers can mark attendance"
  on meeting_attendance for insert
  with check (
    exists (
      select 1 from meetings
      where meetings.id = meeting_attendance.meeting_id
      and is_chama_officer(meetings.chama_id)
    )
  );

-- VOTES policies
create policy "Members can view votes in their chamas"
  on votes for select
  using (chama_id in (select user_chama_ids()));

create policy "Officers can create votes"
  on votes for insert
  with check (is_chama_officer(chama_id));

-- VOTE_RECORDS policies
create policy "Members can view vote records in their chamas"
  on vote_records for select
  using (
    exists (
      select 1 from votes
      where votes.id = vote_records.vote_id
      and votes.chama_id in (select user_chama_ids())
    )
  );

create policy "Members can cast their own vote"
  on vote_records for insert
  with check (
    exists (
      select 1 from chama_members
      where chama_members.id = vote_records.member_id
      and chama_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- SEED DATA: Demo chama "Wema Savings Group"
-- ============================================================

-- Insert demo chama (this will fail gracefully if auth.uid() doesn't match)
-- Run these manually with a valid user UUID after creating a test account.

-- Example seed (replace 'USER-UUID-HERE' with actual user id):
/*
insert into chamas (name, founding_date, objective, meeting_day, meeting_frequency, contribution_amount, created_by)
values ('Wema Savings Group', '2025-01-15', 'Kuokoleana na kuwekeza pamoja', 'sunday', 'monthly', 500, 'USER-UUID-HERE');

-- Add 8 members
insert into chama_members (chama_id, full_name, role, joined_at)
values
  ((select id from chamas where name = 'Wema Savings Group'), 'Jane Wanjiku', 'chairperson', '2025-01-15'),
  ((select id from chamas where name = 'Wema Savings Group'), 'Peter Mwangi', 'treasurer', '2025-01-15'),
  ((select id from chamas where name = 'Wema Savings Group'), 'Mary Auma', 'secretary', '2025-01-15'),
  ((select id from chamas where name = 'Wema Savings Group'), 'John Kamau', 'member', '2025-01-15'),
  ((select id from chamas where name = 'Wema Savings Group'), 'Alice Njeri', 'member', '2025-01-15'),
  ((select id from chamas where name = 'Wema Savings Group'), 'David Ochieng', 'member', '2025-02-01'),
  ((select id from chamas where name = 'Wema Savings Group'), 'Grace Wambui', 'member', '2025-02-01'),
  ((select id from chamas where name = 'Wema Savings Group'), 'Samuel Muthoka', 'member', '2025-03-01');

-- 6 months contribution history (Jan - Jun 2025)
insert into contributions (chama_id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method, recorded_by)
select c.id, m.id, d.month, 500,
  case when random() > 0.2 then 500 else 0 end,
  case when random() > 0.2 then d.month + interval '5 days' else null end,
  case when random() > 0.5 then 'mpesa' else 'cash' end,
  c.created_by
from chamas c
cross join chama_members m
cross join (values
  ('2025-01-01'::date),
  ('2025-02-01'::date),
  ('2025-03-01'::date),
  ('2025-04-01'::date),
  ('2025-05-01'::date),
  ('2025-06-01'::date)
) as d(month)
where c.name = 'Wema Savings Group' and m.chama_id = c.id;

-- 1 active loan for Jane Wanjiku
insert into loans (chama_id, member_id, amount, interest_rate, disbursed_at, due_date, status, approved_by)
select c.id, m.id, 5000, 5, '2025-03-01', '2025-09-01', 'active', c.created_by
from chamas c
join chama_members m on m.chama_id = c.id and m.full_name = 'Jane Wanjiku'
where c.name = 'Wema Savings Group';
*/
