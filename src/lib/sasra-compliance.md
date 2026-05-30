# SASRA Compliance Requirements for Saccos in Kenya

## Overview
The **Sacco Societies Regulatory Authority (SASRA)** was established under the Sacco Societies Act, 2008 (revised 2020) to license, supervise, and regulate deposit-taking Saccos in Kenya. Non-deposit-taking Saccos are also required to register but have lighter compliance requirements.

## Key Regulatory Requirements

### 1. Registration & Licensing
- **Registration**: All Saccos must register with the Commissioner for Co-operative Development under the Co-operative Societies Act, Cap 490
- **SASRA License**: Deposit-taking Saccos (FOSA - Front Office Service Activity) must obtain a SASRA license annually
- **Registration Number**: Displayed on all official documents and correspondence
- **Minimum Capital**: Deposit-taking Saccos must maintain minimum core capital as prescribed by SASRA (currently KES 10M+)

### 2. Governance Structure (Mandatory)
- **Board of Directors**: Minimum 5 members — Chairperson, Vice Chair, Treasurer, Secretary, and at least 1 ordinary director
- **Supervisory Committee**: Minimum 3 members, independent from the board
- **Annual General Meeting (AGM)**: Must be held within 4 months after the end of the financial year
- **Board Meetings**: At least quarterly, with proper minutes recorded

### 3. Financial Reporting
- **Annual Returns**: Submit audited financial statements to SASRA within 4 months of financial year-end
- **Quarterly Returns**: Deposit-taking Saccos submit quarterly prudential returns
- **External Audit**: Mandatory annual audit by a SASRA-approved external auditor
- **Financial Year**: Standard January–December or custom financial year as registered

### 4. Prudential Standards
- **Loan Classification**: Loans classified as Normal, Watch, Substandard, Doubtful, Loss per CBK prudential guidelines
- **Provisioning**: Minimum provisions: 1% normal, 5% watch, 25% substandard, 50% doubtful, 100% loss
- **Liquidity Ratio**: Minimum 20% of savings deposits
- **Core Capital to Total Assets**: Minimum 10%
- **Core Capital to Deposits**: Minimum 8%
- **External Borrowing Limit**: Maximum 25% of total assets

### 5. Member Protection
- **Share Capital**: Each member holds shares; members receive dividends from surplus
- **Member Register**: Complete register with name, ID number, contact, shares held, contributions
- **Deposit Insurance**: Deposit-taking Saccos contribute to the Deposit Guarantee Fund (DGF)
- **Member Education**: Annual member education on rights, products, and financial literacy

### 6. Anti-Money Laundering (AML/CFT)
- **Customer Due Diligence (CDD)**: KYC for all members (ID, proof of residence, occupation)
- **Transaction Monitoring**: Flag and report suspicious transactions above KES 1M
- **Reporting to FRC**: Submit STR (Suspicious Transaction Reports) to Financial Reporting Centre
- **PEP Screening**: Screen members against Politically Exposed Persons lists

### 7. Record Keeping
- All financial records preserved for minimum 7 years
- Meeting minutes (Board, AGM, Special General Meetings) permanently archived
- Member records maintained for 7 years after membership termination
- Loan files preserved for 7 years after full repayment

### 8. Operations
- **Interest Rate Disclosure**: Transparent interest rates on loans and dividends
- **Fee Structure**: Published schedule of all fees and charges
- **Complaint Handling**: Formal complaint resolution mechanism with response within 14 days
- **Data Protection**: Compliance with Data Protection Act, 2019 for member data

## SASRA Compliance Checklist

| # | Requirement | Frequency | Evidence |
|---|------------|-----------|----------|
| 1 | Valid registration certificate | Once | Registration number |
| 2 | SASRA operating license (DT-Saccos) | Annual | License certificate |
| 3 | Board of Directors in place (5+ members) | Ongoing | Board resolution/minutes |
| 4 | Supervisory Committee (3+ members) | Ongoing | Appointment letter |
| 5 | Annual audited financial statements | Annual | Audit report |
| 6 | AGM held within statutory period | Annual | AGM minutes |
| 7 | Quarterly prudential returns (DT-Saccos) | Quarterly | Filed returns |
| 8 | Loan provisioning computed | Quarterly | Loan portfolio report |
| 9 | Capital adequacy ratios met | Continuous | Financial statements |
| 10 | Liquidity ratio ≥20% | Continuous | Liquidity report |
| 11 | Updated member register | Continuous | Member database |
| 12 | AML/KYC documentation for all members | Continuous | Member files |
| 13 | Board meeting minutes (at least quarterly) | Quarterly | Signed minutes |
| 14 | Interest rates publicly displayed | Ongoing | Rate board/website |
| 15 | Complaint register maintained | Ongoing | Complaint log |

## Penalties for Non-Compliance
- Late filing of returns: KES 10,000 per day
- Operating without license: KES 100,000 fine and/or imprisonment
- Failure to hold AGM: KES 50,000
- Non-compliance with prudential standards: License revocation

## Implementation in ChamaVault

### Data Model Additions
```
chamas table additions:
- compliance_type: 'informal_chama' | 'registered_group' | 'sacco'
- registration_number: text
- sasra_license_number: text
- sasra_license_expiry: date
- auditor_name: text
- financial_year_start: date (default: January 1)
- financial_year_end: date (default: December 31)
- core_capital: numeric
- fosa_enabled: boolean

board_members table:
- id, chama_id, member_id, role (chairperson/vice_chair/treasurer/secretary/director/supervisory_committee), appointed_date, term_expiry, status

annual_returns table:
- id, chama_id, financial_year, return_type (annual/quarterly), filed_date, status, sasra_reference, document_url

compliance_checklist table:
- id, chama_id, requirement_id, status (compliant/non_compliant/in_progress), last_verified, evidence_notes, evidence_url
```

### Features to Implement
1. SACCO mode toggle with mandatory field unlock
2. Board member management with term tracking
3. AGM scheduler with automatic statutory deadline warnings
4. Compliance checklist with traffic light status (green/amber/red)
5. Quarterly/annual return filing reminders
6. Immutable transaction audit trail (no edit/delete, reversals only)
7. Loan provisioning calculator based on SASRA guidelines
8. Capital adequacy ratio dashboard
9. Member KYC documentation upload
10. Automated compliance report generation
