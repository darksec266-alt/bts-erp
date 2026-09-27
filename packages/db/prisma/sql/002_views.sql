-- Phase 1 — Reporting views (database.md §16, database-schema.md §27,
-- architecture.md §58.3). Same "not Prisma-managed, run as a manual
-- migration step" note as 001_rls_policies.sql.
--
-- security_invoker = true on every regular view, and an RLS-respecting
-- wrapper view in front of every materialized view (Postgres materialized
-- views cannot carry an RLS policy at all) — the security fix database.md
-- §16 applies to itself; carried through here identically. Application
-- code must query the wrapper view, never an `mv_`-prefixed table directly.

-- Ledger — Rule 1 (database.md §1): this IS the Ledger named as a model in
-- architecture.md §7.8; here it's a view, never a physical table.
CREATE VIEW "Ledger" WITH (security_invoker = true) AS
  SELECT jl."accountId", je."branchId", je."fiscalPeriodId",
         SUM(jl.debit) AS total_debit, SUM(jl.credit) AS total_credit
  FROM "JournalLine" jl JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
  WHERE je.status = 'POSTED'
  GROUP BY jl."accountId", je."branchId", je."fiscalPeriodId";

-- TrialBalance / ProfitAndLoss / BalanceSheet — named in database.md §16 as
-- views this schema needs, but never given literal SQL anywhere in the
-- source document set (only "these ARE the ... named as models in
-- architecture.md §7.8"). Not fabricated here as fact; build these during
-- Phase 10 (Accounting & Finance, prompt.md §194) directly against the
-- Chart of Accounts' accountType grouping and this file's "Ledger" view,
-- following the exact same security_invoker + branch-scoping pattern as
-- every view in this file.

CREATE MATERIALIZED VIEW mv_branch_daily_sales AS
  SELECT "branchId", DATE("createdAt") AS sale_date, SUM("grandTotal") AS total_sales, COUNT(*) AS order_count
  FROM "Invoice" WHERE status = 'POSTED' GROUP BY "branchId", DATE("createdAt");
-- Refreshed every 15 min via BullMQ (architecture.md §46/§51's 15-min TTL).
CREATE VIEW branch_daily_sales WITH (security_invoker = true) AS
  SELECT * FROM mv_branch_daily_sales
  WHERE "branchId" = current_setting('app.current_branch_id', true)::text
     OR current_setting('app.is_super_admin', true)::boolean = true;

CREATE MATERIALIZED VIEW mv_project_pnl_summary AS
  SELECT jl."projectId", SUM(jl.credit) - SUM(jl.debit) AS net_result, COUNT(DISTINCT je.id) AS entry_count
  FROM "JournalLine" jl JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
  WHERE jl."projectId" IS NOT NULL AND je.status = 'POSTED'
  GROUP BY jl."projectId";
-- Refreshed on ServiceAssignmentClosed / reconciliation events (architecture.md
-- §44), not on a timer — needs to be current the moment a project closes.
-- A project's branch is reached via its ServiceAssignment:
CREATE VIEW project_pnl_summary WITH (security_invoker = true) AS
  SELECT p.* FROM mv_project_pnl_summary p
  JOIN "ServiceAssignment" sa ON sa.id = p."projectId"
  WHERE sa."branchId" = current_setting('app.current_branch_id', true)::text
     OR current_setting('app.is_super_admin', true)::boolean = true;

-- Sales Order line-level fulfillment (Ordered/Challaned/Returned/NetDelivered/
-- Remaining, prd.md §8.29) — computed, never stored (database-schema.md §27,
-- Rule 1: a number two tables could disagree on is never stored twice).
CREATE VIEW sales_order_line_fulfillment WITH (security_invoker = true) AS
  SELECT sol.id AS sales_order_line_id, sol.quantity AS ordered,
         COALESCE(SUM(dcl.quantity), 0) AS challaned,
         COALESCE(SUM(dcrl.quantity), 0) AS returned,
         COALESCE(SUM(dcl.quantity), 0) - COALESCE(SUM(dcrl.quantity), 0) AS net_delivered,
         sol.quantity - (COALESCE(SUM(dcl.quantity), 0) - COALESCE(SUM(dcrl.quantity), 0)) AS remaining
  FROM "SalesOrderLine" sol
  LEFT JOIN "DeliveryChallanLine" dcl ON dcl."salesOrderLineId" = sol.id
  LEFT JOIN "DeliveryChallanReturnLine" dcrl ON dcrl."challanLineId" = dcl.id
  GROUP BY sol.id, sol.quantity;

-- Module 75 — Employee Work & Performance (architecture.md §58.3): zero new
-- tables, a view over data that already exists. NOTE: §58.3's own SQL
-- referenced a `sa."assignedEmployeeId"` column that does not exist on
-- ServiceAssignment (technicians are linked many-to-many via
-- TechnicianAssignment, database.md §3) — corrected here to join through
-- that table instead of copying the inconsistent reference verbatim.
CREATE VIEW employee_work_summary WITH (security_invoker = true) AS
  SELECT ta."employeeId" AS employee_id, sa.status,
         COUNT(*) AS assignment_count,
         COUNT(*) FILTER (WHERE sa.status = 'CLOSED') AS completed_count
  FROM "ServiceAssignment" sa
  JOIN "TechnicianAssignment" ta ON ta."assignmentId" = sa.id
  GROUP BY ta."employeeId", sa.status;
-- Completion Rate, On-Time %, Rework Rate, Customer Acceptance % are
-- computed at query time from this view joined against
-- Attendance/ApprovalRequest — never stored as an editable column
-- anywhere (prd.md §8.31).
