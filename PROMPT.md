You are a senior fullstack engineer. Build ChamaVault — a digital chama (group savings) management SaaS for Kenya — in this Next.js project. YOLO MODE.

PRODUCT: ChamaVault replaces Excel + WhatsApp for managing Kenya group savings (chamas). KES 500–2,000/mo.

READ PLAN.md FIRST. Complete every [ ] task in order. Git commit after each.

DESIGN: Dark theme. Yellow/gold accent #f59e0b (money/savings/prosperity). Background #0a0900. Surface #14120a. Border #2a2510. Warm, trustworthy, African aesthetic. Use Ubuntu or Nunito font (Google Fonts). Include a subtle kanga-inspired geometric pattern as a subtle background texture (CSS pattern, not image).

CURRENCY HANDLING: All amounts in KES. Format with: new Intl.NumberFormat('en-KE', {style:'currency', currency:'KES'}).format(amount). Never show raw numbers. Always KES prefix.

KEY DB SCHEMA (create supabase/schema.sql):
  chamas: id, name, photo_url, founding_date, objective, meeting_day, meeting_frequency, contribution_amount, is_active
  chama_members: id, chama_id, user_id, full_name, phone, role, joined_at, share_units
  contributions: id, chama_id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method, recorded_by
  fines: id, chama_id, member_id, reason, amount, paid, issued_at
  loans: id, chama_id, member_id, amount, interest_rate, disbursed_at, due_date, status, approved_by
  loan_repayments: id, loan_id, amount, paid_at
  expenses: id, chama_id, description, amount, category, expense_date, receipt_url
  meetings: id, chama_id, date, agenda, venue, minutes_text, created_at
  meeting_attendance: id, meeting_id, member_id, present
  votes: id, chama_id, resolution_text, created_at, closes_at
  vote_records: id, vote_id, member_id, vote_value, voted_at

Seed 1 demo chama "Wema Savings Group" with 8 members, 6 months contribution history, 1 active loan.

NEVER STOP. PLAN.md drives everything.
