# ROLE-BASED ACCESS & DASHBOARD FEATURE UPDATE

## Existing ERP / Service Management Application

**Document Type:** Feature Update / Security & UX Authorization Guideline  
**Version:** 1.0  
**Date:** 2026-09-08  
**Priority:** CRITICAL  
**Implementation Target:** Existing Application — Extend, Do Not Duplicate

---

# 1. PURPOSE

This document defines the required role-based application experience and authorization architecture for the existing application.

The objective is to ensure that:

1. Every user sees only the modules relevant to their role.
2. Every user receives an appropriate dashboard.
3. A user cannot access unauthorized data through hidden menus, direct URLs, API calls, exports, downloads, search, reports, or manipulated requests.
4. Technicians can perform their complete field work without seeing Finance, HR, Accounts, unrelated employee data, or other users' operational data.
5. Accounts users can perform finance operations without unnecessary HR, technician, or warehouse access.
6. HR users can perform HR operations without unnecessary accounting or operational access.
7. Admin and Super Admin are intentionally separated.
8. Role permissions, action permissions, data scope, and field-level restrictions are enforced consistently.
9. UI, API, service layer, and database security remain aligned.
10. Existing RBAC infrastructure is extended rather than unnecessarily replaced.

---

# 2. CORE SECURITY PRINCIPLE

The system MUST NOT treat:

```text
Hidden Menu = Security
```

as valid security.

The correct authorization model is:

```text
Authentication
      ↓
Role Resolution
      ↓
Permission Resolution
      ↓
Data Scope Resolution
      ↓
Field-Level Authorization
      ↓
UI / Dashboard
      ↓
API Authorization
      ↓
Service Authorization
      ↓
Database / RLS Enforcement
```

A user who cannot see a menu must also be unable to access the same functionality through:

- Direct URL
- Browser developer tools
- REST API
- GraphQL, if used
- Export
- Search
- Report endpoint
- File download
- WebSocket
- Background endpoint
- Manipulated request payload

---

# 3. EXISTING ARCHITECTURE PRINCIPLE TO PRESERVE

The application should remain one unified ERP/service-management platform.

Do NOT create completely separate applications for:

```text
Technician
Accounts
HR
Warehouse
Sales
Admin
```

unless the existing architecture explicitly requires it.

Preferred model:

```text
ONE APPLICATION
        +
ONE AUTHENTICATION SYSTEM
        +
ONE AUTHORIZATION SYSTEM
        +
ROLE-SPECIFIC DASHBOARDS
        +
ROLE-SPECIFIC MODULES
        +
ROLE-SPECIFIC DATA SCOPE
```

---

# 4. CRITICAL ADMIN CORRECTION

The existing specification describes Admin very broadly.

For the updated requirement, the application MUST distinguish:

```text
SUPER ADMIN
```

from:

```text
ADMIN
```

Admin must not automatically mean unrestricted access to every department.

---

# 5. SUPER ADMIN

Super Admin is the highest trusted application role.

Typical access:

```text
All operational modules
All branches
All organizations where applicable
All users
All reports
Role management
Permission management
Security settings
Audit
System configuration
```

All Super Admin actions must still be audited.

Super Admin means:

```text
Maximum Authorized Scope
+
Full Auditability
```

It does NOT mean:

```text
No Audit
```

---

# 6. ADMIN

Admin must be permission-driven.

Conceptually:

```text
Admin
 ↓
Assigned Permissions
 ↓
Assigned Scope
 ↓
Allowed Modules
 ↓
Allowed Actions
```

Possible Admin profiles include:

```text
Operations Admin
Branch Admin
Service Admin
Inventory Admin
Project Admin
```

Only profiles actually needed by the existing business should be implemented.

---

# 7. ROLE MODEL

Recommended baseline:

| Role | Primary Experience | Typical Scope |
|---|---|---|
| Super Admin | Global ERP | All authorized organization data |
| Admin | Administrative Operations | Assigned scope |
| Accounts | Finance | Finance/accounting scope |
| HR Admin | HR | HR/employee scope |
| Branch Manager | Branch Operations | Own branch |
| Sales | Sales/CRM | Assigned customers/leads |
| Warehouse | Inventory | Assigned warehouse/branch |
| Technician | Field Service | Own assignments/custody |
| Customer | Customer Portal | Own organization/data |
| Vendor | Vendor Portal | Own vendor data |

Before changing role enums/tables, inspect the actual repository and preserve existing equivalent roles where possible.

---

# 8. AUTHORIZATION LAYERS

Authorization MUST operate at five levels.

## Level 1 — Module Permission

```text
SERVICE.READ
INVENTORY.READ
FINANCE.READ
HR.READ
```

## Level 2 — Action Permission

```text
INVOICE.CREATE
INVOICE.POST
INVOICE.REVERSE
CHALLAN.CONFIRM
CHALLAN.RETURN
DAMAGE_LOSS.APPROVE
PAYMENT.POST
```

## Level 3 — Data Scope

```text
OWN
ASSIGNED
TEAM
BRANCH
WAREHOUSE
DEPARTMENT
ORGANIZATION
GLOBAL
```

## Level 4 — Field Scope

```text
Employee basic profile → allowed
Employee salary → restricted
Employee NID → restricted
Bank account → restricted
Payment raw response → restricted
```

## Level 5 — Document Scope

Every document must follow the authorization scope of its owning entity.

---

# 9. DATA SCOPE

Where required, support:

```text
OWN
ASSIGNED
TEAM
DEPARTMENT
BRANCH
WAREHOUSE
ORGANIZATION
GLOBAL
```

Do not create unused scopes merely for theoretical completeness.

---

# 10. TECHNICIAN DASHBOARD

Technician login should lead to a dedicated mobile-first dashboard.

Recommended modules:

```text
Today's Jobs
My Assignments
My Sites
My Customers
My Products / Custody
Check-in / Check-out
GPS / Visit
Work Progress
Closure Report
Advance
Conveyance
Notifications
My KPI
Profile
```

---

# 11. TECHNICIAN MUST NOT SEE

Unless explicitly required by a contextual workflow:

```text
Finance
Accounting Ledger
Payroll
Salary
HR confidential data
Supplier payment
Company bank accounts
Other technicians' assignments
Other employees' private information
System Settings
Role Management
User Management
Global Reports
Profit Margin
Purchase Cost
```

---

# 12. TECHNICIAN CONTEXTUAL DATA

A technician may receive only the customer/project information required to complete assigned work:

```text
Customer Name
Site Name
Site Address
Contact Person
Contact Phone
Work Description
Assigned Products
Serial Numbers
Installation Instructions
Relevant Service History
```

Do not expose:

```text
Customer AR
Customer Profitability
Purchase Cost
Supplier Information
Unrelated Project Data
```

unless explicitly authorized.

---

# 13. TECHNICIAN DATA SCOPE

Technician A should conceptually query:

```text
assignment.technicianId = currentUser.id
```

and similarly:

```text
custody.technicianId = currentUser.id
location.employeeId = currentUser.id
advance.employeeId = currentUser.id
```

Actual field names must match the existing schema.

---

# 14. TECHNICIAN SECURITY TEST

This must fail when unauthorized:

```text
GET /api/assignments?technicianId=OTHER_USER
```

Changing:

```text
technicianId
employeeId
branchId
projectId
customerId
```

must never expand access beyond the user's authorized scope.

---

# 15. ACCOUNTS DASHBOARD

Accounts should receive a finance-oriented dashboard:

```text
Cash Position
Bank Position
Receivable
Payable
Collections
Payments
Customer Advances
Supplier Advances
Pending Vouchers
Pending Finance Approvals
Invoice Status
Credit Notes
Project Billing
Finance Reports
```

---

# 16. ACCOUNTS RESTRICTIONS

Accounts users should not automatically see:

```text
Employee Salary Details
Private HR Documents
Technician GPS
Technician Personal Data
Warehouse Operational Controls
Security Configuration
Role Management
Unrelated Customer Private Documents
```

Contextual data is allowed when required.

Example: for a technician conveyance claim, Accounts may see:

```text
Employee Name
Project
Claim Amount
Date
Supporting Document
Approval Status
```

but not the employee's complete HR record.

---

# 17. HR ADMIN DASHBOARD

HR should receive:

```text
Employees
Attendance
Leave
Payroll
Salary Structure
Loans
Advances
HR Documents
Employee KPI
HR Reports
```

---

# 18. HR RESTRICTIONS

HR should not automatically access:

```text
General Ledger
Supplier Payments
Warehouse Stock Controls
Customer AR
Payment Gateway Raw Data
Technician GPS History
System Security Configuration
```

unless explicitly required and authorized.

---

# 19. SALARY FIELD SECURITY

Salary information must be field-restricted.

Example:

```text
Employee Name → normal employee access
Designation → normal employee access
Department → normal employee access

Salary → HR / explicitly authorized Finance
Bank Account → highly restricted
NID / private documents → restricted
```

Generic employee APIs must not return restricted fields to unauthorized roles.

---

# 20. BRANCH MANAGER

Branch Manager dashboard may include:

```text
Branch KPIs
Projects
Service
Sales
Challans
Returns
Inventory Overview
Technician Work Summary
Collections Summary where authorized
Branch Reports
Approvals
```

Scope:

```text
OWN BRANCH
```

unless explicit cross-branch permission exists.

---

# 21. SALES DASHBOARD

Sales may access:

```text
Leads
Customers
Quotes
Sales Orders
Projects
Challan Status
Invoice Status
Collections Summary
Customer Follow-up
Sales Reports
```

Financial details should be minimized.

Example:

```text
Invoice Status → allowed
Customer Outstanding → only if permitted
Cost Price → restricted
Gross Margin → restricted
Payroll → denied
```

---

# 22. WAREHOUSE DASHBOARD

Warehouse users may access:

```text
Stock Summary
Receiving
GRN
Putaway
Challan
Dispatch
Return
Damage/Loss
Serial Tracking
Batch Tracking
Stock Adjustments
Warehouse Reports
```

Scope:

```text
Assigned Warehouse(s)
```

---

# 23. WAREHOUSE RESTRICTIONS

Warehouse users should not automatically access:

```text
Employee Salary
Payroll
General Ledger
Customer Private Finance
Supplier Bank Details
Role Management
System Configuration
```

---

# 24. CUSTOMER PORTAL

Customer users should see only their own customer/organization data:

```text
Projects
Service Requests
Assignments
Challans
Delivered Products
Returns
Invoices
Payments
Documents
Service Reports
Support
```

Never expose:

```text
Internal Cost
Employee Salary
Supplier Data
Other Customers
Internal Notes
Internal Approval Comments
```

unless explicitly designed as customer-visible.

---

# 25. VENDOR PORTAL

Vendor users should see only their own vendor scope:

```text
Purchase Orders
GRN status where appropriate
Return to Vendor
Invoices
Payments
Documents
```

No other vendor's data.

---

# 26. DASHBOARD WIDGET SECURITY

Do not calculate unauthorized data and merely hide it visually.

Bad:

```text
API returns all company revenue
Frontend hides revenue from Technician
```

Correct:

```text
API calculates revenue only within authorized scope
Frontend receives only permitted metrics
```

---

# 27. SIDEBAR/MENU

Navigation should be permission-aware.

Example:

```text
SERVICE.READ
CHALLAN.READ
CHALLAN.CREATE
```

may show:

```text
Service
Challan
```

However:

> Frontend navigation is a UX layer, not the security boundary.

---

# 28. ROUTE GUARD

Direct navigation must be blocked.

Example:

```text
Technician
→ /admin/finance
→ 403 Unauthorized
```

Do not depend on hiding the link.

---

# 29. API AUTHORIZATION

Every protected API must resolve:

```text
currentUser
+
role
+
permission
+
scope
```

before returning data.

Example:

```text
GET /employees
```

must not return all employees merely because:

```text
EMPLOYEE.READ
```

exists.

The authorized data scope must still be applied.

---

# 30. SERVICE-LEVEL AUTHORIZATION

Controllers must not be the only security layer.

Example:

```text
ChallanService.confirm(challanId)
```

must verify:

```text
User Permission
+
Branch Scope
+
Warehouse Scope
+
Current Status
+
Business Rules
```

Use the existing domain/service architecture.

---

# 31. DATABASE / RLS

Where PostgreSQL RLS is used, policies must reinforce application authorization.

Potentially sensitive entities include:

```text
StockLedger
SerialNumber
SKULifecycleEvent
ApprovalRequest
Document
Employee-sensitive records
Financial transactions
```

The exact RLS implementation must be based on the actual schema.

---

# 32. BRANCH / ORGANIZATION SCOPE

For security-sensitive or high-volume records, direct:

```text
branchId
organizationId
```

may be necessary.

Do not add redundant fields blindly.

First determine whether authoritative relations such as:

```text
Warehouse → Branch → Organization
```

are guaranteed and performant.

If RLS or query performance requires direct scope fields, add them with consistency enforcement.

---

# 33. CLIENT-SUPPLIED SCOPE IS NEVER TRUSTED

Never trust client values such as:

```text
organizationId
branchId
warehouseId
technicianId
employeeId
```

to define authorization.

The backend must derive or validate scope from the authenticated user's authorization context.

---

# 34. FIELD-LEVEL AUTHORIZATION

APIs should return only required fields.

Example employee object:

```text
{
  id,
  name,
  designation,
  department,
  salary,
  bankAccount
}
```

Technician should receive only:

```text
{
  id,
  name,
  designation,
  department
}
```

Do not expose raw ORM entities directly if doing so leaks sensitive fields.

---

# 35. DOCUMENT SECURITY / IDOR

Every document download must:

```text
Authenticate
 ↓
Load Document
 ↓
Resolve Owner
 ↓
Resolve Organization / Branch
 ↓
Check Permission
 ↓
Check Object-Level Access
 ↓
Generate Temporary Signed URL
```

Never return unrestricted permanent S3 URLs.

S3 object naming is not an authorization mechanism.

---

# 36. APPROVAL SECURITY

For polymorphic references such as:

```text
refTable
refId
```

approval must:

```text
Resolve entity
→ Validate scope
→ Validate permission
→ Validate approver role
→ Validate current status
→ Validate approval policy
→ Execute atomically
```

Never authorize based only on `refTable + refId`.

---

# 37. ACTION-LEVEL PERMISSIONS

Separate read/write/approval/posting operations.

Example Challan:

```text
CHALLAN.READ
CHALLAN.CREATE
CHALLAN.UPDATE
CHALLAN.CONFIRM
CHALLAN.RETURN
CHALLAN.CANCEL
```

Invoice:

```text
INVOICE.READ
INVOICE.CREATE
INVOICE.POST
INVOICE.REVERSE
```

Damage/Loss:

```text
DAMAGE_LOSS.READ
DAMAGE_LOSS.CREATE
DAMAGE_LOSS.SUBMIT
DAMAGE_LOSS.APPROVE
DAMAGE_LOSS.REJECT
DAMAGE_LOSS.DISPOSE
```

---

# 38. FOUR-EYES PRINCIPLE

High-risk operations should require appropriate approval and must not automatically permit self-approval.

Examples:

```text
Large Stock Adjustment
Damage/Loss Write-off
Payment Posting
Invoice Reversal
Salary Change
Bank Change
Role/Permission Change
```

Use the existing ApprovalRequest infrastructure where appropriate.

---

# 39. MULTI-ROLE USERS

If users can have multiple roles, resolve:

```text
Effective Permissions
+
Effective Scope
```

Do not simply merge roles into unrestricted global access.

Example:

```text
TECHNICIAN + ACCOUNTS
```

does not automatically mean access to every employee's HR information.

Each permission retains its appropriate scope.

---

# 40. DASHBOARD KPI SECURITY

Metrics must use the same scope as the source data.

Technician:

```text
My Jobs = own assignments
```

Branch Manager:

```text
Branch Jobs = authorized branch
```

Super Admin:

```text
Global Jobs = authorized global scope
```

---

# 41. REPORT SECURITY

Reports must inherit the same authorization model.

A user must not bypass dashboard restrictions through:

```text
/reports/export
/api/reports
```

or by changing:

```text
branchId
organizationId
employeeId
```

in query parameters.

---

# 42. EXPORT SECURITY

Every export must enforce:

```text
Permission
+
Data Scope
+
Field Restrictions
```

Technician may export:

```text
Own assignment report
```

but not:

```text
All technician performance
```

without permission.

---

# 43. SEARCH SECURITY

Global search must never return unauthorized records.

Search must apply:

```text
Permission
+
Scope
+
Field Security
```

Do not build a global search that bypasses normal authorization.

---

# 44. NOTIFICATION SECURITY

Notifications must not leak sensitive data.

Technician example:

```text
New assignment at ABC Site.
```

not:

```text
ABC customer has overdue payment of ৳1,250,000.
```

unless explicitly required.

---

# 45. AUDIT

Sensitive actions should be audited:

```text
Login
Permission change
Role change
Salary access
Salary modification
Document access
Payment posting
Invoice reversal
Damage/Loss approval
Stock adjustment
Unauthorized access attempt
```

Never log secrets or sensitive payment credentials.

---

# 46. FAILED ACCESS ATTEMPTS

Security-relevant denied requests should be logged according to the application's audit/security policy.

Useful information:

```text
User
Action
Resource
Resource ID
Reason
Timestamp
Request/device context where permitted
```

Do not expose internal security details to users.

---

# 47. ROLE-SPECIFIC UX

Each role should feel like a dedicated application.

```text
Technician → Field Service
Accounts → Finance
HR → People
Warehouse → Inventory
Sales → Customer/Sales
Branch Manager → Operations
Admin → Administration
Super Admin → Global Management/Security
```

---

# 48. TECHNICIAN MOBILE/PWA

Technician mobile app should not be a compressed copy of the entire ERP.

It should prioritize:

```text
Assignments
Navigation
Check-in/out
GPS
Products
Custody
Work Report
Customer Acceptance
Expenses
Notifications
```

---

# 49. OFFLINE SECURITY

If offline mode exists:

```text
Only authorized assignments/data may be cached.
```

Do not cache:

```text
Payroll
Full customer database
Other employee data
Accounting ledger
Global reports
```

Offline data must follow an explicit expiration/invalidation policy.

---

# 50. BACKEND DTO / RESPONSE RULE

Use appropriate DTOs/serializers.

Possible conceptual DTOs:

```text
EmployeePublicDTO
EmployeeSummaryDTO
EmployeeHRDTO
EmployeeFinanceDTO
```

Do not expose complete ORM entities directly.

---

# 51. QUERY RULE

Protected queries must always include authorization scope.

Bad conceptual pattern:

```text
findMany()
```

Correct conceptual pattern:

```text
findMany({
    where: authorizedScope
})
```

Actual implementation must match the existing ORM and repository architecture.

---

# 52. CACHE SECURITY

Permission-sensitive cached responses must not be globally shared across incompatible scopes.

Cache keys must distinguish relevant:

```text
organization
branch
warehouse
role/scope
```

where required.

Never serve Branch A data from a cache generated for Branch B.

---

# 53. BACKGROUND JOB SECURITY

Background jobs must preserve the relevant authorization context.

A scheduled report for Branch A must not accidentally query all branches.

Where necessary, jobs should carry explicit:

```text
organizationId
branchId
scope
```

---

# 54. FILE EXPORT JOB SECURITY

Asynchronous export flow:

```text
Request
 ↓
Authorize
 ↓
Create Export Job with Scope Snapshot
 ↓
Generate Authorized Data
 ↓
Store Protected File
 ↓
Authorize Download
```

Do not generate a global export and attempt to filter only at download time.

---

# 55. MIGRATION STRATEGY

Do not immediately change existing role enums.

First inspect:

```text
User
Role
Permission
RolePermission
UserRole
Organization
Branch
```

and existing authorization services.

Then prepare:

```text
Existing Role
→ New Role / Permission Mapping
```

---

# 56. EXISTING ADMIN MIGRATION

Because existing Admin may currently have broad access:

```text
Existing ADMIN
```

must not be blindly converted to restricted Admin.

Recommended:

```text
Existing ADMIN
      ↓
Inventory existing permissions
      ↓
Review actual responsibilities
      ↓
Assign Admin profile
      ↓
Remove unnecessary sensitive permissions
      ↓
Audit
```

---

# 57. IMPLEMENTATION PHASES

## Phase 1 — Audit

Inspect:

```text
agent.md
prd.md
architecture.md
database-schema.md
existing authorization code
existing routes
existing middleware
existing UI navigation
```

## Phase 2 — Permission Inventory

List all existing permissions.

## Phase 3 — Scope Inventory

Map:

```text
organization
branch
warehouse
department
assignment
ownership
```

## Phase 4 — Gap Analysis

Compare current vs required.

## Phase 5 — Backend Authorization

Implement missing guards.

## Phase 6 — Database/RLS

Implement required database isolation.

## Phase 7 — Dashboard/UI

Implement role-specific dashboards and navigation.

## Phase 8 — Field Security

Restrict sensitive fields.

## Phase 9 — Reports/Exports/Search

Apply the same authorization scope.

## Phase 10 — Testing

Run security and regression tests.

## Phase 11 — User Permission Migration

Safely migrate existing users.

---

# 58. CLAUDE IMPLEMENTATION PROTOCOL

Claude MUST:

```text
1. Read agent.md and all current project specification files.
2. Inspect the actual repository.
3. Inspect current RBAC implementation.
4. Inspect role/permission schema.
5. Inspect authorization middleware.
6. Inspect API guards.
7. Inspect data-access/query layer.
8. Inspect current dashboards.
9. Inspect navigation.
10. Create an authorization gap report.
11. Create a permission matrix.
12. Create a scope matrix.
13. Create a field-security matrix.
14. Propose schema changes only where necessary.
15. Implement backend authorization.
16. Implement RLS/database changes where required.
17. Implement role-specific dashboards.
18. Implement role-specific navigation.
19. Implement field filtering.
20. Implement document authorization.
21. Update reports/exports/search.
22. Add automated security tests.
23. Run regression tests.
24. Create existing-user permission migration plan.
25. Apply migration only after validation.
26. Leave a detailed handoff.
```

---

# 59. CLAUDE MUST NOT

Claude MUST NOT:

```text
Create duplicate applications
Create duplicate user tables
Create duplicate role tables
Create duplicate permission engines
Create duplicate inventory systems
Create duplicate accounting systems
Create duplicate document systems
Rely only on frontend hiding
Trust client-supplied branchId
Trust client-supplied organizationId
Trust client-supplied technicianId
Return full ORM entities blindly
Expose S3 objects publicly
Allow status manipulation
Allow unauthorized exports
Bypass RLS
Disable existing authorization without replacement
Delete historical audit data
Change all Admin permissions blindly
```

---

# 60. SECURITY TEST MATRIX

Create automated tests such as:

| User | Resource | Expected |
|---|---|---|
| Technician A | Own Job | Allow |
| Technician A | Technician B Job | Deny |
| Technician A | Finance | Deny |
| Accounts | Invoice | Allow |
| Accounts | Salary | Deny unless explicitly permitted |
| HR | Employee | Allow |
| HR | General Ledger | Deny |
| Warehouse A | Warehouse A Stock | Allow |
| Warehouse A | Warehouse B Stock | Deny |
| Branch Manager A | Branch A | Allow |
| Branch Manager A | Branch B | Deny |
| Super Admin | Global | Allow |

---

# 61. IDOR TESTING

Test direct object access for:

```text
/document/:id
/project/:id
/challan/:id
/invoice/:id
/employee/:id
/assignment/:id
/expense/:id
```

Changing IDs must not bypass scope.

---

# 62. MASS-ASSIGNMENT PROTECTION

Do not accept protected fields blindly from clients:

```json
{
  "branchId": "other-branch",
  "approved": true,
  "status": "POSTED",
  "organizationId": "other-org"
}
```

Protected fields must be controlled by the domain/service layer.

---

# 63. STATUS MANIPULATION PROTECTION

Users must not bypass workflow by sending:

```text
status = APPROVED
status = POSTED
```

Use explicit domain commands:

```text
approve()
post()
confirm()
reverse()
```

with permission and state-transition validation.

---

# 64. REPORT AUTHORIZATION

Every report must define:

```text
Allowed Roles
Allowed Scope
Date Field
Branch Filter
Organization Filter
Sensitive Fields
Export Permission
Drill-down Permission
```

---

# 65. ROLE CONFIGURATION

Where the existing architecture supports configurable roles, Super Admin may manage:

```text
Roles
Permissions
Module Access
Action Access
Scope
```

Ordinary Admin must not automatically be allowed to modify its own permissions.

---

# 66. PERMISSION CHANGE AUDIT

When permissions change:

```text
Validate Actor
→ Record Old Permissions
→ Record New Permissions
→ Audit
→ Apply
```

Consider session/token invalidation where necessary.

---

# 67. PERFORMANCE RULE

Authorization must be secure without creating unnecessary N+1 database queries.

Prefer:

```text
Resolve Scope Once
+
Build Scoped Query
+
Fetch Required Records
```

Use appropriate indexes on actual query patterns.

---

# 68. SECURITY ACCEPTANCE CRITERIA

The implementation is NOT complete if:

```text
UI hides unauthorized menu
```

but:

```text
API still returns the data
```

It is complete only when:

```text
UI
+
Route
+
API
+
Service
+
Data Query
+
Database/RLS
+
Export
+
Document
+
Search
+
Report
```

all enforce the same authorization model.

---

# 69. FINAL AUTHORIZATION ARCHITECTURE

```text
                       USER
                         │
                         ↓
                  AUTHENTICATION
                         │
                         ↓
                  USER / ROLES
                         │
                         ↓
                    PERMISSIONS
                         │
                         ↓
                     DATA SCOPE
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
        FIELD SECURITY        DOCUMENT SECURITY
              │                     │
              └──────────┬──────────┘
                         ↓
                 API / SERVICE AUTH
                         │
                         ↓
                   DATABASE / RLS
                         │
                         ↓
              AUTHORIZED DATA ONLY
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
      DASHBOARD        REPORT         EXPORT
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                    AUDIT LOG
```

---

# 70. GOLDEN RULES

### Rule 1
> Role controls what the user can do.

### Rule 2
> Permission controls the specific action.

### Rule 3
> Scope controls which records the user can access.

### Rule 4
> Field security controls which attributes the user can see.

### Rule 5
> Document security controls which files the user can download.

### Rule 6
> Database/RLS provides defense in depth.

### Rule 7
> Frontend hiding is UX, not security.

### Rule 8
> Every sensitive action must be auditable.

### Rule 9
> Client-provided IDs never define authorization scope.

### Rule 10
> Never return unauthorized data and depend on the frontend to hide it.

---

# 71. FINAL TARGET EXPERIENCE

The final application should feel like:

```text
                     SAME ERP
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
      SUPER ADMIN     ADMIN        BRANCH
          │             │          MANAGER
          ↓             ↓             ↓
       GLOBAL       OPERATIONS      BRANCH
          │             │             │
          └─────────────┼─────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      ↓                 ↓                 ↓
   ACCOUNTS            HR             WAREHOUSE
      │                 │                 │
      ↓                 ↓                 ↓
   FINANCE            PEOPLE          INVENTORY
                        │
                        │
                   TECHNICIAN
                        ↓
                 FIELD OPERATIONS
```

The underlying system remains unified while each role sees only the experience and data required for its responsibilities.

---

# 72. FINAL CLAUDE INSTRUCTION

> Implement role-based access as a complete authorization architecture, not as a menu-hiding feature.
>
> First inspect the existing RBAC, role, permission, scope, middleware, API, service, database and dashboard implementation.
>
> Do not rebuild existing authorization infrastructure unless it is demonstrably inadequate.
>
> Separate Super Admin from ordinary Admin.
>
> Make Admin permission-driven rather than automatically all-powerful.
>
> Give Technician a dedicated task-focused dashboard and restrict the technician to own/assigned operational data.
>
> Give Accounts, HR, Warehouse, Sales and Branch Manager their own role-specific dashboards and scopes.
>
> Enforce authorization at UI, route, API, service, query, document and database levels.
>
> Never trust client-supplied organizationId, branchId, warehouseId, technicianId or employeeId to determine access.
>
> Never return sensitive fields simply because the parent record is accessible.
>
> Never allow exports, search, reports or document downloads to bypass authorization.
>
> Preserve the existing application architecture and data model.
>
> Do not create duplicate user, role, permission, inventory, accounting or document systems.
>
> Before changing production permissions, create a complete existing-user permission migration matrix.
>
> Test both allowed and denied access.
>
> Leave a detailed handoff after every implementation phase so another AI agent can continue from the exact current state.

---

# 73. DEFINITION OF DONE

This feature update is complete only when:

```text
Role model
        +
Permission model
        +
Data scope
        +
Field security
        +
Document security
        +
Dashboard
        +
Navigation
        +
API authorization
        +
Service authorization
        +
Database/RLS
        +
Reports
        +
Exports
        +
Search
        +
Audit
        +
Automated security tests
```

are aligned.

Final success criterion:

> **A Technician can complete every job he is responsible for without being exposed to unrelated company data, while Accounts, HR, Warehouse, Admin and other users receive the tools they need without receiving unnecessary or unauthorized access.**
