'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDbState, saveDbState, resetDb } from '@/lib/mockDb';
import type { DbState, Chama, ChamaMember, Contribution, Fine, Loan, LoanRepayment, Expense, Meeting, MeetingAttendance, Vote, VoteRecord } from '@/lib/mockDb';
import { translations, Language } from '@/lib/translations';
import { 
  calculateTotalSavings, 
  calculateMemberSavings, 
  calculateActiveLoansTotal, 
  calculateSingleLoanBalance,
  checkLoanEligibility,
  calculateDividendSplits as computeDividendSplits
} from '@/lib/financials';
import { 
  Coins, HandCoins, Receipt, Calendar, Vote as VoteIcon, MessageSquare, Settings, Users, 
  PlusCircle, CheckCircle2, XCircle, AlertTriangle, Clock, FileText, Printer, Mail, 
  Check, ArrowRight, ShieldAlert, Award, FileSpreadsheet, ChevronRight, UserCheck, Trash2, HelpCircle,
  Menu, X, Phone, DollarSign, Send, Landmark, Download
} from 'lucide-react';

export default function Home() {
  const escapeHtml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const [db, setDb] = useState<DbState | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'contributions' | 'loans' | 'fines_expenses' | 'meetings_voting' | 'communication' | 'setup'>('landing');
  const [currentChamaId, setCurrentChamaId] = useState<string>('wema-savings-group-id');
  const [currentUserRole, setCurrentUserRole] = useState<'Chairperson' | 'Treasurer' | 'Secretary' | 'Member'>('Chairperson');
  const [currentMemberId, setCurrentMemberId] = useState<string>('m1'); // Defaults to Grace Kiputo (Chairperson)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // M-Pesa STK Push Simulation Modal State
  const [showStkModal, setShowStkModal] = useState<boolean>(false);
  const [stkMonth, setStkMonth] = useState<string>('');
  const [stkAmount, setStkAmount] = useState<number>(2000);
  const [stkMemberId, setStkMemberId] = useState<string>('');
  const [stkPhone, setStkPhone] = useState<string>('0712345678');
  const [stkPin, setStkPin] = useState<string>('');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'pending_pin' | 'processing' | 'success' | 'failed'>('idle');

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Expense | null>(null);

  // Meeting Attendance Temp State
  const [meetingAttendanceState, setMeetingAttendanceState] = useState<Record<string, 'present' | 'absent' | 'absent_with_apology'>>({});
  const [activeMeetingId, setActiveMeetingId] = useState<string>('');

  // Dividend Calculator State
  const [dividendSurplus, setDividendSurplus] = useState<number>(25000);
  const [calculatedDividends, setCalculatedDividends] = useState<{ memberId: string; name: string; savings: number; share: number; dividend: number }[]>([]);

  // WhatsApp Alert Generator State
  const [waTemplate, setWaTemplate] = useState<string>('savings');
  const [waMemberId, setWaMemberId] = useState<string>('m4');

  // Email Alerts State
  const [emailMemberId, setEmailMemberId] = useState<string>('m4');
  const [emailSending, setEmailSending] = useState<boolean>(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load state on mount
  useEffect(() => {
    setDb(getDbState());

    const handleUpdate = () => {
      setDb(getDbState());
    };
    window.addEventListener('chamavault_db_update', handleUpdate);
    return () => {
      window.removeEventListener('chamavault_db_update', handleUpdate);
    };
  }, []);

  const t = translations[lang];

  // Helper: Currency Formatter
  const formatKes = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Switch simulated role
  const handleRoleChange = (role: 'Chairperson' | 'Treasurer' | 'Secretary' | 'Member') => {
    setCurrentUserRole(role);
    if (!db) return;

    let memberId = 'm1'; // Grace Kiputo (Chairperson)
    if (role === 'Treasurer') memberId = 'm2'; // David Ochieng
    else if (role === 'Secretary') memberId = 'm3'; // Amina Yusuf
    else if (role === 'Member') memberId = 'm4'; // John Mwangi (Member)

    setCurrentMemberId(memberId);
    setStkMemberId(memberId);
    showToast(`${t.welcomeBack}, ${db.members.find(m => m.id === memberId)?.name} (${role})`);
  };

  // Reset database state to seed values
  const handleResetDb = () => {
    if (confirm('Are you sure you want to reset all data back to the original demo values? Any local edits will be lost.')) {
      const freshDb = resetDb();
      setDb(freshDb);
      setCurrentChamaId('wema-savings-group-id');
      setCurrentUserRole('Chairperson');
      setCurrentMemberId('m1');
      setCalculatedDividends([]);
      showToast('Database reset to original seed state.');
    }
  };

  // Active Chama
  const currentChama = useMemo(() => {
    if (!db) return null;
    return db.chamas.find(c => c.id === currentChamaId) || db.chamas[0] || null;
  }, [db, currentChamaId]);

  // Active Member details
  const activeMember = useMemo(() => {
    if (!db) return null;
    return db.members.find(m => m.id === currentMemberId) || null;
  }, [db, currentMemberId]);

  // Chama Members list
  const chamaMembers = useMemo(() => {
    if (!db) return [];
    return db.members.filter(m => m.chama_id === currentChamaId);
  }, [db, currentChamaId]);

  // Calculations
  const totalSavings = useMemo(() => {
    if (!db) return 0;
    return calculateTotalSavings(db, currentChamaId);
  }, [db, currentChamaId]);

  const activeLoansTotal = useMemo(() => {
    if (!db) return 0;
    return calculateActiveLoansTotal(db, currentChamaId);
  }, [db, currentChamaId]);

  const outstandingFines = useMemo(() => {
    if (!db) return 0;
    return db.fines
      .filter(f => f.chama_id === currentChamaId && f.status === 'pending')
      .reduce((sum, f) => sum + f.amount, 0);
  }, [db, currentChamaId]);

  const totalExpenses = useMemo(() => {
    if (!db) return 0;
    return db.expenses
      .filter(e => e.chama_id === currentChamaId)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [db, currentChamaId]);

  const activeResolutionsCount = useMemo(() => {
    if (!db) return 0;
    return db.votes.filter(v => v.chama_id === currentChamaId && v.status === 'active').length;
  }, [db, currentChamaId]);

  const nextMeeting = useMemo(() => {
    if (!db) return null;
    const scheduled = db.meetings.filter(m => m.chama_id === currentChamaId && m.status === 'scheduled');
    return scheduled.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [db, currentChamaId]);

  // Member-specific total savings
  const getMemberSavings = (memberId: string) => {
    if (!db) return 0;
    return calculateMemberSavings(db, currentChamaId, memberId);
  };

  // Recent activity logs compiled and sorted
  const recentActivities = useMemo(() => {
    if (!db) return [];
    const activities: { id: string; type: string; desc: string; date: string; amount?: number }[] = [];

    // Add contributions
    db.contributions.filter(c => c.chama_id === currentChamaId && c.status === 'paid').forEach(c => {
      const m = db.members.find(mem => mem.id === c.member_id);
      const isDividend = c.remarks?.includes('Dividend');
      activities.push({
        id: `act-contrib-${c.id}`,
        type: isDividend ? 'dividend' : 'contribution',
        desc: isDividend 
          ? `${m?.name || 'Member'} received dividend payout`
          : `${m?.name || 'Member'} saved KES for ${c.contribution_date}`,
        date: c.created_at || c.contribution_date,
        amount: isDividend ? Math.abs(c.amount) : c.amount
      });
    });

    // Add approved loans
    db.loans.filter(l => l.chama_id === currentChamaId).forEach(l => {
      const m = db.members.find(mem => mem.id === l.member_id);
      activities.push({
        id: `act-loan-${l.id}`,
        type: 'loan',
        desc: `${m?.name || 'Member'} applied KES loan (${l.status})`,
        date: l.created_at,
        amount: l.amount
      });
    });

    // Add repayments
    db.repayments.forEach(r => {
      const l = db.loans.find(loan => loan.id === r.loan_id);
      if (l && l.chama_id === currentChamaId) {
        const m = db.members.find(mem => mem.id === l.member_id);
        activities.push({
          id: `act-repay-${r.id}`,
          type: 'repayment',
          desc: `${m?.name || 'Member'} repaid loan KES`,
          date: r.created_at || r.repayment_date,
          amount: r.amount
        });
      }
    });

    // Add fines paid
    db.fines.filter(f => f.chama_id === currentChamaId && f.status === 'paid').forEach(f => {
      const m = db.members.find(mem => mem.id === f.member_id);
      activities.push({
        id: `act-fine-${f.id}`,
        type: 'fine',
        desc: `${m?.name || 'Member'} paid late fee of KES`,
        date: f.paid_date || f.created_at,
        amount: f.amount
      });
    });

    // Add expenses
    db.expenses.filter(e => e.chama_id === currentChamaId).forEach(e => {
      activities.push({
        id: `act-expense-${e.id}`,
        type: 'expense',
        desc: `Operating Expense: ${e.description}`,
        date: e.created_at || e.date,
        amount: e.amount
      });
    });

    // Sort descending by date
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [db, currentChamaId]);

  // STK Sandbox Triggers
  const triggerStkPush = (month: string, amount: number, memberId: string) => {
    setStkMonth(month);
    setStkAmount(amount);
    setStkMemberId(memberId);
    setStkStatus('pending_pin');
    setShowStkModal(true);
  };

  const handleStkSubmit = () => {
    if (!db || !stkMonth || !stkMemberId || !stkAmount) return;
    if (stkAmount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }
    if (!stkPin || stkPin.length < 4) {
      showToast('Please enter your 4-digit PIN', 'error');
      return;
    }
    setStkStatus('processing');

    setTimeout(() => {
      const existingIndex = db.contributions.findIndex(
        c => c.member_id === stkMemberId && c.contribution_date === stkMonth && c.chama_id === currentChamaId
      );

      const newContribution: Contribution = {
        id: existingIndex >= 0 ? db.contributions[existingIndex].id : `c-${stkMemberId}-${stkMonth}-${Date.now()}`,
        chama_id: currentChamaId,
        member_id: stkMemberId,
        amount: stkAmount,
        contribution_date: stkMonth,
        status: 'paid',
        payment_method: 'M-Pesa',
        transaction_reference: `MPESA-STK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        remarks: 'Paid via sandbox STK push',
        created_at: new Date().toISOString(),
      };

      let updatedContributions;
      if (existingIndex >= 0) {
        updatedContributions = db.contributions.map((c, i) => i === existingIndex ? newContribution : c);
      } else {
        updatedContributions = [...db.contributions, newContribution];
      }

      const newDb = {
        ...db,
        contributions: updatedContributions
      };

      saveDbState(newDb);
      setDb(newDb);
      setStkStatus('success');
      showToast(t.paymentSuccess);
      setTimeout(() => {
        setShowStkModal(false);
        setStkStatus('idle');
        setStkPin('');
      }, 1500);
    }, 1500);
  };

  // Manual contribution logging by Treasurer
  const handleManualContribution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('member_id') as string;
    const month = formData.get('month') as string;
    const amt = Number(formData.get('amount'));
    const payMethod = formData.get('payment_method') as any;
    const ref = formData.get('reference') as string;
    const remarks = formData.get('remarks') as string;

    if (!mId || !month || !amt) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (amt <= 0) {
      showToast('Contribution amount must be greater than zero', 'error');
      return;
    }

    const existingIdx = db.contributions.findIndex(
      c => c.member_id === mId && c.contribution_date === month && c.chama_id === currentChamaId
    );

    const contributionRecord: Contribution = {
      id: existingIdx >= 0 ? db.contributions[existingIdx].id : `c-${mId}-${month}-${Date.now()}`,
      chama_id: currentChamaId,
      member_id: mId,
      amount: amt,
      contribution_date: month,
      status: 'paid',
      payment_method: payMethod,
      transaction_reference: ref || `REF-${Date.now()}`,
      remarks: remarks || 'Treasurer logged contribution',
      created_at: new Date().toISOString()
    };

    let updatedContributions;
    if (existingIdx >= 0) {
      updatedContributions = db.contributions.map((c, i) => i === existingIdx ? contributionRecord : c);
    } else {
      updatedContributions = [...db.contributions, contributionRecord];
    }

    const newDb = {
      ...db,
      contributions: updatedContributions
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast('Member contribution recorded successfully!');
    e.currentTarget.reset();
  };

  // Issue Fines (Treasurer)
  const handleIssueFine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('member_id') as string;
    const amt = Number(formData.get('amount'));
    const reason = formData.get('reason') as string;
    const issueDate = formData.get('issue_date') as string;

    if (!mId || !amt || !reason || !issueDate) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (amt <= 0) {
      showToast('Fine amount must be greater than zero', 'error');
      return;
    }

    const newFine: Fine = {
      id: `f-${Date.now()}`,
      chama_id: currentChamaId,
      member_id: mId,
      amount: amt,
      reason,
      issue_date: issueDate,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const newDb = {
      ...db,
      fines: [...db.fines, newFine]
    };
    saveDbState(newDb);
    setDb(newDb);
    showToast(`Fine of ${formatKes(amt)} issued successfully to member!`);
    e.currentTarget.reset();
  };

  // Pay Fine (Member / Treasurer)
  const handlePayFine = (fineId: string) => {
    if (!db) return;
    const fineIdx = db.fines.findIndex(f => f.id === fineId);
    if (fineIdx === -1) return;

    const updatedFines = db.fines.map((f, i) => i === fineIdx ? {
      ...f,
      status: 'paid' as const,
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: 'M-Pesa' as const,
      transaction_reference: `MPESA-FINE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    } : f);

    const newDb = {
      ...db,
      fines: updatedFines
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast('Fine paid successfully via simulated M-Pesa!');
  };

  // Record Operating Expenses (Treasurer)
  const handleLogExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const amt = Number(formData.get('amount'));
    const category = formData.get('category') as any;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const receiptMock = formData.get('receipt_mock') as string;

    if (!amt || !category || !description || !date) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (amt <= 0) {
      showToast('Expense amount must be greater than zero', 'error');
      return;
    }

    if (receiptMock && !/^https?:\/\//i.test(receiptMock)) {
      showToast('Receipt URL must start with http:// or https://', 'error');
      return;
    }

    const newExpense: Expense = {
      id: `e-${Date.now()}`,
      chama_id: currentChamaId,
      amount: amt,
      category,
      description,
      date,
      receipt_url: receiptMock || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=300&auto=format&fit=crop',
      recorded_by: currentMemberId,
      created_at: new Date().toISOString()
    };

    const newDb = {
      ...db,
      expenses: [...db.expenses, newExpense]
    };
    saveDbState(newDb);
    setDb(newDb);
    showToast(`Expense of ${formatKes(amt)} logged successfully!`);
    e.currentTarget.reset();
  };

  // Submit Loan Application (Member)
  const handleApplyLoan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const amt = Number(formData.get('amount'));
    const termMonths = Number(formData.get('term_months'));
    const interestRate = Number(formData.get('interest_rate') || 10);

    if (!amt || !termMonths) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (amt <= 0) {
      showToast('Loan amount must be greater than zero', 'error');
      return;
    }

    if (termMonths <= 0) {
      showToast('Term months must be greater than zero', 'error');
      return;
    }

    if (interestRate < 0) {
      showToast('Interest rate cannot be negative', 'error');
      return;
    }

    const eligibility = checkLoanEligibility(db, currentChamaId, currentMemberId, amt);

    if (!eligibility.eligible) {
      showToast(`Loan application denied: Requested amount exceeds 3x savings limit of ${formatKes(eligibility.maxLimit)}`, 'error');
      return;
    }

    const newLoan: Loan = {
      id: `l-${Date.now()}`,
      chama_id: currentChamaId,
      member_id: currentMemberId,
      amount: amt,
      interest_rate: interestRate,
      term_months: termMonths,
      status: 'pending',
      application_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const newDb = {
      ...db,
      loans: [...db.loans, newLoan]
    };
    saveDbState(newDb);
    setDb(newDb);
    showToast(`Loan application of ${formatKes(amt)} submitted successfully!`);
    e.currentTarget.reset();
  };

  // Chairperson Loan Approval Flow
  const handleLoanApproval = (loanId: string, approve: boolean) => {
    if (!db) return;
    const loanIdx = db.loans.findIndex(l => l.id === loanId);
    if (loanIdx === -1) return;

    const updatedLoans = db.loans.map((l, i) => i === loanIdx ? {
      ...l,
      status: approve ? ('active' as const) : ('rejected' as const),
      approval_date: approve ? new Date().toISOString().split('T')[0] : undefined
    } : l);

    const newDb = {
      ...db,
      loans: updatedLoans
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast(approve ? 'Loan application approved and activated!' : 'Loan application rejected.');
  };

  // Loan Repayment (Treasurer or Member)
  const handleLoanRepayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const loanId = formData.get('loan_id') as string;
    const amt = Number(formData.get('amount'));
    const ref = formData.get('reference') as string;
    const paymentMethod = formData.get('payment_method') as string;

    if (!loanId || !amt) {
      showToast('Please select loan and enter amount', 'error');
      return;
    }

    if (amt <= 0) {
      showToast('Repayment amount must be greater than zero', 'error');
      return;
    }

    const activeLoan = db.loans.find(l => l.id === loanId);
    if (!activeLoan) return;

    const remaining = calculateSingleLoanBalance(db, loanId);

    if (amt > remaining + 1) {
      showToast(`Amount exceeds outstanding loan balance of ${formatKes(remaining)}`, 'error');
      return;
    }

    const newRepayment: LoanRepayment = {
      id: `lr-${Date.now()}`,
      loan_id: loanId,
      amount: amt,
      repayment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      transaction_reference: ref || `MPESA-REPAY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      created_at: new Date().toISOString()
    };

    let updatedLoans = db.loans;
    if (Math.abs(remaining - amt) < 0.1 || amt >= remaining) {
      const lIdx = db.loans.findIndex(l => l.id === loanId);
      if (lIdx !== -1) {
        updatedLoans = db.loans.map((l, i) => i === lIdx ? { ...l, status: 'fully_paid' as const } : l);
      }
      showToast('Loan is now fully repaid! Congratulations!');
    } else {
      showToast(`Repayment of ${formatKes(amt)} recorded successfully!`);
    }

    const newDb = {
      ...db,
      repayments: [...db.repayments, newRepayment],
      loans: updatedLoans
    };

    saveDbState(newDb);
    setDb(newDb);
    e.currentTarget.reset();
  };

  // Dividend Splits Engine
  const calculateDividendSplits = () => {
    if (!db) return;
    const totalChamaSavings = calculateTotalSavings(db, currentChamaId);

    if (totalChamaSavings === 0) {
      showToast('No member savings found. Cannot compute dividends.', 'error');
      return;
    }

    const splits = computeDividendSplits(db, currentChamaId, dividendSurplus);

    setCalculatedDividends(splits);
    showToast('Dividend splits calculated successfully!');
  };

  // Distribute Dividends and log to contributions
  const handleDistributeDividends = () => {
    if (!db || calculatedDividends.length === 0) return;
    
    if (currentUserRole !== 'Treasurer' && currentUserRole !== 'Chairperson') {
      showToast('Only Chairperson or Treasurer can distribute dividends', 'error');
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const monthStr = dateStr.slice(0, 7);

    const newContributions: Contribution[] = calculatedDividends.map(div => ({
      id: `div-payout-${div.memberId}-${Date.now()}-${Math.random()}`,
      chama_id: currentChamaId,
      member_id: div.memberId,
      amount: div.dividend,
      contribution_date: monthStr,
      status: 'paid',
      payment_method: 'M-Pesa',
      transaction_reference: `DIV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      remarks: `Dividend: Distributed from surplus KES ${formatKes(dividendSurplus)}`,
      created_at: new Date().toISOString()
    }));

    const newDb = {
      ...db,
      contributions: [...db.contributions, ...newContributions]
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast(`Successfully distributed ${formatKes(dividendSurplus)} in dividends to all members!`);
    setCalculatedDividends([]);
  };

  // Schedule New Meeting (Secretary)
  const handleScheduleMeeting = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const date = formData.get('date') as string;
    const location = formData.get('location') as string;

    if (!title || !date || !location) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const newMeeting: Meeting = {
      id: `mt-${Date.now()}`,
      chama_id: currentChamaId,
      title,
      date,
      location,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    const newDb = {
      ...db,
      meetings: [...db.meetings, newMeeting]
    };
    saveDbState(newDb);
    setDb(newDb);
    showToast(`Meeting "${title}" scheduled successfully!`);
    e.currentTarget.reset();
  };

  // Save Attendance & Minutes (Secretary)
  const handleSaveAttendance = (meetingId: string) => {
    if (!db) return;
    const baseAttendance = db.attendance.filter(a => a.meeting_id !== meetingId);
    const newAttendanceRecords = Object.entries(meetingAttendanceState).map(([mId, status]) => ({
      id: `a-${meetingId}-${mId}-${Date.now()}-${Math.random()}`,
      meeting_id: meetingId,
      member_id: mId,
      status
    }));

    const newDb = {
      ...db,
      attendance: [...baseAttendance, ...newAttendanceRecords]
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast('Meeting attendance list saved successfully!');
  };

  const handleSaveMinutes = (meetingId: string, minutes: string) => {
    if (!db) return;
    const mtIdx = db.meetings.findIndex(m => m.id === meetingId);
    if (mtIdx === -1) return;

    const updatedMeetings = db.meetings.map((m, idx) => idx === mtIdx ? {
      ...m,
      minutes,
      status: 'completed' as const
    } : m);

    const newDb = {
      ...db,
      meetings: updatedMeetings
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast('Meeting minutes saved and meeting marked as completed!');
  };

  // PDF / Print minutes redirect
  const handlePrintMinutes = (meeting: Meeting) => {
    if (!db) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Failed to open print preview. Check pop-up blockers.', 'error');
      return;
    }

    const mAttendance = db.attendance.filter(a => a.meeting_id === meeting.id);
    const presentNames = mAttendance
      .filter(a => a.status === 'present')
      .map(a => db.members.find(m => m.id === a.member_id)?.name)
      .filter(Boolean)
      .map(name => escapeHtml(name || ''))
      .join(', ');

    const absentNames = mAttendance
      .filter(a => a.status !== 'present')
      .map(a => {
        const name = db.members.find(m => m.id === a.member_id)?.name;
        const type = a.status === 'absent_with_apology' ? 'Apology' : 'Absent';
        return `${escapeHtml(name || '')} (${type})`;
      })
      .filter(Boolean)
      .join(', ');

    const html = `
      <html>
        <head>
          <title>Minutes - ${escapeHtml(meeting.title)}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            .header { border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .header h1 { margin: 0; color: #0a0900; }
            .header p { margin: 5px 0 0 0; color: #666; font-style: italic; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #fdfaf2; padding: 15px; border-radius: 4px; border: 1px solid #e5e0d0; }
            .meta-label { font-weight: bold; color: #555; }
            .section { margin-bottom: 25px; }
            .section h2 { border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #333; margin-top: 0; }
            .minutes-body { white-space: pre-wrap; font-size: 15px; color: #222; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(currentChama?.name || 'Wema Savings Group')}</h1>
            <p>Official Meeting Minutes Record</p>
          </div>
          <div class="meta-grid">
            <div>
              <span class="meta-label">Meeting Title:</span> ${escapeHtml(meeting.title)}<br/>
              <span class="meta-label">Date:</span> ${escapeHtml(new Date(meeting.date).toLocaleString())}
            </div>
            <div>
              <span class="meta-label">Location:</span> ${escapeHtml(meeting.location)}<br/>
              <span class="meta-label">Status:</span> ${escapeHtml(meeting.status.toUpperCase())}
            </div>
          </div>
          <div class="section">
            <h2>Attendance</h2>
            <p><strong>Present:</strong> ${presentNames || 'None recorded'}</p>
            <p><strong>Absent/Apologies:</strong> ${absentNames || 'None recorded'}</p>
          </div>
          <div class="section">
            <h2>Meeting Proceedings & Minutes</h2>
            <div class="minutes-body">${escapeHtml(meeting.minutes || 'No minutes entered yet.')}</div>
          </div>
          <div class="footer">
            Generated automatically by ChamaVault - Secure Digital Ledger Services on ${escapeHtml(new Date().toLocaleDateString())}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Create Resolution Vote
  const handleCreateResolution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const endDate = formData.get('end_date') as string;

    if (!title || !description || !endDate) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const newResolution: Vote = {
      id: `v-${Date.now()}`,
      chama_id: currentChamaId,
      title,
      description,
      end_date: endDate,
      status: 'active',
      created_at: new Date().toISOString()
    };

    const newDb = {
      ...db,
      votes: [...db.votes, newResolution]
    };
    saveDbState(newDb);
    setDb(newDb);
    showToast(`Voting resolution "${title}" has been published!`);
    e.currentTarget.reset();
  };

  // Cast Vote
  const handleCastVote = (voteId: string, choice: 'yes' | 'no' | 'abstain') => {
    if (!db) return;
    const existingIdx = db.voteRecords.findIndex(
      vr => vr.vote_id === voteId && vr.member_id === currentMemberId
    );

    const voteRecord: VoteRecord = {
      id: existingIdx >= 0 ? db.voteRecords[existingIdx].id : `vr-${Date.now()}`,
      vote_id: voteId,
      member_id: currentMemberId,
      choice,
      cast_at: new Date().toISOString()
    };

    let updatedVoteRecords;
    if (existingIdx >= 0) {
      updatedVoteRecords = db.voteRecords.map((vr, i) => i === existingIdx ? voteRecord : vr);
    } else {
      updatedVoteRecords = [...db.voteRecords, voteRecord];
    }

    const newDb = {
      ...db,
      voteRecords: updatedVoteRecords
    };

    saveDbState(newDb);
    setDb(newDb);
    showToast(`Your vote "${choice.toUpperCase()}" has been cast successfully!`);
  };

  // WhatsApp template renderer
  const getWhatsAppMessage = (template: string, memberId: string) => {
    if (!db) return '';
    const member = db.members.find(m => m.id === memberId);
    if (!member) return '';

    const formattedLimit = formatKes(2000);
    const chamaName = currentChama?.name || 'Chama';

    if (template === 'savings') {
      return `Habari ${member.name}, hili ni kikumbusho cha kirafiki kutoka ${chamaName} kulipa mchango wako wa akiba wa kila mwezi wa ${formattedLimit}. Tafadhali fanya malipo yako kupitia M-Pesa. Ahsante!`;
    } else if (template === 'overdue') {
      return `Ilani ya Haraka: Habari ${member.name}, una mchango wa akiba uliochelewa kutoka ${chamaName} wa ${formattedLimit}. Tafadhali lipa haraka iwezekanavyo ili kuepuka faini. Ahsante!`;
    } else if (template === 'fine') {
      const pendingFines = db.fines.filter(f => f.member_id === memberId && f.status === 'pending');
      const totalFineAmount = pendingFines.reduce((sum, f) => sum + f.amount, 0);
      const reasons = pendingFines.map(f => f.reason).join(', ');
      return `Ilani ya Faini: Habari ${member.name}, una faini ambayo haijalipwa ya jumla ya ${formatKes(totalFineAmount)} kwa: "${reasons || 'Ukiukaji wa kanuni'}". Tafadhali fanya malipo sasa. Ahsante!`;
    }
    return '';
  };

  const handleWhatsAppRedirect = () => {
    const msg = getWhatsAppMessage(waTemplate, waMemberId);
    const encoded = encodeURIComponent(msg);
    const phone = `25470000000${waMemberId.replace('m', '')}`;
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  // Email Mock Dispatcher
  const handleSendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const mId = formData.get('member_id') as string;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;

    if (!mId || !subject || !body) {
      showToast('Please fill in all email fields', 'error');
      return;
    }

    const member = db.members.find(m => m.id === mId);
    if (!member) return;

    setEmailSending(true);

    setTimeout(() => {
      setEmailSending(false);
      showToast(`${t.emailSentToast} sent to ${member.email}`);
      e.currentTarget.reset();
    }, 1000);
  };

  // Chama Setup Wizard
  const handleCreateChama = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const desc = formData.get('description') as string;
    const minContrib = Number(formData.get('min_contribution') || 2000);
    const interestRate = Number(formData.get('interest_rate') || 10);
    const foundingEmailsStr = formData.get('founding_members') as string;

    if (!name || !desc) {
      showToast('Please enter Chama name and description', 'error');
      return;
    }

    const newChamaId = `chama-${Date.now()}`;
    const newChama: Chama = {
      id: newChamaId,
      name,
      description: desc,
      created_at: new Date().toISOString(),
      currency: 'KES',
      status: 'active'
    };

    const newMembers: ChamaMember[] = [
      {
        id: `m-chair-${Date.now()}`,
        chama_id: newChamaId,
        name: 'Grace Kiputo (Founder)',
        email: 'grace.kiputo@gmail.com',
        role: 'Chairperson',
        joined_at: new Date().toISOString()
      }
    ];

    if (foundingEmailsStr) {
      const emails = foundingEmailsStr.split(',').map(e => e.trim()).filter(Boolean);
      emails.forEach((email, idx) => {
        let role: ChamaMember['role'] = 'Member';
        let nameStr = `Founding Member ${idx + 1}`;
        if (idx === 0) {
          role = 'Treasurer';
          nameStr = 'David Treasurer';
        } else if (idx === 1) {
          role = 'Secretary';
          nameStr = 'Amina Secretary';
        }

        newMembers.push({
          id: `m-found-${idx}-${Date.now()}`,
          chama_id: newChamaId,
          name: nameStr,
          email,
          role,
          joined_at: new Date().toISOString()
        });
      });
    }

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const initialContributions: Contribution[] = newMembers.map(m => ({
      id: `c-${m.id}-${currentMonthStr}`,
      chama_id: newChamaId,
      member_id: m.id,
      amount: minContrib,
      contribution_date: currentMonthStr,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const newDb = {
      ...db,
      chamas: [...db.chamas, newChama],
      members: [...db.members, ...newMembers],
      contributions: [...db.contributions, ...initialContributions]
    };

    saveDbState(newDb);
    setDb(newDb);
    setCurrentChamaId(newChamaId);

    // Switch to founder role
    setCurrentUserRole('Chairperson');
    setCurrentMemberId(newMembers[0].id);

    showToast(`Chama "${name}" successfully initialized!`);
    setCurrentTab('dashboard');
    e.currentTarget.reset();
  };

  // Safe Guard loading state
  if (!db) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0900] text-[#f59e0b]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-t-transparent border-[#f59e0b] rounded-full animate-spin"></div>
          <p className="text-lg font-semibold tracking-widest uppercase">Loading ChamaVault...</p>
        </div>
      </div>
    );
  }

  // RENDER LANDING PAGE VIEW
  if (currentTab === 'landing') {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0900] text-gray-100 font-sans">
        {/* Navigation */}
        <header className="sticky top-0 z-40 bg-[#14120a]/90 backdrop-blur-md border-b border-[#2a2510] px-4 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#f59e0b] rounded-lg text-black">
                <Coins className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Chama<span className="text-[#f59e0b]">Vault</span></span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <button 
                onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-[#2a2510] hover:border-[#f59e0b] transition bg-[#14120a]"
              >
                <span className="text-sm font-semibold uppercase">{lang}</span>
              </button>

              <button 
                onClick={() => setCurrentTab('dashboard')}
                className="bg-[#f59e0b] text-black font-semibold px-5 py-2 rounded-lg hover:bg-[#d97706] transition flex items-center space-x-2 text-sm shadow-md"
              >
                <span>{t.enterDashboard}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative px-4 py-20 lg:py-32 overflow-hidden bg-radial-gradient">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center space-x-2 bg-[#14120a] border border-[#2a2510] px-4 py-2 rounded-full mb-6">
              <Award className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-xs lg:text-sm font-medium text-gray-300">{t.slogan}</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              {lang === 'en' ? (
                <>Manage Your <span className="text-[#f59e0b]">Chama</span> Better</>
              ) : (
                <>Simamia <span className="text-[#f59e0b]">Chama Yako</span> Vizuri</>
              )}
            </h1>

            <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              {t.tagline}. Automate your contribution ledgers, streamline member loans with compliance safeguards, organize meetings, and cast democratic votes. Enjoy a modern kanga-inspired dark gold interface with native M-Pesa friendly tools.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setCurrentTab('dashboard')}
                className="w-full sm:w-auto bg-[#f59e0b] text-black font-bold px-8 py-4 rounded-xl hover:bg-[#d97706] transition text-base shadow-lg shadow-yellow-900/20"
              >
                {t.enterDashboard}
              </button>
              <a 
                href="https://wa.me/254700000000?text=Hello%20ChamaVault%2C%20I%20would%20like%20to%20request%20a%20demo%20of%20the%20ChamaVault%20portal%21" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl transition text-base shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2"
              >
                <Phone className="w-5 h-5 shrink-0" />
                <span>{lang === 'en' ? 'Demo via WhatsApp' : 'Majaribio kupitia WhatsApp'}</span>
              </a>
              <button 
                onClick={() => {
                  const el = document.getElementById('pricing');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto bg-[#14120a] border border-[#2a2510] hover:border-[#f59e0b] text-white px-8 py-4 rounded-xl transition text-base"
              >
                {t.learnMore}
              </button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-4 py-16 bg-[#14120a]/60 border-y border-[#2a2510]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Core Digital Chama Infrastructure</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Everything you need to digitize, secure, and grow your local investment group or savings chama.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-[#14120a] border border-[#2a2510] p-8 rounded-2xl hover:border-[#f59e0b]/40 transition">
                <div className="p-3 bg-[#2a2510] text-[#f59e0b] rounded-xl w-fit mb-6">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Interactive Savings Ledger</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Real-time member contribution matrix (Paid, Pending, Overdue grid). Simulates sandbox M-Pesa STK push payments with instant receipts.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#14120a] border border-[#2a2510] p-8 rounded-2xl hover:border-[#f59e0b]/40 transition">
                <div className="p-3 bg-[#2a2510] text-[#f59e0b] rounded-xl w-fit mb-6">
                  <HandCoins className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Compliance & Loan Engine</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Prevents risky borrowings with a hard-coded 3x savings limit validation. Features chairperson approval flows and annual dividend split calculations.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#14120a] border border-[#2a2510] p-8 rounded-2xl hover:border-[#f59e0b]/40 transition">
                <div className="p-3 bg-[#2a2510] text-[#f59e0b] rounded-xl w-fit mb-6">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Meetings & Resolutions</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Plan upcoming meetings, record roll-call attendance, write meeting minutes with styled PDF export, and vote on community resolutions democratically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="px-4 py-20 bg-[#0a0900]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">{t.pricingTitle}</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">{t.pricingSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Plan 1 */}
              <div className="bg-[#14120a] border border-[#2a2510] rounded-2xl p-8 flex flex-col justify-between hover:border-[#f59e0b]/30 transition relative">
                <div>
                  <h3 className="text-lg font-bold text-[#f59e0b] mb-2">{t.basicPlan}</h3>
                  <p className="text-gray-400 text-xs mb-6">{t.basicDesc}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-white">{formatKes(500)}</span>
                    <span className="text-gray-500 text-sm">{t.billedMonthly}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Up to 15 Members</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Savings Contributions Ledger</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>WhatsApp Reminders</span>
                    </li>
                  </ul>
                </div>
                <button onClick={() => setCurrentTab('dashboard')} className="w-full bg-transparent hover:bg-[#2a2510] text-[#f59e0b] border border-[#2a2510] font-semibold py-3 rounded-xl transition text-sm">
                  {t.getStarted}
                </button>
              </div>

              {/* Plan 2 */}
              <div className="bg-[#14120a] border-2 border-[#f59e0b] rounded-2xl p-8 flex flex-col justify-between hover:border-[#f59e0b] transition relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f59e0b] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">{t.midPlan}</h3>
                  <p className="text-gray-400 text-xs mb-6">{t.midDesc}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-white">{formatKes(1000)}</span>
                    <span className="text-gray-500 text-sm">{t.billedMonthly}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Up to 40 Members</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Advanced Loan Management</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Resolutions & Voting engine</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Meeting Attendance & Minutes</span>
                    </li>
                  </ul>
                </div>
                <button onClick={() => setCurrentTab('dashboard')} className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-sm shadow-md">
                  {t.getStarted}
                </button>
              </div>

              {/* Plan 3 */}
              <div className="bg-[#14120a] border border-[#2a2510] rounded-2xl p-8 flex flex-col justify-between hover:border-[#f59e0b]/30 transition relative">
                <div>
                  <h3 className="text-lg font-bold text-[#f59e0b] mb-2">{t.premiumPlan}</h3>
                  <p className="text-gray-400 text-xs mb-6">{t.premiumDesc}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-white">{formatKes(2000)}</span>
                    <span className="text-gray-500 text-sm">{t.billedMonthly}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-sm text-gray-300">
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Unlimited Members</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Dividend Split Calculations</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>Resend Transactional Emails</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#f59e0b]" />
                      <span>24/7 Premium Support</span>
                    </li>
                  </ul>
                </div>
                <button onClick={() => setCurrentTab('dashboard')} className="w-full bg-transparent hover:bg-[#2a2510] text-[#f59e0b] border border-[#2a2510] font-semibold py-3 rounded-xl transition text-sm">
                  {t.getStarted}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#2a2510] bg-[#14120a]/80 py-12 px-4 text-center mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
            <p>© 2026 ChamaVault Platform. All Rights Reserved. Built for modern African community banking.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <span className="text-[#f59e0b]">KES standard formats verified</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // RENDER APP SHELL (DASHBOARD & MANAGEMENT CHANNELS)
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0900] text-gray-100 font-sans pb-24">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl transition duration-300 border ${
          toast.type === 'error' ? 'bg-red-950 border-red-800 text-red-200' : 'bg-[#14120a] border-[#f59e0b] text-white'
        }`}>
          {toast.type === 'error' ? <ShieldAlert className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-[#f59e0b]" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* STK Push M-Pesa Modal */}
      {showStkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14120a] border border-[#f59e0b]/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-pulse-gold">
            <div className="flex items-center justify-between mb-4 border-b border-[#2a2510] pb-3">
              <div className="flex items-center space-x-2">
                <span className="bg-[#f59e0b] text-black text-xs font-bold px-2 py-0.5 rounded">M-PESA</span>
                <h3 className="font-bold text-white">{t.stkPushTitle}</h3>
              </div>
              <button onClick={() => setShowStkModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {stkStatus === 'pending_pin' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">{t.stkPushDesc}</p>
                <div className="bg-[#0a0900] p-4 rounded-xl text-center border border-[#2a2510]">
                  <p className="text-xs text-gray-500">RECIPIENT</p>
                  <p className="font-bold text-white text-base">{currentChama?.name}</p>
                  <p className="text-xs text-gray-500 mt-2">AMOUNT DUE</p>
                  <p className="font-extrabold text-[#f59e0b] text-2xl">{formatKes(stkAmount)}</p>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Enter 4-Digit M-Pesa Sandbox PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={stkPin}
                    onChange={(e) => setStkPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-widest text-2xl font-bold bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button onClick={() => setShowStkModal(false)} className="flex-1 border border-[#2a2510] hover:bg-[#2a2510] py-2.5 rounded-xl text-sm font-semibold transition">{t.cancelling}</button>
                  <button onClick={handleStkSubmit} className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-2.5 rounded-xl text-sm transition">{t.approvePayment}</button>
                </div>
              </div>
            )}

            {stkStatus === 'processing' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="w-10 h-10 border-4 border-t-transparent border-[#f59e0b] rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-300">{t.processingPayment}</p>
              </div>
            )}

            {stkStatus === 'success' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="p-3 bg-green-950 rounded-full border border-green-700">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-bold text-white text-lg">Transaction Approved</h4>
                <p className="text-xs text-gray-400">{t.paymentSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#14120a] border border-[#2a2510] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#2a2510] px-6 py-4 flex items-center justify-between border-b border-[#f59e0b]/20">
              <span className="font-bold text-white">Chama Operating Voucher</span>
              <button onClick={() => setActiveReceipt(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-6 text-sm text-gray-300">
              {/* Receipt Layout */}
              <div className="border border-[#2a2510] rounded-xl p-5 bg-[#0a0900] space-y-4">
                <div className="text-center border-b border-[#2a2510] pb-3">
                  <h4 className="text-[#f59e0b] font-bold text-lg">{currentChama?.name}</h4>
                  <p className="text-xs text-gray-500">Official Operating Expense Receipt</p>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-gray-500">Voucher ID:</span>
                  <span className="text-right font-mono text-white">{activeReceipt.id}</span>

                  <span className="text-gray-500">Date Recorded:</span>
                  <span className="text-right text-white">{activeReceipt.date}</span>

                  <span className="text-gray-500">Category:</span>
                  <span className="text-right text-white capitalize">{activeReceipt.category}</span>

                  <span className="text-gray-500">Recorded By:</span>
                  <span className="text-right text-white">
                    {db.members.find(m => m.id === activeReceipt.recorded_by)?.name || 'Treasurer'}
                  </span>
                </div>

                <div className="border-t border-dashed border-[#2a2510] pt-3">
                  <p className="text-xs text-gray-500 mb-1">Description:</p>
                  <p className="text-white bg-[#14120a] p-2.5 rounded-lg border border-[#2a2510]">{activeReceipt.description}</p>
                </div>

                <div className="border-t border-[#2a2510] pt-3 flex items-center justify-between font-bold">
                  <span className="text-white text-base">TOTAL PAID:</span>
                  <span className="text-[#f59e0b] text-xl">{formatKes(activeReceipt.amount)}</span>
                </div>
              </div>

              {activeReceipt.receipt_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Simulated Receipt Image Attachment:</p>
                  <div className="relative rounded-lg overflow-hidden h-40 bg-[#0a0900] border border-[#2a2510] flex items-center justify-center">
                    <img 
                      src={activeReceipt.receipt_url} 
                      alt="receipt image" 
                      className="w-full h-full object-cover opacity-60 hover:opacity-100 transition duration-300"
                    />
                    <div className="absolute bg-black/60 px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-[#2a2510]">
                      Mock Upload Verified
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#0a0900] px-6 py-4 border-t border-[#2a2510] flex justify-end">
              <button 
                onClick={() => {
                  window.print();
                }}
                className="bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Header */}
      <header className="sticky top-0 z-30 bg-[#14120a]/90 backdrop-blur-md border-b border-[#2a2510] px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('landing')}>
            <div className="p-2 bg-[#f59e0b] rounded-lg text-black">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Chama<span className="text-[#f59e0b]">Vault</span></span>
          </div>

          {/* Chama Selector */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs text-gray-500">Group Vault:</span>
            <select 
              value={currentChamaId}
              onChange={(e) => {
                setCurrentChamaId(e.target.value);
                // Adjust default roles / members matching the selected chama
                if (e.target.value === 'wema-savings-group-id') {
                  setCurrentMemberId('m1');
                  setCurrentUserRole('Chairperson');
                } else {
                  // Newly created chama -> founder is Chairperson
                  const firstMem = db.members.find(m => m.chama_id === e.target.value && m.role === 'Chairperson');
                  if (firstMem) {
                    setCurrentMemberId(firstMem.id);
                    setCurrentUserRole('Chairperson');
                  }
                }
              }}
              className="bg-[#0a0900] border border-[#2a2510] text-[#f59e0b] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#f59e0b]"
            >
              {db.chamas.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentTab('landing')}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-[#2a2510] hover:border-gray-500 transition"
            >
              Portal Exit
            </button>

            <button 
              onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#2a2510] hover:border-[#f59e0b] transition bg-[#14120a] text-xs font-bold uppercase"
            >
              {lang}
            </button>

            <button 
              onClick={handleResetDb}
              title="Reset Database to Seed State"
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-2.5 py-2 border border-red-950/60 rounded-lg hover:bg-red-950/20"
            >
              Reset Demo
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 border border-[#2a2510] rounded-lg text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace layout */}
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row flex-1 px-4 lg:px-8 py-6 gap-6">
        
        {/* Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: t.tabDashboard, icon: Users },
              { id: 'contributions', label: t.tabContributions, icon: Coins },
              { id: 'loans', label: t.tabLoans, icon: HandCoins },
              { id: 'fines_expenses', label: t.tabFinesExpenses, icon: Receipt },
              { id: 'meetings_voting', label: t.tabMeetings, icon: Calendar },
              { id: 'communication', label: t.tabCommunication, icon: MessageSquare },
              { id: 'setup', label: t.tabSetup, icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive 
                      ? 'bg-[#f59e0b] text-black shadow-md' 
                      : 'text-gray-400 hover:bg-[#14120a] hover:text-white border border-transparent hover:border-[#2a2510]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border border-[#2a2510] bg-[#14120a]/40 p-4 rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.activeRole}</h4>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-bold text-white">{currentUserRole}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed truncate">
              {activeMember?.name || 'Simulation Mode'}
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#14120a] border border-[#2a2510] rounded-2xl p-4 space-y-1 shadow-2xl">
            {[
              { id: 'dashboard', label: t.tabDashboard, icon: Users },
              { id: 'contributions', label: t.tabContributions, icon: Coins },
              { id: 'loans', label: t.tabLoans, icon: HandCoins },
              { id: 'fines_expenses', label: t.tabFinesExpenses, icon: Receipt },
              { id: 'meetings_voting', label: t.tabMeetings, icon: Calendar },
              { id: 'communication', label: t.tabCommunication, icon: MessageSquare },
              { id: 'setup', label: t.tabSetup, icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive 
                      ? 'bg-[#f59e0b] text-black' 
                      : 'text-gray-400 hover:bg-[#0a0900] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Content Workspace Panel */}
        <main className="flex-1 bg-[#14120a]/80 border border-[#2a2510] rounded-3xl p-6 lg:p-8 min-h-[500px] shadow-xl">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {currentTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">{t.appName} Console</span>
                <h2 className="text-3xl font-extrabold text-white mt-1 capitalize">{currentChama?.name}</h2>
                <p className="text-sm text-gray-400 mt-2 max-w-3xl leading-relaxed">{currentChama?.description}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-yellow-950 text-[#f59e0b] rounded-xl">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.totalSavings}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{formatKes(totalSavings)}</h3>
                  </div>
                </div>

                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-amber-950 text-[#f59e0b] rounded-xl">
                    <HandCoins className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.activeLoans}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{formatKes(activeLoansTotal)}</h3>
                  </div>
                </div>

                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-red-950 text-red-400 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.outstandingFines}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{formatKes(outstandingFines)}</h3>
                  </div>
                </div>

                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-orange-950/50 text-orange-400 rounded-xl">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.totalExpenses}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{formatKes(totalExpenses)}</h3>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics & Upcoming Meeting Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-blue-950/50 text-blue-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.membersCount}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{chamaMembers.length}</h3>
                  </div>
                </div>

                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-purple-950/50 text-purple-400 rounded-xl">
                    <VoteIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold">{t.activeResolutionsCount}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{activeResolutionsCount}</h3>
                  </div>
                </div>

                <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex items-center space-x-4">
                  <div className="p-3 bg-emerald-950/50 text-emerald-400 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-gray-400 font-semibold">{t.upcomingMeeting}</span>
                    {nextMeeting ? (
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-white truncate mt-0.5">{nextMeeting.title}</h3>
                        <p className="text-[10px] text-[#f59e0b] font-medium">{new Date(nextMeeting.date).toLocaleDateString()} @ {nextMeeting.location}</p>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-gray-500 mt-0.5">{t.noUpcomingMeeting}</h3>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle Section: Quick Actions & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Quick Actions */}
                <div className="lg:col-span-1 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.quickActions}</h3>
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    
                    {/* Treasurer actions */}
                    {currentUserRole === 'Treasurer' && (
                      <>
                        <button onClick={() => setCurrentTab('contributions')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <PlusCircle className="w-4 h-4 shrink-0" />
                          <span>Log Contribution</span>
                        </button>
                        <button onClick={() => setCurrentTab('fines_expenses')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Issue Member Fine</span>
                        </button>
                        <button onClick={() => setCurrentTab('fines_expenses')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <Receipt className="w-4 h-4 shrink-0" />
                          <span>Record Chama Expense</span>
                        </button>
                      </>
                    )}

                    {/* Member actions */}
                    {currentUserRole === 'Member' && (
                      <>
                        <button onClick={() => setCurrentTab('contributions')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <Coins className="w-4 h-4 shrink-0" />
                          <span>Simulate M-Pesa Payment</span>
                        </button>
                        <button onClick={() => setCurrentTab('loans')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <HandCoins className="w-4 h-4 shrink-0" />
                          <span>Apply for Chama Loan</span>
                        </button>
                        <button onClick={() => setCurrentTab('fines_expenses')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <Receipt className="w-4 h-4 shrink-0" />
                          <span>Pay Outstanding Fines</span>
                        </button>
                      </>
                    )}

                    {/* Secretary actions */}
                    {currentUserRole === 'Secretary' && (
                      <>
                        <button onClick={() => setCurrentTab('meetings_voting')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Schedule New Meeting</span>
                        </button>
                        <button onClick={() => setCurrentTab('meetings_voting')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>Log Meeting Minutes</span>
                        </button>
                      </>
                    )}

                    {/* Chairperson actions */}
                    {currentUserRole === 'Chairperson' && (
                      <>
                        <button onClick={() => setCurrentTab('loans')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <HandCoins className="w-4 h-4 shrink-0" />
                          <span>Review Loan Applications</span>
                        </button>
                        <button onClick={() => setCurrentTab('meetings_voting')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-[#f59e0b] transition">
                          <VoteIcon className="w-4 h-4 shrink-0" />
                          <span>Publish Voting Resolution</span>
                        </button>
                      </>
                    )}

                    <button onClick={() => setCurrentTab('communication')} className="flex items-center space-x-2 text-xs font-semibold bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black py-2.5 px-3 rounded-lg text-gray-300 transition">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>WhatsApp Alert Panel</span>
                    </button>
                  </div>
                </div>

                {/* Right: Recent Activity */}
                <div className="lg:col-span-2 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.recentTransactions}</h3>
                  
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {recentActivities.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">{t.noTransactions}</p>
                    ) : (
                      recentActivities.map(act => (
                        <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0a0900] border border-[#2a2510] hover:border-[#f59e0b]/20 transition">
                          <div className="flex items-center space-x-3">
                            <div className={`p-1.5 rounded-lg text-black ${
                              act.type === 'contribution' ? 'bg-yellow-500' :
                              act.type === 'dividend' ? 'bg-amber-400' :
                              act.type === 'loan' ? 'bg-amber-500' :
                              act.type === 'repayment' ? 'bg-emerald-500' :
                              act.type === 'fine' ? 'bg-red-500' : 'bg-blue-500'
                            }`}>
                              {act.type === 'contribution' && <Coins className="w-4 h-4" />}
                              {act.type === 'dividend' && <Award className="w-4 h-4" />}
                              {act.type === 'loan' && <HandCoins className="w-4 h-4" />}
                              {act.type === 'repayment' && <Landmark className="w-4 h-4" />}
                              {act.type === 'fine' && <AlertTriangle className="w-4 h-4" />}
                              {act.type === 'expense' && <Receipt className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-xs text-gray-300 font-medium">{act.desc}</p>
                              <span className="text-[10px] text-gray-500">{new Date(act.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {act.amount !== undefined && (
                            <span className="text-xs font-bold text-white">{formatKes(act.amount)}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CONTRIBUTIONS LEDGER */}
          {currentTab === 'contributions' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{t.contribGridTitle}</h2>
                <p className="text-sm text-gray-400 mt-1">Review savings compliance or pay outstanding monthly shares. Monthly target is {formatKes(2000)} per member.</p>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto border border-[#2a2510] rounded-2xl bg-[#14120a]/40">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#2a2510] bg-[#0a0900] text-xs font-bold uppercase tracking-wider text-gray-400">
                      <th className="py-4 px-5">{t.member}</th>
                      {['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map(month => (
                        <th key={month} className="py-4 px-3 text-center">{month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chamaMembers.map(member => (
                      <tr key={member.id} className="border-b border-[#2a2510] hover:bg-[#0a0900] transition text-sm">
                        <td className="py-4 px-5 font-semibold text-white">
                          <div>
                            {member.name}
                            <span className="block text-[10px] text-gray-500 font-normal">{member.role}</span>
                          </div>
                        </td>
                        
                        {['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'].map(month => {
                          const contr = db.contributions.find(c => c.member_id === member.id && c.contribution_date === month && c.chama_id === currentChamaId);
                          const status = contr ? contr.status : 'pending';

                          return (
                            <td key={month} className="py-4 px-3 text-center">
                              {status === 'paid' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <Check className="w-3 h-3" />
                                  <span>{t.statusPaid}</span>
                                </span>
                              ) : status === 'overdue' ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-300 border border-red-800">
                                    <Clock className="w-3 h-3" />
                                    <span>{t.statusOverdue}</span>
                                  </span>
                                  <button 
                                    onClick={() => triggerStkPush(month, 2000, member.id)}
                                    className="block mx-auto text-[10px] text-[#f59e0b] hover:underline font-bold"
                                  >
                                    Pay Now
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-950 text-yellow-300 border border-yellow-800">
                                    <Clock className="w-3 h-3" />
                                    <span>{t.statusPending}</span>
                                  </span>
                                  <button 
                                    onClick={() => triggerStkPush(month, 2000, member.id)}
                                    className="block mx-auto text-[10px] text-[#f59e0b] hover:underline font-bold"
                                  >
                                    Pay Now
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Forms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                
                {/* 1. M-Pesa Sandbox (STK Simulation) */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2 text-[#f59e0b]">
                    <Phone className="w-4 h-4" />
                    <span>{t.mpesaSandbox}</span>
                  </h3>
                  <div className="space-y-3 text-xs text-gray-400">
                    <p>Trigger a mock M-Pesa STK push. Enter details to simulate a real payment on the network.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">Select Member</label>
                        <select 
                          value={stkMemberId} 
                          onChange={(e) => setStkMemberId(e.target.value)}
                          className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                        >
                          {chamaMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Select Month</label>
                        <select 
                          value={stkMonth} 
                          onChange={(e) => setStkMonth(e.target.value)}
                          className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                        >
                          <option value="">-- Choose Month --</option>
                          <option value="2026-05">2026-05 (May)</option>
                          <option value="2026-06">2026-06 (June)</option>
                          <option value="2026-07">2026-07 (July)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">Phone (Format: 07..)</label>
                        <input 
                          type="text" 
                          value={stkPhone} 
                          onChange={(e) => setStkPhone(e.target.value)}
                          placeholder="e.g. 0712345678"
                          className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Amount (KES)</label>
                        <input 
                          type="number" 
                          value={stkAmount} 
                          onChange={(e) => setStkAmount(Number(e.target.value))}
                          placeholder="2000"
                          className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (!stkMonth) {
                          showToast('Please select a target contribution month', 'error');
                          return;
                        }
                        triggerStkPush(stkMonth, stkAmount, stkMemberId);
                      }}
                      className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-4"
                    >
                      Trigger Sandbox STK Push
                    </button>
                  </div>
                </div>

                {/* 2. Treasurer Manual Logging (Treasurer only) */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <PlusCircle className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.recordContribution}</span>
                  </h3>
                  
                  {currentUserRole !== 'Treasurer' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#0a0900] border border-[#2a2510] rounded-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs">Access Restricted. Switch role to <strong>Treasurer</strong> to log manual cash payments.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleManualContribution} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1">Select Member*</label>
                          <select name="member_id" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                            {chamaMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Month*</label>
                          <select name="month" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                            <option value="2026-05">2026-05</option>
                            <option value="2026-06" selected>2026-06</option>
                            <option value="2026-07">2026-07</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1">Amount (KES)*</label>
                          <input type="number" name="amount" defaultValue={2000} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Payment Method</label>
                          <select name="payment_method" className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1">Transaction Ref</label>
                          <input type="text" name="reference" placeholder="e.g. QK8390SK" className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Remarks</label>
                          <input type="text" name="remarks" placeholder="Treasurer verification" className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black border border-[#2a2510] text-[#f59e0b] font-bold py-3 rounded-xl transition text-xs mt-2">
                        {t.submitContribution}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LOANS & DIVIDENDS */}
          {currentTab === 'loans' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{t.loansTitle}</h2>
                <p className="text-sm text-gray-400 mt-1">Manage borrower eligibility checks, loan repayments, and compute annual dividend splits based on member contributions.</p>
              </div>

              {/* Eligibility Check Banner */}
              <div className="bg-[#14120a] border border-[#2a2510] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.loanEligibleLimit}</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-[#f59e0b]">
                      {formatKes(getMemberSavings(currentMemberId) * 3)}
                    </span>
                    <span className="text-xs text-gray-400">(Savings Base: {formatKes(getMemberSavings(currentMemberId))})</span>
                  </div>
                  <p className="text-xs text-gray-500">{t.multiplierNotice}</p>
                </div>
                
                <div className="p-3 bg-[#0a0900] border border-[#2a2510] rounded-xl max-w-sm">
                  <div className="flex items-center space-x-2 text-xs">
                    <UserCheck className="w-4 h-4 text-[#f59e0b]" />
                    <span className="font-bold text-white">Active Borrower Profile:</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{activeMember?.name || 'Simulation Mode'}</p>
                </div>
              </div>

              {/* Sub grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Apply Loan Form */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <PlusCircle className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.loanApplication}</span>
                  </h3>
                  
                  <form onSubmit={handleApplyLoan} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">{t.requestedAmount}*</label>
                      <input 
                        type="number" 
                        name="amount" 
                        placeholder="e.g. 15000"
                        required 
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs font-bold" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">{t.termMonths}*</label>
                        <select name="term_months" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                          <option value="1">1 Month</option>
                          <option value="2">2 Months</option>
                          <option value="3" selected>3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">{t.interestRate}*</label>
                        <input 
                          type="number" 
                          name="interest_rate" 
                          defaultValue={10} 
                          required 
                          className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" 
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2">
                      {t.applyLoanBtn}
                    </button>
                  </form>
                </div>

                {/* Repay Loan Form */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <HandCoins className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.repayLoanTitle}</span>
                  </h3>
                  
                  <form onSubmit={handleLoanRepayment} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Select Active Loan*</label>
                      <select name="loan_id" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                        <option value="">-- Choose Loan --</option>
                        {db.loans.filter(l => l.chama_id === currentChamaId && l.status === 'active').map(l => {
                          const borrower = db.members.find(m => m.id === l.member_id);
                          return (
                            <option key={l.id} value={l.id}>
                              {borrower?.name} - {formatKes(l.amount)} ({l.interest_rate}% Int)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">{t.repayAmount}*</label>
                        <input type="number" name="amount" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Payment Method</label>
                        <select name="payment_method" className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                          <option value="M-Pesa">M-Pesa</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank & EFT</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Transaction reference</label>
                      <input type="text" name="reference" placeholder="e.g. MPESA-TXN-..." className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                    </div>

                    <button type="submit" className="w-full bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black border border-[#2a2510] text-[#f59e0b] font-bold py-3 rounded-xl transition text-xs mt-2">
                      {t.repayLoanBtn}
                    </button>
                  </form>
                </div>

              </div>

              {/* Pending Approvals (Chairperson Only) */}
              <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center justify-between">
                  <span>{t.pendingLoansTitle}</span>
                  <span className="text-xs text-gray-500">Requires Chairperson Credentials</span>
                </h3>

                {db.loans.filter(l => l.chama_id === currentChamaId && l.status === 'pending').length === 0 ? (
                  <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                ) : (
                  <div className="space-y-3">
                    {db.loans.filter(l => l.chama_id === currentChamaId && l.status === 'pending').map(loan => {
                      const borrower = db.members.find(m => m.id === loan.member_id);
                      const savings = getMemberSavings(loan.member_id);
                      return (
                        <div key={loan.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-[#0a0900] border border-[#2a2510] gap-4">
                          <div className="text-xs space-y-1">
                            <p className="font-bold text-white text-sm">{borrower?.name}</p>
                            <p className="text-gray-400">Requested: <strong className="text-[#f59e0b]">{formatKes(loan.amount)}</strong> | Term: <strong>{loan.term_months} Months</strong></p>
                            <p className="text-gray-500">Borrower Accumulated Savings: {formatKes(savings)} (Limit: {formatKes(savings * 3)})</p>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            {currentUserRole === 'Chairperson' ? (
                              <>
                                <button 
                                  onClick={() => handleLoanApproval(loan.id, false)}
                                  className="bg-red-950 text-red-400 hover:bg-red-900 border border-red-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
                                >
                                  Reject
                                </button>
                                <button 
                                  onClick={() => handleLoanApproval(loan.id, true)}
                                  className="bg-green-950 text-green-400 hover:bg-green-900 border border-green-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
                                >
                                  Approve
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic">Login as Chairperson to approve</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Loans List */}
              <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.activeLoansTitle}</h3>
                
                {db.loans.filter(l => l.chama_id === currentChamaId && (l.status === 'active' || l.status === 'fully_paid')).length === 0 ? (
                  <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-[#2a2510] text-gray-400 font-bold uppercase">
                          <th className="py-2.5">Borrower</th>
                          <th className="py-2.5">Principal</th>
                          <th className="py-2.5">Repayable (+Interest)</th>
                          <th className="py-2.5">Repaid Amount</th>
                          <th className="py-2.5">Outstanding Balance</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {db.loans.filter(l => l.chama_id === currentChamaId && (l.status === 'active' || l.status === 'fully_paid')).map(loan => {
                          const borrower = db.members.find(m => m.id === loan.member_id);
                          const totalRepayable = loan.amount * (1 + loan.interest_rate / 100);
                          const totalRepaid = db.repayments
                            .filter(r => r.loan_id === loan.id)
                            .reduce((sum, r) => sum + r.amount, 0);
                          const remaining = Math.max(0, totalRepayable - totalRepaid);

                          return (
                            <tr key={loan.id} className="border-b border-[#2a2510] hover:bg-[#0a0900] transition">
                              <td className="py-3 font-semibold text-white">{borrower?.name}</td>
                              <td className="py-3 text-gray-300">{formatKes(loan.amount)}</td>
                              <td className="py-3 text-gray-300">{formatKes(totalRepayable)} <span className="text-[10px] text-gray-500">({loan.interest_rate}%)</span></td>
                              <td className="py-3 text-emerald-400 font-medium">{formatKes(totalRepaid)}</td>
                              <td className="py-3 text-amber-500 font-bold">{formatKes(remaining)}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  loan.status === 'fully_paid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-amber-950 text-amber-400 border border-amber-900'
                                }`}>
                                  {loan.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Annual Dividend Split Engine */}
              <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-6">
                <div className="border-b border-[#2a2510] pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">{t.dividendTitle}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{t.dividendDesc}</p>
                  </div>
                  <span className="text-xs bg-[#2a2510] px-2.5 py-1 rounded text-[#f59e0b] font-mono shrink-0">Interest Shares Split</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1.5">{t.dividendEarnings}*</label>
                    <input 
                      type="number" 
                      value={dividendSurplus} 
                      onChange={(e) => setDividendSurplus(Number(e.target.value))}
                      placeholder="Enter surplus e.g. 25000"
                      className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-sm font-bold focus:outline-none focus:border-[#f59e0b]" 
                    />
                  </div>
                  <button 
                    onClick={calculateDividendSplits}
                    className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3.5 px-4 rounded-xl transition text-xs shadow-md"
                  >
                    {t.calculateDividendsBtn}
                  </button>
                </div>

                {calculatedDividends.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#2a2510] text-gray-400 font-bold uppercase">
                            <th className="py-2.5">Member</th>
                            <th className="py-2.5">Total Savings</th>
                            <th className="py-2.5">Share Unit (%)</th>
                            <th className="py-2.5 text-right">Dividend Payout</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculatedDividends.map(div => (
                            <tr key={div.memberId} className="border-b border-[#2a2510] hover:bg-[#0a0900] transition">
                              <td className="py-3 font-semibold text-white">{div.name}</td>
                              <td className="py-3 text-gray-300">{formatKes(div.savings)}</td>
                              <td className="py-3 text-[#f59e0b] font-medium">{div.share.toFixed(2)}%</td>
                              <td className="py-3 text-right font-extrabold text-white">{formatKes(div.dividend)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end pt-3">
                      <button 
                        onClick={handleDistributeDividends}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition text-xs shadow-md"
                      >
                        Distribute & Log Dividends
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: FINES & EXPENSES */}
          {currentTab === 'fines_expenses' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Chama Operating & Fines Ledgers</h2>
                <p className="text-sm text-gray-400 mt-1">Audit administrative expenses and track member late fee compliance.</p>
              </div>

              {/* Fines Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Issue Fine Form */}
                <div className="lg:col-span-1 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.issueFine}</span>
                  </h3>
                  
                  {currentUserRole !== 'Treasurer' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#0a0900] border border-[#2a2510] rounded-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs">Access Restricted. Switch role to <strong>Treasurer</strong> to issue fines.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleIssueFine} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1">Select Fined Member*</label>
                        <select name="member_id" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                          {chamaMembers.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.fineAmount} (KES)*</label>
                        <input type="number" name="amount" placeholder="e.g. 500" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.fineReason}*</label>
                        <textarea name="reason" placeholder="e.g. Late to physical meeting" required rows={2} className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"></textarea>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">Issue Date*</label>
                        <input type="date" name="issue_date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2">
                        {t.issueFineBtn}
                      </button>
                    </form>
                  )}
                </div>

                {/* Fines Ledger List */}
                <div className="lg:col-span-2 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.finesTitle}</h3>

                  {db.fines.filter(f => f.chama_id === currentChamaId).length === 0 ? (
                    <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {db.fines.filter(f => f.chama_id === currentChamaId).map(fine => {
                        const member = db.members.find(m => m.id === fine.member_id);
                        return (
                          <div key={fine.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#0a0900] border border-[#2a2510] gap-4">
                            <div className="text-xs space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">{member?.name}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  fine.status === 'paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                                }`}>
                                  {fine.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-400">{fine.reason}</p>
                              <p className="text-gray-500">Issued: {fine.issue_date} {fine.paid_date && `| Paid: ${fine.paid_date}`}</p>
                            </div>
                            
                            <div className="flex items-center space-x-3 justify-between sm:justify-end shrink-0">
                              <span className="text-base font-extrabold text-[#f59e0b]">{formatKes(fine.amount)}</span>
                              {fine.status === 'pending' && (fine.member_id === currentMemberId || currentUserRole === 'Treasurer') && (
                                <button 
                                  onClick={() => handlePayFine(fine.id)}
                                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                >
                                  Lipa Fine
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Operating Expense Tracker Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Record Expense Form */}
                <div className="lg:col-span-1 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.recordExpense}</span>
                  </h3>
                  
                  {currentUserRole !== 'Treasurer' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#0a0900] border border-[#2a2510] rounded-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs">Access Restricted. Switch role to <strong>Treasurer</strong> to log Chama expenses.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleLogExpense} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1">{t.expenseCategory}*</label>
                        <select name="category" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs">
                          <option value="refreshments">{t.categoryRefreshments}</option>
                          <option value="stationery">{t.categoryStationery}</option>
                          <option value="charity">{t.categoryCharity}</option>
                          <option value="registration">{t.categoryRegistration}</option>
                          <option value="other">{t.categoryOther}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.expenseAmount} (KES)*</label>
                        <input type="number" name="amount" placeholder="e.g. 1500" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.expenseDesc}*</label>
                        <input type="text" name="description" placeholder="e.g. Printer cartridges" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">Expense Date*</label>
                        <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">Mock Receipt Image Link</label>
                        <input type="text" name="receipt_mock" placeholder="https://images.unsplash.com/..." className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2">
                        {t.recordExpenseBtn}
                      </button>
                    </form>
                  )}
                </div>

                {/* Expenses List */}
                <div className="lg:col-span-2 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.expenseTitle}</h3>

                  {db.expenses.filter(e => e.chama_id === currentChamaId).length === 0 ? (
                    <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {db.expenses.filter(e => e.chama_id === currentChamaId).map(expense => (
                        <div key={expense.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0a0900] border border-[#2a2510] hover:border-[#f59e0b]/20 transition">
                          <div className="text-xs space-y-1">
                            <span className="inline-block bg-[#2a2510] text-[#f59e0b] px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                              {expense.category}
                            </span>
                            <p className="font-bold text-white text-sm mt-1">{expense.description}</p>
                            <p className="text-gray-500">Date: {expense.date}</p>
                          </div>
                          
                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="text-base font-extrabold text-[#f59e0b]">{formatKes(expense.amount)}</span>
                            <button 
                              onClick={() => setActiveReceipt(expense)}
                              className="bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                            >
                              {t.receiptView}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: MEETINGS & VOTING */}
          {currentTab === 'meetings_voting' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Chama Democratic Resolutions & Meeting Planner</h2>
                <p className="text-sm text-gray-400 mt-1">Vote on active resolutions, coordinate physical/virtual meetups, and log attendance details.</p>
              </div>

              {/* Grid 1: Meet Planner */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Schedule Meeting Form */}
                <div className="lg:col-span-1 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.scheduleMeeting}</span>
                  </h3>
                  
                  {currentUserRole !== 'Secretary' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#0a0900] border border-[#2a2510] rounded-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs">Access Restricted. Switch role to <strong>Secretary</strong> to schedule meetings.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleScheduleMeeting} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1">{t.meetingTitle}*</label>
                        <input type="text" name="title" placeholder="e.g. Q3 Progress Audit" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.meetingDate}*</label>
                        <input type="datetime-local" name="date" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.meetingLocation}*</label>
                        <input type="text" name="location" placeholder="e.g. Westlands Social Hall or Zoom" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2">
                        {t.scheduleMeetingBtn}
                      </button>
                    </form>
                  )}
                </div>

                {/* Meetings List & Details Panel */}
                <div className="lg:col-span-2 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-6">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.meetingsTitle}</h3>

                  {db.meetings.filter(m => m.chama_id === currentChamaId).length === 0 ? (
                    <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                  ) : (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {db.meetings.filter(m => m.chama_id === currentChamaId).map(meeting => (
                        <div key={meeting.id} className="p-4 rounded-xl bg-[#0a0900] border border-[#2a2510] space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2a2510] pb-2">
                            <div>
                              <h4 className="font-bold text-white text-sm">{meeting.title}</h4>
                              <p className="text-[10px] text-gray-500">{new Date(meeting.date).toLocaleString()} | {meeting.location}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold w-fit uppercase ${
                              meeting.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                            }`}>
                              {meeting.status}
                            </span>
                          </div>

                          {/* Minutes summary or inputs based on state */}
                          {meeting.status === 'completed' ? (
                            <div className="space-y-2 text-xs">
                              <p className="text-xs font-bold text-gray-400">Meeting Minutes Summary:</p>
                              <p className="text-gray-300 whitespace-pre-wrap bg-[#14120a] p-3 rounded-lg border border-[#2a2510] italic">
                                {meeting.minutes || 'No minutes entered.'}
                              </p>
                              <button 
                                onClick={() => handlePrintMinutes(meeting)}
                                className="flex items-center space-x-1.5 text-[10px] font-bold text-[#f59e0b] hover:underline pt-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>{t.exportPdfBtn}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 text-xs">
                              
                              {/* Attendance toggle list */}
                              {currentUserRole === 'Secretary' && (
                                <div className="space-y-2 border-t border-[#2a2510] pt-2">
                                  <p className="text-xs font-bold text-[#f59e0b]">{t.attendanceChecklist}</p>
                                  
                                  {/* Inline Attendance List */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#14120a] p-3 rounded-lg border border-[#2a2510]">
                                    {chamaMembers.map(m => {
                                      const curVal = meetingAttendanceState[m.id] || 'present';
                                      return (
                                        <div key={m.id} className="flex items-center justify-between gap-1 text-[11px]">
                                          <span className="truncate text-white max-w-[120px]">{m.name}</span>
                                          <select 
                                            value={curVal}
                                            onChange={(e) => {
                                              setMeetingAttendanceState(prev => ({
                                                ...prev,
                                                [m.id]: e.target.value as any
                                              }));
                                              setActiveMeetingId(meeting.id);
                                            }}
                                            className="bg-[#0a0900] border border-[#2a2510] rounded px-1 py-0.5 text-[10px] text-gray-300"
                                          >
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="absent_with_apology">Apology</option>
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  <button 
                                    onClick={() => handleSaveAttendance(meeting.id)}
                                    className="bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black border border-[#2a2510] text-[#f59e0b] font-bold px-3 py-1.5 rounded-lg text-[10px] transition"
                                  >
                                    Save Attendance Roll
                                  </button>
                                </div>
                              )}

                              {/* Minutes Textarea */}
                              {currentUserRole === 'Secretary' ? (
                                <div className="space-y-2 pt-2 border-t border-[#2a2510]">
                                  <label className="block text-xs font-bold text-gray-400">{t.minutesTitle}</label>
                                  <textarea 
                                    placeholder={t.minutesPlaceholder}
                                    id={`min-text-${meeting.id}`}
                                    rows={3}
                                    defaultValue={meeting.minutes || ''}
                                    className="w-full bg-[#14120a] border border-[#2a2510] rounded-xl p-2.5 text-white font-mono"
                                  ></textarea>
                                  <div className="flex space-x-2 pt-1">
                                    <button 
                                      onClick={() => {
                                        const area = document.getElementById(`min-text-${meeting.id}`) as HTMLTextAreaElement;
                                        handleSaveMinutes(meeting.id, area?.value || '');
                                      }}
                                      className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold px-4 py-2 rounded-lg transition font-semibold"
                                    >
                                      {t.saveMinutesBtn}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-500 italic p-3 bg-[#14120a] border border-[#2a2510] rounded-xl">
                                  Attendance sheet and minutes editor is only editable by the simulated Katibu (Secretary).
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Voting Resolutions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Create Resolution Form */}
                <div className="lg:col-span-1 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <VoteIcon className="w-4 h-4 text-[#f59e0b]" />
                    <span>{t.createResolution}</span>
                  </h3>
                  
                  {currentUserRole !== 'Chairperson' && currentUserRole !== 'Secretary' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 bg-[#0a0900] border border-[#2a2510] rounded-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-xs">Access Restricted. Switch role to <strong>Chairperson</strong> or <strong>Secretary</strong> to create resolutions.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateResolution} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1">{t.resolutionTitle}*</label>
                        <input type="text" name="title" placeholder="e.g. Launch Treasury Bill Investment" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.resolutionDesc}*</label>
                        <textarea name="description" placeholder="Specify investment details, amounts, risks, etc." required rows={3} className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"></textarea>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1">{t.resolutionEndDate}*</label>
                        <input type="datetime-local" name="end_date" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" />
                      </div>

                      <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2">
                        {t.createResolutionBtn}
                      </button>
                    </form>
                  )}
                </div>

                {/* Resolution Vote Board */}
                <div className="lg:col-span-2 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2">{t.votingTitle}</h3>
                  
                  {db.votes.filter(v => v.chama_id === currentChamaId).length === 0 ? (
                    <p className="text-gray-500 text-xs py-4">{t.noData}</p>
                  ) : (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {db.votes.filter(v => v.chama_id === currentChamaId).map(vote => {
                        const records = db.voteRecords.filter(vr => vr.vote_id === vote.id);
                        const yesCount = records.filter(r => r.choice === 'yes').length;
                        const noCount = records.filter(r => r.choice === 'no').length;
                        const abstainCount = records.filter(r => r.choice === 'abstain').length;

                        // Check if simulated user has voted
                        const userVoteRecord = records.find(r => r.member_id === currentMemberId);
                        
                        const totalVotes = yesCount + noCount + abstainCount;
                        const yesPct = totalVotes > 0 ? (yesCount / totalVotes) * 100 : 0;
                        const noPct = totalVotes > 0 ? (noCount / totalVotes) * 100 : 0;
                        const abstainPct = totalVotes > 0 ? (abstainCount / totalVotes) * 100 : 0;

                        return (
                          <div key={vote.id} className="p-4 rounded-xl bg-[#0a0900] border border-[#2a2510] space-y-3">
                            <div className="flex items-center justify-between border-b border-[#2a2510] pb-2">
                              <h4 className="font-bold text-white text-sm">{vote.title}</h4>
                              <span className="text-[10px] text-gray-500">Deadline: {new Date(vote.end_date).toLocaleDateString()}</span>
                            </div>
                            
                            <p className="text-xs text-gray-400 leading-relaxed">{vote.description}</p>

                            {/* Votes Counts & Percentages */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                              <div className="bg-emerald-950/40 border border-emerald-900 rounded p-1.5 text-emerald-400">
                                <span className="block font-bold">YES</span>
                                <span className="text-xs font-extrabold">{yesCount} ({yesPct.toFixed(0)}%)</span>
                              </div>
                              <div className="bg-red-950/40 border border-red-900 rounded p-1.5 text-red-400">
                                <span className="block font-bold">NO</span>
                                <span className="text-xs font-extrabold">{noCount} ({noPct.toFixed(0)}%)</span>
                              </div>
                              <div className="bg-yellow-950/40 border border-yellow-900 rounded p-1.5 text-yellow-400">
                                <span className="block font-bold">ABSTAIN</span>
                                <span className="text-xs font-extrabold">{abstainCount} ({abstainPct.toFixed(0)}%)</span>
                              </div>
                            </div>

                            {/* Voting Panel */}
                            <div className="border-t border-[#2a2510] pt-2.5 flex items-center justify-between">
                              {userVoteRecord ? (
                                <p className="text-[10px] text-green-400 font-semibold flex items-center space-x-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>You voted: <strong className="uppercase">{userVoteRecord.choice}</strong></span>
                                </p>
                              ) : (
                                <>
                                  <span className="text-[10px] text-gray-400 font-medium">Cast Your Vote:</span>
                                  <div className="flex space-x-1.5">
                                    <button 
                                      onClick={() => handleCastVote(vote.id, 'yes')}
                                      className="bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 font-bold px-3 py-1 rounded text-[10px] transition"
                                    >
                                      YES
                                    </button>
                                    <button 
                                      onClick={() => handleCastVote(vote.id, 'no')}
                                      className="bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 font-bold px-3 py-1 rounded text-[10px] transition"
                                    >
                                      NO
                                    </button>
                                    <button 
                                      onClick={() => handleCastVote(vote.id, 'abstain')}
                                      className="bg-yellow-950 text-yellow-400 border border-yellow-800 hover:bg-yellow-900 font-bold px-3 py-1 rounded text-[10px] transition"
                                    >
                                      ABSTAIN
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TAB 6: COMMUNICATION & ALERTS */}
          {currentTab === 'communication' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{t.commTitle}</h2>
                <p className="text-sm text-gray-400 mt-1">Generate customized WhatsApp alert redirects and test mock transactional emails via the Resend API sandbox.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* WhatsApp message builder */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2 text-[#f59e0b]">
                    <Phone className="w-4.5 h-4.5" />
                    <span>{t.whatsappTitle}</span>
                  </h3>
                  
                  <p className="text-xs text-gray-400">{t.whatsappDesc}</p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">{t.whatsappTemplate}</label>
                      <select 
                        value={waTemplate} 
                        onChange={(e) => setWaTemplate(e.target.value)}
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                      >
                        <option value="savings">{t.templateSavings}</option>
                        <option value="overdue">{t.templateOverdue}</option>
                        <option value="fine">{t.templateFine}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Target Member</label>
                      <select 
                        value={waMemberId} 
                        onChange={(e) => setWaMemberId(e.target.value)}
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                      >
                        {chamaMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* Pre-fill display */}
                    <div className="space-y-1">
                      <span className="block text-gray-500 font-bold">Message Preview:</span>
                      <p className="bg-[#0a0900] border border-[#2a2510] p-3 rounded-xl text-gray-300 font-mono text-[11px] leading-relaxed">
                        {getWhatsAppMessage(waTemplate, waMemberId)}
                      </p>
                    </div>

                    <button 
                      onClick={handleWhatsAppRedirect}
                      className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3 rounded-xl transition text-xs shadow-md mt-2 flex items-center justify-center space-x-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{t.generateWaLink}</span>
                    </button>
                  </div>
                </div>

                {/* Resend Mock Email dispatch */}
                <div className="bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-white text-base border-b border-[#2a2510] pb-2 flex items-center space-x-2">
                    <Mail className="w-4.5 h-4.5 text-[#f59e0b]" />
                    <span>{t.emailTitle}</span>
                  </h3>
                  
                  <p className="text-xs text-gray-400">{t.emailDesc}</p>

                  <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1">Select Member Email Recipient*</label>
                      <select 
                        name="member_id" 
                        value={emailMemberId}
                        onChange={(e) => setEmailMemberId(e.target.value)}
                        required 
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs"
                      >
                        {chamaMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">{t.emailSubject}*</label>
                      <input 
                        type="text" 
                        name="subject" 
                        defaultValue="Important Chama Financial Notice" 
                        required 
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs" 
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">{t.emailBody}*</label>
                      <textarea 
                        name="body" 
                        rows={3} 
                        defaultValue="Hello, please log into your ChamaVault portal to review the outstanding ledger balance. Let us continue to build our savings pool. Thank you!" 
                        required 
                        className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-2.5 text-white text-xs font-mono"
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      disabled={emailSending}
                      className="w-full bg-[#2a2510] hover:bg-[#f59e0b] hover:text-black border border-[#2a2510] text-[#f59e0b] font-bold py-3 rounded-xl transition text-xs mt-2 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {emailSending ? (
                        <span>Simulating Send...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t.sendEmailBtn}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

          {/* TAB 7: CHAMA SETUP FLOW */}
          {currentTab === 'setup' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h2 className="text-2xl font-bold text-white">{t.setupTitle}</h2>
                <p className="text-sm text-gray-400 mt-1">{t.setupDesc}</p>
              </div>

              <form onSubmit={handleCreateChama} className="space-y-6 bg-[#14120a] border border-[#2a2510] p-6 rounded-2xl">
                
                {/* Step 1 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#f59e0b] text-sm border-b border-[#2a2510] pb-1.5">{t.step1}</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t.chamaName}*</label>
                      <input type="text" name="name" placeholder="e.g. Baraka Investment Group" required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t.chamaDesc}*</label>
                      <textarea name="description" placeholder="A self-help group focusing on agribusiness and land purchase." required rows={2} className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs"></textarea>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#f59e0b] text-sm border-b border-[#2a2510] pb-1.5">{t.step2}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t.minContribution}*</label>
                      <input type="number" name="min_contribution" defaultValue={2000} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t.loanInterestRate}*</label>
                      <input type="number" name="interest_rate" defaultValue={10} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t.loanMultiplier}*</label>
                      <input type="number" name="loan_multiplier" defaultValue={3} required className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs font-bold" />
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-[#f59e0b] text-sm border-b border-[#2a2510] pb-1.5">{t.step3}</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t.foundingMembers}</label>
                    <textarea 
                      name="founding_members" 
                      placeholder="david.treasurer@gmail.com, amina.secretary@gmail.com, john.member@gmail.com" 
                      rows={2} 
                      className="w-full bg-[#0a0900] border border-[#2a2510] rounded-xl p-3 text-white text-xs font-mono"
                    ></textarea>
                    <span className="text-[10px] text-gray-500 mt-1 block">First email will be designated Treasurer, second Katibu/Secretary, and others standard members.</span>
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-3.5 rounded-xl transition text-sm shadow-md uppercase tracking-wider">
                  {t.completeSetupBtn}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* DEMO ROLE SWITCHER BAR (Sticky Floating Bottom Panel) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#14120a] border-t border-[#f59e0b]/40 py-3 px-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{t.chooseRole}:</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'Chairperson', name: 'Grace (Mwenyekiti)', style: 'hover:bg-yellow-500/20' },
              { id: 'Treasurer', name: 'David (Mweka Hazina)', style: 'hover:bg-amber-500/20' },
              { id: 'Secretary', name: 'Amina (Katibu)', style: 'hover:bg-blue-500/20' },
              { id: 'Member', name: 'John (Mwanachama)', style: 'hover:bg-gray-500/20' },
            ].map(role => {
              const isSelected = currentUserRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleChange(role.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    isSelected 
                      ? 'bg-[#f59e0b] text-black border border-transparent shadow' 
                      : `bg-[#0a0900] border border-[#2a2510] text-gray-300 ${role.style}`
                  }`}
                >
                  <span>{role.name}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-gray-500 font-semibold bg-[#0a0900] border border-[#2a2510] px-3 py-1.5 rounded-lg flex items-center space-x-1">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span>Simulating: <strong className="text-white font-bold">{activeMember?.name}</strong></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
