# FEATURE UPDATE GUIDELINE
## Employee Work Tracking & Performance Management
### Brother's Technology System

**Document Type:** Feature Update / Upgrade Guideline  
**Purpose:** Add employee-wise work tracking, workload visibility, productivity reporting and performance analytics without duplicating existing Service, Project, Technician, ProductCustody, Audit, Attendance, Finance or Reporting capabilities.  
**Target:** AI coding agents / Claude Code / Human Development Team  
**Version:** 1.0  
**Date:** 2026-09-08

---

# 1. PURPOSE

The application must be able to answer:

> **“Which employee did how much work, for which customer/project, during which period, with what result, and what was the quality/cost impact?”**

The feature must provide two distinct layers:

### A. Employee Work Ledger

A factual, auditable record of work performed.

Examples:

- Assigned work
- Accepted work
- Started work
- Completed work
- Service calls
- Installations
- Maintenance
- Complaints resolved
- Project tasks
- Site visits
- Technician activities
- Product issued/used/returned
- Damage/lost incidents
- Rework
- Customer acceptance

### B. Employee Performance Analytics

Management-level interpretation of that work.

Examples:

- Completion rate
- On-time completion
- Pending workload
- Average response time
- Average resolution time
- Rework rate
- Customer acceptance rate
- Productivity
- Utilization
- Workload distribution
- Damage/loss frequency
- Project contribution
- Cost/value contribution

The system MUST keep factual activity records separate from calculated performance KPIs.

---

# 2. SOURCE-OF-TRUTH RULE

Before changing code, the AI agent MUST inspect the current repository.

Required inspection:

1. Employee/User model.
2. Role/RBAC.
3. Technician profile.
4. ServiceAssignment.
5. Project/Service module.
6. Work Order/Task implementation.
7. Task status and history.
8. ProductCustody.
9. Inventory transaction/ledger.
10. Customer/Project relationships.
11. Attendance/HR if present.
12. Timesheet/time tracking if present.
13. Approval engine.
14. AuditLog.
15. Notification system.
16. Reporting engine.
17. Dashboard components.
18. Existing filters/search/saved filters.
19. Existing exports.
20. Existing tests.

If an existing work/task/activity entity already exists, extend it.

DO NOT create a second parallel employee activity system.

---

# 3. NON-DUPLICATION PRINCIPLE

The feature MUST reuse existing:

- User/Employee records
- Employee roles
- Technician profiles
- ServiceAssignment
- Project
- Work Order
- Task
- ProductCustody
- Inventory Ledger
- ApprovalRequest
- AuditLog
- Notification
- Reporting
- Export
- Dashboard
- RBAC

Do not create:

```text
NewEmployee
NewTechnician
NewServiceAssignment
NewTaskSystem
NewInventoryLedger
NewAuditSystem
NewApprovalSystem
```

when equivalent existing functionality is available.

If the repository has a suitable existing `Task`, `WorkOrder`, `ServiceAssignment` or activity table, Employee Work Tracking must aggregate and extend it rather than replacing it.

---

# 4. CORE BUSINESS PRINCIPLE

An employee's workload must be calculated from actual business records.

Do NOT calculate:

```text
“Rahim completed 20 jobs”
```

from manually entered dashboard numbers.

Instead:

```text
ServiceAssignment
+ Work Orders
+ Project Tasks
+ Field Activities
+ ProductCustody
+ Existing Attendance/Timesheet
+ Customer Acceptance
+ Audit History
```

must be used as the source data.

The dashboard is a reporting layer, not a second source of truth.

---

# 5. EMPLOYEE WORK HIERARCHY

Conceptually:

```text
Employee
   ↓
Assignments
   ↓
Projects / Work Orders / Service Calls
   ↓
Tasks / Activities
   ↓
Time / Status / Outcome
   ↓
Customer Acceptance
   ↓
Product / Inventory Activity
   ↓
Performance Metrics
```

Where possible, employee activity should be linked to:

```text
Customer
Project
Service Assignment
Work Order
Task
Site
Product
Serial
Challan
Return
Damage/Loss
```

---

# 6. EMPLOYEE WORK LEDGER

Create a unified reporting view called:

**Employee Work Ledger**

This does NOT necessarily mean a new database table.

Prefer a database query/reporting view/service that aggregates existing records.

Each activity should expose:

```text
Employee
Activity Type
Reference Number
Customer
Project
Site
Date
Start Time
End Time
Duration
Status
Priority
Outcome
Supervisor
Customer Acceptance
Source Module
```

Example:

```text
Employee: Rahim
Activity: CCTV Installation
Project: PRJ-2026-019
Customer: ABC Bank
Site: Uttara Branch
Reference: WO-1034
Date: 08-09-2026
Duration: 6h 20m
Status: COMPLETED
Customer Accepted: YES
```

---

# 7. ACTIVITY TYPES

Use existing activity/task types if already present.

Recommended conceptual categories:

```text
INSTALLATION
MAINTENANCE
SERVICE
BREAKDOWN
COMPLAINT
INSPECTION
SITE_VISIT
CONFIGURATION
COMMISSIONING
TROUBLESHOOTING
SURVEY
DELIVERY_SUPPORT
PROJECT_TASK
WAREHOUSE_SUPPORT
TRAINING
REWORK
OTHER
```

Do not add every category blindly. Reuse the existing enum/taxonomy where possible.

---

# 8. ASSIGNMENT LIFECYCLE

Employee work should be traceable through:

```text
ASSIGNED
→ ACCEPTED
→ STARTED
→ IN_PROGRESS
→ COMPLETED
→ VERIFIED
→ CUSTOMER_ACCEPTED
→ CLOSED
```

Existing status values must be reused where possible.

Do not introduce duplicate status enums for the same business object.

---

# 9. WORK STATUS RULES

The system should distinguish:

### Assigned

Work was allocated to the employee.

### Started

Employee actually began the work.

### Completed

Employee marked the work technically complete.

### Verified

Supervisor/authorized user verified the work.

### Customer Accepted

Customer/site representative accepted the work where applicable.

### Closed

The business workflow is fully completed.

This distinction is important for accurate performance reporting.

---

# 10. “ASSIGNED” IS NOT “COMPLETED”

Never count an assignment as completed merely because it was assigned.

Example:

```text
Rahim
Assigned = 20
Started = 18
Completed = 15
Verified = 14
Customer Accepted = 13
```

The dashboard must show all stages separately.

---

# 11. EMPLOYEE DASHBOARD

Create/extend an Employee Dashboard.

Top cards:

```text
Total Assigned
In Progress
Completed
Pending
Overdue
Completion %
On-Time %
Customer Accepted
Rework
```

For technicians:

```text
Service Calls
Installations
Maintenance
Site Visits
Products Used
Products Returned
Damage
Lost
```

Use existing dashboard card components.

---

# 12. EMPLOYEE PROFILE

Employee detail page should contain:

```text
Overview
Work
Assignments
Projects
Service
Time
Products
Performance
Incidents
History
```

Do not create a separate Technician Profile system if the existing Employee/Technician profile already exists.

---

# 13. EMPLOYEE WORK TAB

Show:

```text
Date
Work Type
Customer
Project
Reference
Site
Priority
Start
End
Duration
Status
Outcome
Customer Acceptance
```

Filters:

```text
Date Range
Work Type
Customer
Project
Status
Priority
Branch
Site
```

---

# 14. EMPLOYEE WORKLOAD

Management needs to see current workload.

Example:

```text
Employee       Assigned   In Progress   Pending   Overdue
Rahim             18          5           10         2
Karim             14          4            7         1
Hasan             22          8            9         3
```

Clicking an employee must drill down into the actual assignments.

---

# 15. WORKLOAD BALANCING

If supported by the existing Service/Assignment module, provide workload visibility:

```text
Light workload
Normal workload
Heavy workload
Overloaded
```

Do not automatically reassign work without an explicit business rule.

A manager may use the report to redistribute assignments.

---

# 16. TIME TRACKING

If the existing application has time tracking/attendance/timesheet:

REUSE IT.

Do not create another attendance system.

Performance calculations may use:

```text
Actual Start
Actual End
Tracked Duration
```

only when reliable data exists.

If no reliable time data exists, the dashboard must NOT fabricate hours.

---

# 17. RESPONSE TIME

For service/complaint work, where timestamps exist:

```text
Response Time
= Actual Start - Assignment/Complaint Created Time
```

Example:

```text
Complaint Created: 10:00
Technician Started: 11:15

Response Time = 1h 15m
```

Report:

```text
Average Response Time
Median Response Time
Maximum Response Time
```

Use existing SLA timestamps if available.

---

# 18. RESOLUTION TIME

Where applicable:

```text
Resolution Time
= Completion Time - Work Start / Complaint Created
```

The exact business definition must follow the existing service/SLA configuration.

Do not mix response time and resolution time.

---

# 19. COMPLETION RATE

Recommended:

```text
Completion Rate
= Completed Eligible Assignments
  / Total Eligible Assignments
× 100
```

Cancelled assignments should not automatically count against an employee if cancellation was not caused by the employee.

The exact exclusion rules must be documented.

---

# 20. ON-TIME COMPLETION

If due date exists:

```text
On-Time
= Completed At <= Due Date
```

Report:

```text
On-Time %
Late %
Overdue Open
```

If no due date exists, do not calculate on-time performance.

---

# 21. REWORK RATE

Where rework can be reliably identified:

```text
Rework Rate
= Rework Jobs / Completed Jobs × 100
```

Rework must come from an actual rework event/reference, not a manually entered score.

Possible reasons:

```text
Installation Error
Configuration Error
Incomplete Work
Customer Complaint
Quality Issue
Material Issue
External Cause
Other
```

The existing service/task taxonomy should be reused.

---

# 22. CUSTOMER ACCEPTANCE

Where customer acceptance exists, report:

```text
Customer Accepted
Customer Rejected
Pending Acceptance
Acceptance %
```

Do not interpret lack of customer acceptance as rejection unless the existing business rule says so.

---

# 23. PROJECT CONTRIBUTION

An employee may work on multiple projects.

Project contribution report:

```text
Employee
Project
Customer
Role
Tasks Completed
Hours (if available)
Products Used
Service Calls
Completion %
```

Example:

```text
Rahim
├── Project A
│   ├── 12 Tasks
│   └── 74h
├── Project B
│   ├── 7 Tasks
│   └── 41h
└── Project C
    ├── 4 Tasks
    └── 19h
```

Only show hours when the underlying system has actual time data.

---

# 24. PRODUCT ACTIVITY

Employee performance should integrate with existing ProductCustody.

Show:

```text
Products Assigned
Products Used
Products Installed
Products Returned
Products Damaged
Products Lost
```

For serialized products:

```text
Product
Serial
Project
Custody Date
Used Date
Returned Date
Final State
```

Do not duplicate ProductCustody records.

---

# 25. DAMAGE/LOSS ACCOUNTABILITY

Employee Damage/Loss reporting must reuse the existing ProductCustody and Damage/Loss workflow.

Example:

```text
Employee: Rahim

Products Received: 25
Installed: 20
Returned Good: 4
Damaged: 1
Lost: 0
```

This is an operational report.

Do NOT automatically interpret damage/loss as employee financial liability.

Liability/recovery requires an approved business decision.

---

# 26. EMPLOYEE INCIDENT REPORT

Show:

```text
Incident Type
Date
Product/Serial
Project
Reference
Reason
Evidence
Approval
Disposition
Recovery
```

Incident types may include:

```text
Damage
Loss
Rework
Customer Rejection
Safety Incident
Policy Exception
```

Only use types supported by the existing system.

---

# 27. EMPLOYEE PERFORMANCE SCORE

Do not create an opaque “AI score” without explainable components.

If a composite score is required, make it configurable.

Example:

```text
Completion        30%
On-Time           20%
Customer Accept.  20%
Quality/Rework    15%
Response SLA      10%
Inventory Care     5%
```

These percentages are examples only.

Management must be able to configure KPI weights if the application supports configurable business rules.

Every score must show its underlying metrics.

---

# 28. PERFORMANCE PERIOD

Support:

```text
Today
This Week
This Month
Last Month
Quarter
Year
Custom Range
```

All metrics must be calculated against the selected period.

Timezone must use the organization's configured timezone.

---

# 29. EMPLOYEE COMPARISON

Management may compare employees using the same period and KPI definition.

Example:

| Employee | Assigned | Completed | Completion | On-Time | Rework | Accepted |
|---|---:|---:|---:|---:|---:|---:|
| Rahim | 32 | 29 | 91% | 88% | 3% | 94% |
| Karim | 27 | 21 | 78% | 74% | 8% | 86% |
| Hasan | 35 | 33 | 94% | 92% | 2% | 97% |

The UI must clearly indicate the selected period and filters.

---

# 30. EMPLOYEE → CUSTOMER REPORT

Management should be able to answer:

> “Rahim কোন কোন customer-এর জন্য কত কাজ করেছে?”

Report:

```text
Employee
Customer
Projects
Service Calls
Installations
Maintenance
Completed
Pending
```

Drill-down to source records.

---

# 31. EMPLOYEE → PROJECT REPORT

Question:

> “এই project-এ কোন employee কত কাজ করেছে?”

Show:

```text
Employee
Tasks
Completed
Pending
Rework
Hours (if available)
Products Used
Site Visits
Customer Acceptance
```

This is particularly important for project-based CCTV/PABX/Access Control installations.

---

# 32. EMPLOYEE → MONTHLY TREND

Provide:

```text
Month
Assigned
Started
Completed
Overdue
Rework
Customer Accepted
```

Example:

```text
Jan → 22 / 19 / 2 rework
Feb → 28 / 25 / 1 rework
Mar → 31 / 29 / 2 rework
```

Use the existing chart components.

---

# 33. MANAGER DASHBOARD

Management dashboard may include:

```text
Total Active Employees
Employees Working Today
Open Assignments
Overdue Assignments
Completed Today
Completed This Month
Average Completion Rate
Average On-Time Rate
Pending Customer Acceptance
Rework
Damage/Loss
```

Click any metric to drill down to source records.

---

# 34. TEAM / DEPARTMENT PERFORMANCE

Where department/team structure exists:

```text
Department
Team
Employee
```

Example:

```text
Service Department
 ├── Team A
 │    ├── Rahim
 │    └── Karim
 └── Team B
      ├── Hasan
      └── Rafi
```

Reuse the existing organizational hierarchy.

---

# 35. ROLE-BASED VISIBILITY

Recommended:

### Employee

Can view:

- Own work
- Own assignments
- Own performance
- Own product custody
- Allowed project information

### Supervisor

Can view:

- Team work
- Team workload
- Team performance
- Team incidents

### Manager

Can view:

- Department/team performance
- Project contribution
- Productivity
- Cost/value reports

### Admin/Super Admin

Can view all authorized organizational data.

Use existing RBAC.

---

# 36. PRIVACY / ACCESS CONTROL

Performance information is sensitive business data.

The application must enforce:

```text
Organization
Branch
Department
Team
Role
```

scoping according to existing authorization rules.

Do not expose one employee's private information to another employee unless permitted.

---

# 37. REPORTS

Required reports:

### Employee Work

- Employee Work Ledger
- Employee Assignment Report
- Employee Completion Report
- Employee Pending Work
- Employee Overdue Work
- Employee Customer-wise Work
- Employee Project-wise Work
- Employee Monthly Work

### Performance

- Employee Performance
- Team Performance
- Department Performance
- Completion KPI
- SLA KPI
- Rework KPI
- Customer Acceptance KPI
- Workload Report

### Inventory Accountability

- Employee Product Custody
- Employee Product Usage
- Employee Product Return
- Employee Damage/Loss

All reports should reuse existing export and drill-down capabilities.

---

# 38. EXPORT

Use the existing export system.

Support existing formats where available:

```text
CSV
PDF
DOCX
XML
Print
```

Do not build separate export libraries for this module.

---

# 39. AUDIT TRAIL

Employee performance must be based on auditable events.

Audit relevant changes:

```text
Assignment Created
Employee Assigned
Assignment Reassigned
Work Started
Work Completed
Work Reopened
Work Verified
Customer Accepted
Customer Rejected
Product Issued
Product Returned
Damage Reported
Loss Reported
Approval
```

Do not allow users to silently modify historical work metrics.

---

# 40. REASSIGNMENT RULE

If a work order moves:

```text
Rahim → Karim
```

the history must preserve:

```text
Originally Assigned To: Rahim
Reassigned To: Karim
Date
Reason
Changed By
```

Do not overwrite the historical assignment.

For performance:

- Work performed before reassignment belongs to the appropriate employee based on actual recorded activity.
- Final completion should not automatically be credited entirely to the last assignee if the system has multi-user activity history.

The exact attribution rule must be documented and consistently applied.

---

# 41. MULTI-EMPLOYEE WORK

Some projects/jobs involve multiple employees.

Do not force one employee per job if the existing model supports multiple assignees.

Example:

```text
WO-1001
Primary: Rahim
Assistant: Karim
Supervisor: Hasan
```

Performance attribution should be configurable.

Possible models:

```text
Primary employee gets completion credit
Equal contribution
Task-level attribution
Time-based attribution
Role-based attribution
```

Use the simplest model supported by existing data.

Never fabricate contribution percentages.

---

# 42. PERFORMANCE DATA QUALITY

If a KPI cannot be calculated reliably, display:

```text
N/A
```

instead of:

```text
0%
```

Example:

If no due dates exist:

```text
On-Time Completion: N/A
```

Do not incorrectly penalize the employee.

---

# 43. NO MANUAL KPI EDITING

Management should not directly edit:

```text
Completion %
Performance Score
Rework %
On-Time %
```

These must be calculated from source records.

If a business adjustment is required, create a governed adjustment mechanism with:

```text
Reason
Approver
Date
Audit Trail
```

and keep the original calculated metric visible.

---

# 44. API GUIDELINE

Reuse existing API conventions and `/api/v1/`.

Conceptual endpoints:

```text
GET /api/v1/employees/:id/work
GET /api/v1/employees/:id/performance
GET /api/v1/employees/:id/workload
GET /api/v1/employees/:id/projects
GET /api/v1/employees/:id/service
GET /api/v1/employees/:id/products
GET /api/v1/employees/:id/incidents

GET /api/v1/reports/employees/work
GET /api/v1/reports/employees/performance
GET /api/v1/reports/teams/performance
```

If equivalent endpoints already exist, extend them.

Do not create duplicate controllers/services.

---

# 45. QUERY / PERFORMANCE REQUIREMENTS

Employee reports may aggregate large datasets.

Use:

- Pagination
- Indexed filters
- Date-range filtering
- Organization/branch scoping
- Server-side aggregation
- Caching where appropriate
- Existing report/query infrastructure

Do not load every historical activity into the browser.

---

# 46. DATABASE INDEXING

Only add indexes after inspecting existing indexes.

Potentially useful composite indexes:

```text
employeeId + createdAt
employeeId + status
employeeId + projectId
employeeId + serviceAssignmentId
employeeId + dueDate
```

Exact indexes must be based on actual query patterns.

Do not add unnecessary indexes.

---

# 47. DASHBOARD CACHING

If the application already has Redis/cache infrastructure, reuse it.

Performance dashboard data may be cached for a short period.

However:

- Source records remain authoritative.
- Cache must invalidate after relevant updates.
- Critical financial/inventory values should use appropriate freshness guarantees.

---

# 48. ACCOUNTING / FINANCE SEPARATION

Employee performance must NOT automatically equal financial value.

Example:

```text
Employee completed 20 jobs
```

does not mean:

```text
Employee generated ৳20 lakh
```

unless the business rule explicitly defines billable contribution.

Where project/service financial contribution is required, use existing:

```text
Project
Invoice
Cost
Timesheet
Product Usage
Service Cost
```

data.

Do not invent financial attribution.

---

# 49. EMPLOYEE COST

If employee salary/cost accounting exists in the application:

Use the existing HR/Finance source.

If it does not exist, do not introduce payroll just for this feature.

The report may show:

```text
Billable Work Value
Project Contribution
```

only if supported by actual source data.

---

# 50. UI DESIGN PRINCIPLE

The Employee Performance UI must be:

- Data-dense but readable.
- Management-oriented.
- Drill-down capable.
- Filterable.
- Exportable.
- Mobile/tablet responsive.
- Consistent with existing design system.

Do not create a visually unrelated dashboard.

Reuse:

```text
PageHeader
StatCard
DataTable
SearchFilterBar
Tabs
StatusBadge
Drawer
Modal
Chart
Timeline
ExportMenu
```

if these components already exist.

---

# 51. EMPLOYEE PERFORMANCE PAGE

Recommended layout:

```text
Employee Header
Name | Department | Role | Status

KPI Cards
Assigned | Completed | Pending | On-Time | Rework

Tabs
Overview
Work
Projects
Service
Products
Performance
Incidents
History

Overview
    ↓
Work Trend
    ↓
Current Workload
    ↓
Recent Activities
```

---

# 52. EMPLOYEE WORK DETAIL

Clicking a work record must open the existing source entity or a linked detail view.

Example:

```text
Employee Work
    ↓
WO-1034
    ↓
Service Assignment
    ↓
Project
    ↓
Customer
    ↓
Site
    ↓
Products / Serial
    ↓
Timeline
```

Do not duplicate the entire Work Order data into the Employee module.

---

# 53. EMPLOYEE TIMELINE

A unified timeline is strongly recommended:

```text
08:10 Assigned WO-1001
09:00 Started Site Visit
10:20 Product SN123 issued
12:30 Installation completed
13:00 Customer acceptance
15:00 Returned unused product
16:00 Closed work order
```

This should aggregate existing events rather than create duplicate activity records.

---

# 54. AI AGENT IMPLEMENTATION RULE

Before modifying anything:

```text
1. Read agent.md
2. Read prd.md
3. Read architecture-2.md
4. Read feature-update.md
5. Inspect repository
6. Map existing entities/services
7. Identify reusable components
8. Produce implementation plan
9. Implement smallest extension
10. Run tests
11. Update documentation
```

The agent must report:

```text
Existing functionality reused:
New functionality added:
Files changed:
Migration:
APIs:
UI:
Tests:
Known limitations:
Next step:
```

---

# 55. HANDOFF BETWEEN AI AGENTS

Multiple AI agents may work on the same feature.

Every completed agent must leave a handoff note.

Minimum handoff:

```text
FEATURE:
Employee Work Tracking & Performance

COMPLETED:
- ...

FILES CHANGED:
- ...

DATABASE:
- ...

APIs:
- ...

UI:
- ...

TESTS:
- ...

KNOWN ISSUES:
- ...

NOT IMPLEMENTED:
- ...

NEXT STEP:
- ...
```

The next agent MUST continue from this state.

Do not rebuild completed functionality.

---

# 56. ACCEPTANCE CRITERIA

The feature is complete only if:

- Employee work can be viewed by date range.
- Work can be filtered by customer/project/status/type.
- Employee workload is visible.
- Assigned and completed are separated.
- Pending and overdue work are visible.
- Completion rate is calculated from actual records.
- On-time KPI uses actual due dates.
- Rework uses actual rework records.
- Customer acceptance uses actual acceptance data.
- Project contribution is visible.
- Service contribution is visible.
- Product custody is visible.
- Damage/loss can be linked to employee custody where applicable.
- Existing inventory records are not duplicated.
- Existing service records are not duplicated.
- Existing employee records are not duplicated.
- Drill-down reaches source records.
- RBAC is enforced.
- Audit trail is preserved.
- Reports are exportable.
- Metrics show N/A when source data is insufficient.
- Reassignment history is preserved.
- Multi-employee work does not lose attribution.
- Performance calculations are explainable.

---

# 57. TEST MATRIX

## Work Tracking

1. Assign work.
2. Accept work.
3. Start work.
4. Complete work.
5. Verify work.
6. Customer accepts work.
7. Customer rejects work.
8. Reopen work.
9. Reassign work.
10. Verify historical attribution.

## Performance

11. Calculate completion rate.
12. Calculate on-time rate.
13. Calculate response time.
14. Calculate resolution time.
15. Calculate rework rate.
16. Calculate customer acceptance.
17. Verify cancelled jobs are handled correctly.
18. Verify overdue jobs.
19. Verify custom date range.
20. Verify month comparison.

## Product

21. Assign product to employee.
22. Return product.
23. Damage product.
24. Lose product.
25. Verify Employee Performance links to ProductCustody.
26. Verify no duplicate custody record.

## Security

27. Employee sees only permitted data.
28. Supervisor sees team.
29. Manager sees department.
30. Admin sees authorized organization data.
31. Unauthorized KPI/API access is rejected.

## Reporting

32. Employee report.
33. Team report.
34. Project report.
35. Customer report.
36. Export.
37. Drill-down.
38. Empty-state handling.
39. Large date-range performance.

---

# 58. MIGRATION SAFETY

If no new database table is required, prefer a reporting/service layer.

If schema changes are required:

1. Backup database.
2. Inspect existing records.
3. Add nullable/backward-compatible fields first.
4. Migrate historical data only when deterministic.
5. Never fabricate historical employee activities.
6. Run migration in staging.
7. Verify counts.
8. Verify performance reports against known records.
9. Verify existing service/project/inventory behavior.
10. Deploy only after regression tests.

---

# 59. DEFINITION OF DONE

The feature is NOT complete because an Employee Dashboard exists.

It is complete only when:

```text
Existing Source Records
        ↓
Employee Activity Aggregation
        ↓
Business Rules
        ↓
Performance Calculations
        ↓
RBAC
        ↓
UI
        ↓
Drill-down
        ↓
Reports
        ↓
Audit
        ↓
Tests
```

all work consistently.

---

# 60. FINAL ARCHITECTURAL PRINCIPLE

The Employee Work Tracking system must be a **reporting and performance layer over existing business transactions**, not a parallel transaction system.

Correct architecture:

```text
                    EXISTING BUSINESS MODULES
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ↓              ↓       ↓        ↓              ↓
   Service        Projects  Tasks  ProductCustody  Audit
       │              │       │        │              │
       └──────────────┴───────┼────────┴──────────────┘
                              ↓
                    Employee Work Aggregation
                              ↓
                 ┌────────────┴────────────┐
                 ↓                         ↓
          Work Ledger                KPI Engine
                 ↓                         ↓
                 └────────────┬────────────┘
                              ↓
                 Employee Performance UI
                              ↓
                 Reports / Dashboard
                              ↓
                    Drill-down to source
```

Core rule:

> **Every employee performance number must be explainable by underlying business records.**

If the dashboard says:

```text
Rahim completed 29 jobs
```

the user must be able to click **29** and see the exact 29 source jobs.

If it says:

```text
Rahim has 3% rework
```

the user must be able to see which jobs were classified as rework and why.

If it says:

```text
Rahim has 1 damaged product
```

the user must be able to trace:

```text
Employee
→ ProductCustody
→ Product/Serial
→ Project
→ Damage Report
→ Approval
→ Inventory Transaction
→ Audit Trail
```

This traceability is mandatory for a production-grade ERP/project/service management system.
