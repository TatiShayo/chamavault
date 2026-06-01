Build the SACCO Compliance Module for ChamaVault.

You are a senior fullstack engineer. Read existing code patterns and build exactly what follows.

═══ CURRENT STATE ═══
Build passes. Chama management core is complete — contributions, loans, meetings, dividends, communication.

═══ TASKS ═══

Task 1: SASRA research doc
File: src/lib/sasra-compliance.md
Create a markdown document about Kenya Sacco Societies Regulatory Authority requirements. Cover: minimum membership (30+), registration requirements, annual returns, board composition (chairman, treasurer, secretary, 2 directors), external audit requirements. This is a reference document.

Task 2: Add compliance_type field migration
File: src/lib/compliance-migration.sql
SQL migration adding compliance_type to chamas table (values: 'informal_chama' | 'registered_group' | 'sacco'). Add columns: registration_number, sasra_license, auditor_name.

Task 3: SACCO compliance mode in chama settings
File: src/app/dashboard/chamas/[id]/settings/page.tsx (extend existing)
When chama is 'sacco' type, show additional fields: registration_number, sasra_license, auditor_name as form inputs. Board members management. Update the chama edit form.

Task 4: Compliance checklist page
Create file: src/app/dashboard/chamas/[id]/compliance/page.tsx (new page)
Checklist of SASRA requirements: has board, has annual returns, has external auditor, registration submitted, license valid. Each shows checkmark or X with last-updated date. Server-rendered, reads from DB.

═══ DESIGN ═══
Blue primary (#3b82f6), gray borders, Card wrapper for each section.
Mobile-friendly — single column on phone, 2-column grid on desktop.
Use existing shadcn components (Card, Button, Badge, Input, Select).

═══ RULES ═══
Output COMPLETE file contents. npm run build must pass. Create all files.
