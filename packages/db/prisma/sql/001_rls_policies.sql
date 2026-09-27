-- Phase 1 — Row-Level Security policies (database.md §14, database-schema.md
-- §18). Applied to every table with a branchId column — the pattern is
-- identical everywhere (database.md §14's own note), generated here rather
-- than hand-repeated 20 times.
--
-- HOW TO APPLY: this is NOT a Prisma-managed migration (Prisma has no RLS
-- primitive). Once `prisma migrate dev --name init` has created the tables
-- from schema.prisma, run this file against the same database as a second,
-- manual migration step (or paste its contents into a
-- `prisma/migrations/<timestamp>_add_rls/migration.sql` file created via
-- `prisma migrate dev --create-only`, which folds it into the normal
-- migration history instead of a one-off manual step).
--
-- app.current_branch_id / app.is_super_admin are set once per request by
-- the Application layer (architecture.md §40) immediately after auth
-- resolves the user's branch and role — see apps/api/src/shared (Phase 2).

DO $$
DECLARE
  t text;
  branch_scoped_tables text[] := ARRAY[
    'User', 'Employee', 'Customer', 'Warehouse', 'Quotation', 'SalesOrder',
    'DeliveryChallanReturn', 'Invoice', 'ServiceAssignment', 'Ticket',
    'JournalEntry', 'Voucher', 'SuspenseEntry', 'CustomerAdvance',
    'DamageLossReport', 'PurchaseRequest', 'PurchaseOrder', 'PayrollRun',
    'CompanyLoan', 'FeatureFlag'
  ];
BEGIN
  FOREACH t IN ARRAY branch_scoped_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY branch_scope ON %I USING ("branchId" = current_setting(''app.current_branch_id'', true)::text OR current_setting(''app.is_super_admin'', true)::boolean = true OR "branchId" IS NULL);',
      t
    );
  END LOOP;
END $$;

-- Branch itself and every downstream table reached only via a FK chain to
-- one of the above (e.g. QuotationLine -> Quotation) do NOT get a
-- second, redundant RLS policy — database.md §18's pattern scopes at the
-- parent/document level, matching how the Application layer's query
-- filters are written (one WHERE branchId clause on the parent, joins
-- inherit scope naturally). CompanyLoan.branchId and FeatureFlag.branchId
-- are nullable (platform-wide rows) — the `OR "branchId" IS NULL` clause
-- above lets those rows through for every branch, matching their intended
-- "applies everywhere" semantics.
