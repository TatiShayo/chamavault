// ChamaVault Mock Database Service
// Implements type definitions, seed data, and localStorage persistence.

export interface Chama {
  id: string;
  name: string;
  description: string;
  created_at: string;
  currency: string;
  status: string;
}

export interface ChamaMember {
  id: string;
  chama_id: string;
  name: string;
  email: string;
  role: 'Chairperson' | 'Treasurer' | 'Secretary' | 'Member';
  joined_at: string;
}

export interface Contribution {
  id: string;
  chama_id: string;
  member_id: string;
  amount: number;
  contribution_date: string; // YYYY-MM
  status: 'paid' | 'pending' | 'overdue';
  payment_method?: 'M-Pesa' | 'Cash' | 'Bank Transfer';
  transaction_reference?: string;
  remarks?: string;
  created_at: string;
}

export interface Fine {
  id: string;
  chama_id: string;
  member_id: string;
  amount: number;
  reason: string;
  issue_date: string;
  status: 'paid' | 'pending';
  paid_date?: string;
  payment_method?: string;
  transaction_reference?: string;
  created_at: string;
}

export interface Loan {
  id: string;
  chama_id: string;
  member_id: string;
  amount: number;
  interest_rate: number; // in percentage, e.g. 10 means 10%
  term_months: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'fully_paid';
  application_date: string;
  approval_date?: string;
  created_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  amount: number;
  repayment_date: string;
  payment_method: string;
  transaction_reference?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  chama_id: string;
  amount: number;
  category: 'refreshments' | 'stationery' | 'charity' | 'registration' | 'other';
  description: string;
  date: string;
  receipt_url?: string; // or base64 mock
  recorded_by: string; // member_id
  created_at: string;
}

export interface Meeting {
  id: string;
  chama_id: string;
  title: string;
  date: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  minutes?: string;
  created_at: string;
}

export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  member_id: string;
  status: 'present' | 'absent' | 'absent_with_apology';
}

export interface Vote {
  id: string;
  chama_id: string;
  title: string;
  description: string;
  end_date: string;
  status: 'active' | 'closed';
  created_at: string;
}

export interface VoteRecord {
  id: string;
  vote_id: string;
  member_id: string;
  choice: 'yes' | 'no' | 'abstain';
  cast_at: string;
}

export interface DbState {
  chamas: Chama[];
  members: ChamaMember[];
  contributions: Contribution[];
  fines: Fine[];
  loans: Loan[];
  repayments: LoanRepayment[];
  expenses: Expense[];
  meetings: Meeting[];
  attendance: MeetingAttendance[];
  votes: Vote[];
  voteRecords: VoteRecord[];
}

// Default Seed Data
const CHAMA_ID = 'wema-savings-group-id';

const seedChama: Chama = {
  id: CHAMA_ID,
  name: 'Wema Savings Group',
  description: 'Self-help savings and investment chama based in Nairobi, fostering economic empowerment and financial security for members.',
  created_at: '2025-12-15T10:00:00Z',
  currency: 'KES',
  status: 'active',
};

const seedMembers: ChamaMember[] = [
  { id: 'm1', chama_id: CHAMA_ID, name: 'Grace Kiputo', email: 'grace.kiputo@gmail.com', role: 'Chairperson', joined_at: '2025-12-15T10:00:00Z' },
  { id: 'm2', chama_id: CHAMA_ID, name: 'David Ochieng', email: 'david.ochieng@gmail.com', role: 'Treasurer', joined_at: '2025-12-15T10:00:00Z' },
  { id: 'm3', chama_id: CHAMA_ID, name: 'Amina Yusuf', email: 'amina.yusuf@gmail.com', role: 'Secretary', joined_at: '2025-12-15T10:00:00Z' },
  { id: 'm4', chama_id: CHAMA_ID, name: 'John Mwangi', email: 'john.mwangi@gmail.com', role: 'Member', joined_at: '2026-01-02T08:00:00Z' },
  { id: 'm5', chama_id: CHAMA_ID, name: 'Sarah Cherono', email: 'sarah.cherono@gmail.com', role: 'Member', joined_at: '2026-01-05T09:00:00Z' },
  { id: 'm6', chama_id: CHAMA_ID, name: 'Joseph Kamau', email: 'joseph.kamau@gmail.com', role: 'Member', joined_at: '2026-01-10T14:00:00Z' },
  { id: 'm7', chama_id: CHAMA_ID, name: 'Mercy Wanjiku', email: 'mercy.wanjiku@gmail.com', role: 'Member', joined_at: '2026-01-12T11:00:00Z' },
  { id: 'm8', chama_id: CHAMA_ID, name: 'Fatuma Ali', email: 'fatuma.ali@gmail.com', role: 'Member', joined_at: '2026-01-15T10:30:00Z' },
];

// Seed contributions: 8 members x 6 months (Jan 2026 - Jun 2026). Amount KES 2,000 each.
// Total expected = 48 contributions. Let's make most paid, a few pending or overdue.
const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const seedContributions: Contribution[] = [];

seedMembers.forEach((member) => {
  months.forEach((month, idx) => {
    // Generate static but realistic contribution record
    let status: 'paid' | 'pending' | 'overdue' = 'paid';
    let payment_method: 'M-Pesa' | 'Cash' | 'Bank Transfer' | undefined = 'M-Pesa';
    let transaction_reference: string | undefined = `MPESA-TX-${member.id}-${month.replace('-', '')}`;
    let remarks: string | undefined = 'Monthly target met';

    // Make month 6 (June 2026) pending or overdue for some members to showcase functionality
    if (month === '2026-06') {
      if (member.id === 'm5') {
        status = 'pending';
        payment_method = undefined;
        transaction_reference = undefined;
        remarks = undefined;
      } else if (member.id === 'm6') {
        status = 'overdue';
        payment_method = undefined;
        transaction_reference = undefined;
        remarks = undefined;
      }
    }
    // Make month 5 (May 2026) overdue for member 8
    if (month === '2026-05' && member.id === 'm8') {
      status = 'overdue';
      payment_method = undefined;
      transaction_reference = undefined;
      remarks = undefined;
    }

    seedContributions.push({
      id: `c-${member.id}-${month}`,
      chama_id: CHAMA_ID,
      member_id: member.id,
      amount: 2000,
      contribution_date: month,
      status,
      payment_method,
      transaction_reference,
      remarks,
      created_at: `${month}-15T12:00:00Z`,
    });
  });
});

// Seed Fines
const seedFines: Fine[] = [
  {
    id: 'f-1',
    chama_id: CHAMA_ID,
    member_id: 'm3', // Amina
    amount: 500,
    reason: 'Late submission of May meeting minutes',
    issue_date: '2026-06-02',
    status: 'pending',
    created_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'f-2',
    chama_id: CHAMA_ID,
    member_id: 'm6', // Joseph
    amount: 200,
    reason: 'Arriving late to April monthly physical meeting',
    issue_date: '2026-04-18',
    status: 'paid',
    paid_date: '2026-04-20',
    payment_method: 'M-Pesa',
    transaction_reference: 'MPESA-FINE-202',
    created_at: '2026-04-18T16:00:00Z',
  },
];

// Seed 1 active loan of KES 15,000 to John Mwangi (m4)
// Interest 10%, term 3 months. Applied & approved on 2026-05-01. Repayment of KES 16,500 total.
const seedLoans: Loan[] = [
  {
    id: 'l-1',
    chama_id: CHAMA_ID,
    member_id: 'm4', // John Mwangi
    amount: 15000,
    interest_rate: 10,
    term_months: 3,
    status: 'active',
    application_date: '2026-04-25',
    approval_date: '2026-05-01',
    created_at: '2026-04-25T11:00:00Z',
  },
  {
    // A pending loan application to show Chair approval flow
    id: 'l-2',
    chama_id: CHAMA_ID,
    member_id: 'm5', // Sarah Cherono
    amount: 10000,
    interest_rate: 10,
    term_months: 2,
    status: 'pending',
    application_date: '2026-06-25',
    created_at: '2026-06-25T09:30:00Z',
  },
];

// Seed repayments: John paid KES 5,500 on 2026-06-01
const seedRepayments: LoanRepayment[] = [
  {
    id: 'lr-1',
    loan_id: 'l-1',
    amount: 5500,
    repayment_date: '2026-06-01',
    payment_method: 'M-Pesa',
    transaction_reference: 'MPESA-REPAY-889',
    created_at: '2026-06-01T14:22:00Z',
  },
];

// Seed Expenses
const seedExpenses: Expense[] = [
  {
    id: 'e-1',
    chama_id: CHAMA_ID,
    amount: 1200,
    category: 'stationery',
    description: 'Chama ledger book, register files and receipt booklets',
    date: '2026-03-15',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300&auto=format&fit=crop',
    recorded_by: 'm2', // David (Treasurer)
    created_at: '2026-03-15T15:00:00Z',
  },
  {
    id: 'e-2',
    chama_id: CHAMA_ID,
    amount: 2500,
    category: 'refreshments',
    description: 'Beverages, samosas, and fruits for physical AGM meeting',
    date: '2026-05-10',
    receipt_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=300&auto=format&fit=crop',
    recorded_by: 'm2',
    created_at: '2026-05-10T18:00:00Z',
  },
];

// Seed Meetings
const seedMeetings: Meeting[] = [
  {
    id: 'mt-1',
    chama_id: CHAMA_ID,
    title: 'First Quarter General Assembly',
    date: '2026-03-14T14:00:00Z',
    location: 'Grace Kiputo\'s residence, Nairobi & Zoom',
    status: 'completed',
    minutes: 'Minutes of Q1 Assembly:\n1. Welcomed new members John, Sarah, Joseph, Mercy, Fatuma.\n2. Reviewed financial state: total savings exceed KES 40,000.\n3. Discussed implementing digital alerts. Agreed to adopt ChamaVault.\n4. Approved a KES 200 late fine to enforce punctuality.',
    created_at: '2026-03-10T08:00:00Z',
  },
  {
    id: 'mt-2',
    chama_id: CHAMA_ID,
    title: 'Second Quarter Review & Mid-Year Budgeting',
    date: '2026-06-13T14:30:00Z',
    location: 'Westlands Social Center & Google Meet',
    status: 'completed',
    minutes: 'Minutes of Q2 Review:\n1. Financial overview: Savings collections verified and Treasurer presented bank reconciliation.\n2. John Mwangi reported that his business expansion is on track with the KES 15,000 loan.\n3. Resolved to propose a vote to increase contributions next month to KES 2,500 to grow our pool.',
    created_at: '2026-06-05T09:00:00Z',
  },
  {
    id: 'mt-3',
    chama_id: CHAMA_ID,
    title: 'Half-Year Progress Review & Loan Approvals Meeting',
    date: '2026-07-11T15:00:00Z', // Pending meeting
    location: 'Community Hall & Zoom',
    status: 'scheduled',
    created_at: '2026-06-20T10:00:00Z',
  },
];

// Seed Attendance for MT-1 (all present except Amina Yusuf was absent with apology, Joseph Kamau present but late)
const seedAttendance: MeetingAttendance[] = [
  { id: 'a1', meeting_id: 'mt-1', member_id: 'm1', status: 'present' },
  { id: 'a2', meeting_id: 'mt-1', member_id: 'm2', status: 'present' },
  { id: 'a3', meeting_id: 'mt-1', member_id: 'm3', status: 'absent_with_apology' },
  { id: 'a4', meeting_id: 'mt-1', member_id: 'm4', status: 'present' },
  { id: 'a5', meeting_id: 'mt-1', member_id: 'm5', status: 'present' },
  { id: 'a6', meeting_id: 'mt-1', member_id: 'm6', status: 'present' },
  { id: 'a7', meeting_id: 'mt-1', member_id: 'm7', status: 'present' },
  { id: 'a8', meeting_id: 'mt-1', member_id: 'm8', status: 'present' },
  // MT-2 Attendance (all present)
  { id: 'a9', meeting_id: 'mt-2', member_id: 'm1', status: 'present' },
  { id: 'a10', meeting_id: 'mt-2', member_id: 'm2', status: 'present' },
  { id: 'a11', meeting_id: 'mt-2', member_id: 'm3', status: 'present' },
  { id: 'a12', meeting_id: 'mt-2', member_id: 'm4', status: 'present' },
  { id: 'a13', meeting_id: 'mt-2', member_id: 'm5', status: 'present' },
  { id: 'a14', meeting_id: 'mt-2', member_id: 'm6', status: 'present' },
  { id: 'a15', meeting_id: 'mt-2', member_id: 'm7', status: 'present' },
  { id: 'a16', meeting_id: 'mt-2', member_id: 'm8', status: 'present' },
];

// Seed Votes
const seedVotes: Vote[] = [
  {
    id: 'v-1',
    chama_id: CHAMA_ID,
    title: 'Increase Monthly Contribution to KES 2,500',
    description: 'Proposing to increase the minimum monthly savings from KES 2,000 to KES 2,500 starting August 2026 to increase our investment capacity.',
    end_date: '2026-07-15T23:59:59Z',
    status: 'active',
    created_at: '2026-06-15T09:00:00Z',
  },
  {
    id: 'v-2',
    chama_id: CHAMA_ID,
    title: 'Invest KES 50,000 in Government Treasury Bills',
    description: 'Seeking approval to invest KES 50,000 from the accumulated reserve funds into 91-day Government Treasury Bills for low-risk yield.',
    end_date: '2026-07-20T23:59:59Z',
    status: 'active',
    created_at: '2026-06-20T10:00:00Z',
  },
];

// Seed Vote Records: 4 members voted yes, 1 no, others pending on v-1
const seedVoteRecords: VoteRecord[] = [
  { id: 'vr-1', vote_id: 'v-1', member_id: 'm1', choice: 'yes', cast_at: '2026-06-16T12:00:00Z' },
  { id: 'vr-2', vote_id: 'v-1', member_id: 'm2', choice: 'yes', cast_at: '2026-06-16T13:00:00Z' },
  { id: 'vr-3', vote_id: 'v-1', member_id: 'm3', choice: 'yes', cast_at: '2026-06-17T09:30:00Z' },
  { id: 'vr-4', vote_id: 'v-1', member_id: 'm6', choice: 'no', cast_at: '2026-06-18T15:00:00Z' },
  // v-2 records: 3 yes, 2 abstain
  { id: 'vr-5', vote_id: 'v-2', member_id: 'm1', choice: 'yes', cast_at: '2026-06-21T11:00:00Z' },
  { id: 'vr-6', vote_id: 'v-2', member_id: 'm2', choice: 'yes', cast_at: '2026-06-22T08:00:00Z' },
  { id: 'vr-7', vote_id: 'v-2', member_id: 'm4', choice: 'abstain', cast_at: '2026-06-22T10:00:00Z' },
];

const initialDbState: DbState = {
  chamas: [seedChama],
  members: seedMembers,
  contributions: seedContributions,
  fines: seedFines,
  loans: seedLoans,
  repayments: seedRepayments,
  expenses: seedExpenses,
  meetings: seedMeetings,
  attendance: seedAttendance,
  votes: seedVotes,
  voteRecords: seedVoteRecords,
};

// Storage Key
const STORAGE_KEY = 'chamavault_db_state';

// Helper to check if running on browser
const isClient = () => typeof window !== 'undefined';

export function getDbState(): DbState {
  if (!isClient()) {
    return initialDbState;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDbState));
    return initialDbState;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse mock DB state, resetting', e);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDbState));
    return initialDbState;
  }
}

export function saveDbState(state: DbState): void {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Trigger custom event to notify other components/instances in the same window
    window.dispatchEvent(new Event('chamavault_db_update'));
  }
}

export function resetDb(): DbState {
  if (isClient()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDbState));
    window.dispatchEvent(new Event('chamavault_db_update'));
  }
  return initialDbState;
}
