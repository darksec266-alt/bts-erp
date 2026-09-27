// Narrow structural interface for the one Prisma model this function
// touches — deliberately NOT importing the generated `PrismaClient` type.
// `prisma generate` needs network access to binaries.prisma.sh to fetch its
// query-engine binary, which this session's sandbox could not reach (see
// docs/HANDOFF.md); typing against the real generated client would make
// this file — and its test — impossible to typecheck/run until Phase 2
// runs `prisma generate` somewhere with normal network access. A real
// `PrismaClient` satisfies this interface structurally with zero changes
// needed once that happens; swap the parameter type then if the extra
// precision is worth it.
export interface JournalEntryPoster {
  journalEntry: {
    findUnique(args: { where: { idempotencyKey: string } }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        journalNumber: string;
        sourceModule: string;
        sourceId: string;
        branchId: string;
        fiscalPeriodId: string;
        idempotencyKey: string;
        status: string;
        postedAt: Date;
        postedById: string;
        lines: { create: Record<string, unknown>[] };
      };
      include: { lines: true };
    }): Promise<{ id: string; [key: string]: unknown }>;
  };
}

// The minimal Posting/Ledger Stub prd.md §13 calls for in Phase 0/Phase 1:
// "a bare journal-entry table + a single 'post a balanced entry' function,
// no COA management UI, no reports" — so Phases 3-5 (Sales, Customer
// Advance, Service Ops) have somewhere valid to post into before Phase 6
// (Accounting & Finance) builds the real ledger/reporting layer on top of
// the same JournalEntry/JournalLine tables. This function is that "somewhere
// to post into" — deliberately thin, not a general-purpose accounting API.

export interface PostBalancedEntryLine {
  accountId: string;
  debit?: number;
  credit?: number;
  departmentId?: string;
  projectId?: string;
  customerId?: string;
  supplierId?: string;
}

export interface PostBalancedEntryInput {
  journalNumber: string;
  sourceModule: string; // "SALES" | "PROCUREMENT" | "SERVICE_OPS" | ... — database.md §3's polymorphic pattern
  sourceId: string;
  branchId: string;
  fiscalPeriodId: string;
  idempotencyKey: string; // architecture.md §43 — caller must generate this before calling, not here
  postedById: string;
  lines: PostBalancedEntryLine[];
}

export class UnbalancedEntryError extends Error {
  constructor(totalDebit: string, totalCredit: string) {
    super(`Journal entry does not balance: total debit ${totalDebit} != total credit ${totalCredit}`);
    this.name = "UnbalancedEntryError";
  }
}

export class DuplicatePostingError extends Error {
  constructor(idempotencyKey: string) {
    super(`A journal entry with idempotencyKey "${idempotencyKey}" already exists — refusing to double-post.`);
    this.name = "DuplicatePostingError";
  }
}

/**
 * Posts a balanced journal entry directly (status: POSTED), inside one
 * transaction. Every real module's own posting logic (Phase 6 onward) wraps
 * this same shape with its own domain validation first — this function's
 * only two responsibilities are the universal invariants every posting in
 * this platform must satisfy regardless of source module:
 *   1. Sum of debits === sum of credits (double-entry, database.md §3's
 *      journal_line_single_sided CHECK enforces single-sidedness per line;
 *      this enforces the entry-level balance CHECK cannot).
 *   2. The idempotencyKey has never been used before (retried requests
 *      never double-post).
 */
export async function postBalancedEntry(prisma: JournalEntryPoster, input: PostBalancedEntryInput) {
  const totalDebit = input.lines.reduce((sum, l) => sum + Number(l.debit ?? 0), 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + Number(l.credit ?? 0), 0);

  // Compare at the cent level to avoid floating-point drift on the sum.
  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    throw new UnbalancedEntryError(totalDebit.toFixed(2), totalCredit.toFixed(2));
  }

  const existing = await prisma.journalEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    throw new DuplicatePostingError(input.idempotencyKey);
  }

  return prisma.journalEntry.create({
    data: {
      journalNumber: input.journalNumber,
      sourceModule: input.sourceModule,
      sourceId: input.sourceId,
      branchId: input.branchId,
      fiscalPeriodId: input.fiscalPeriodId,
      idempotencyKey: input.idempotencyKey,
      status: "POSTED",
      postedAt: new Date(),
      postedById: input.postedById,
      lines: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          departmentId: l.departmentId,
          projectId: l.projectId,
          customerId: l.customerId,
          supplierId: l.supplierId,
        })),
      },
    },
    include: { lines: true },
  });
}
