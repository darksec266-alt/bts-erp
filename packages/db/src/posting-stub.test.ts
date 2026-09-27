import { postBalancedEntry, UnbalancedEntryError, DuplicatePostingError, type JournalEntryPoster } from "./posting-stub";

function makeMockPrisma(existingEntry: { id: string } | null = null) {
  const created: unknown[] = [];
  const mock: JournalEntryPoster = {
    journalEntry: {
      findUnique: jest.fn().mockResolvedValue(existingEntry),
      create: jest.fn(async ({ data }: any) => {
        created.push(data);
        return { id: "je_test_1", ...data };
      }),
    },
  };
  return { mock, created };
}

const baseInput = {
  journalNumber: "JE-DHK-2026-0001",
  sourceModule: "SALES",
  sourceId: "invoice_1",
  branchId: "branch_1",
  fiscalPeriodId: "fp_2026",
  idempotencyKey: "idem-key-1",
  postedById: "user_1",
};

describe("postBalancedEntry", () => {
  it("posts successfully when debits equal credits", async () => {
    const { mock } = makeMockPrisma(null);
    const result = await postBalancedEntry(mock, {
      ...baseInput,
      lines: [
        { accountId: "acct_cash", debit: 1000 },
        { accountId: "acct_revenue", credit: 1000 },
      ],
    });
    expect(result.id).toBe("je_test_1");
    expect(mock.journalEntry.create).toHaveBeenCalledTimes(1);
  });

  it("rejects an unbalanced entry before ever calling create", async () => {
    const { mock } = makeMockPrisma(null);
    await expect(
      postBalancedEntry(mock, {
        ...baseInput,
        lines: [
          { accountId: "acct_cash", debit: 1000 },
          { accountId: "acct_revenue", credit: 999.5 },
        ],
      })
    ).rejects.toThrow(UnbalancedEntryError);
    expect(mock.journalEntry.create).not.toHaveBeenCalled();
  });

  it("refuses to double-post an already-used idempotencyKey", async () => {
    const { mock } = makeMockPrisma({ id: "je_existing" });
    await expect(
      postBalancedEntry(mock, {
        ...baseInput,
        lines: [
          { accountId: "acct_cash", debit: 500 },
          { accountId: "acct_revenue", credit: 500 },
        ],
      })
    ).rejects.toThrow(DuplicatePostingError);
    expect(mock.journalEntry.create).not.toHaveBeenCalled();
  });

  it("balances correctly across more than two lines (multi-line entry)", async () => {
    const { mock } = makeMockPrisma(null);
    await expect(
      postBalancedEntry(mock, {
        ...baseInput,
        lines: [
          { accountId: "acct_cash", debit: 700 },
          { accountId: "acct_bank", debit: 300 },
          { accountId: "acct_revenue", credit: 1000 },
        ],
      })
    ).resolves.toBeDefined();
  });
});
