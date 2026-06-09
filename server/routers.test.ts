import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock database functions
vi.mock("./db", () => ({
  getPersonsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Brother-in-law", notes: "EMI payer", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getPersonById: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "Brother-in-law", notes: "EMI payer", createdAt: new Date(), updatedAt: new Date() }),
  createPerson: vi.fn().mockResolvedValue({ success: true }),
  updatePerson: vi.fn().mockResolvedValue({ success: true }),
  deletePerson: vi.fn().mockResolvedValue({ success: true }),

  getEMIsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, personId: 1, amount: 2000000, startDate: new Date("2024-01-01"), endDate: null, description: "Monthly EMI", isActive: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getEMIById: vi.fn().mockResolvedValue({ id: 1, userId: 1, personId: 1, amount: 2000000, startDate: new Date("2024-01-01"), endDate: null, description: "Monthly EMI", isActive: 1, createdAt: new Date(), updatedAt: new Date() }),
  createEMI: vi.fn().mockResolvedValue({ success: true }),
  updateEMI: vi.fn().mockResolvedValue({ success: true }),
  deleteEMI: vi.fn().mockResolvedValue({ success: true }),

  getLoansByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, personId: 2, amount: 500000, type: "given", date: new Date("2024-11-01"), notes: "Loan to Bilal", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getLoanById: vi.fn().mockResolvedValue({ id: 1, userId: 1, personId: 2, amount: 500000, type: "given", date: new Date("2024-11-01"), notes: "Loan to Bilal", createdAt: new Date(), updatedAt: new Date() }),
  createLoan: vi.fn().mockResolvedValue({ success: true }),
  updateLoan: vi.fn().mockResolvedValue({ success: true }),
  deleteLoan: vi.fn().mockResolvedValue({ success: true }),

  getPaymentsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, personId: 1, emiId: 1, loanId: null, amount: 2000000, dueDate: new Date("2024-11-01"), paidDate: new Date("2024-11-05"), status: "paid", notes: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getPaymentById: vi.fn().mockResolvedValue({ id: 1, userId: 1, personId: 1, emiId: 1, loanId: null, amount: 2000000, dueDate: new Date("2024-11-01"), paidDate: new Date("2024-11-05"), status: "paid", notes: null, createdAt: new Date(), updatedAt: new Date() }),
  getPaymentsByMonth: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, personId: 1, emiId: 1, loanId: null, amount: 2000000, dueDate: new Date("2024-11-01"), paidDate: new Date("2024-11-05"), status: "paid", notes: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  updatePaymentStatus: vi.fn().mockResolvedValue({ success: true }),
  deletePayment: vi.fn().mockResolvedValue({ success: true }),
  generateEMIPayments: vi.fn().mockResolvedValue(undefined),
  getPersonBalance: vi.fn().mockResolvedValue({ personId: 1, totalOwedToMe: 0, totalOwedByMe: 0, netBalance: 0 }),
  getAllPersonBalances: vi.fn().mockResolvedValue([]),
  getDashboardSummary: vi.fn().mockResolvedValue({ totalPaid: 0, totalPending: 0, totalOutstanding: 0 }),
  getMonthlyBreakdown: vi.fn().mockResolvedValue({}),
  getPersonHistory: vi.fn().mockResolvedValue([]),
  getCreditCardsByUserId: vi.fn().mockResolvedValue([]),
  createCreditCard: vi.fn().mockResolvedValue({ success: true }),
  getCreditCardById: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "Test Card", cardLimit: 100000, interestRate: 14, lateFee: 500, createdAt: new Date(), updatedAt: new Date() }),
  updateCreditCard: vi.fn().mockResolvedValue({ success: true }),
  deleteCreditCard: vi.fn().mockResolvedValue({ success: true }),
  getCreditCardDebtsByUserId: vi.fn().mockResolvedValue([]),
  createCreditCardDebt: vi.fn().mockResolvedValue({ success: true }),
  getCreditCardDebtById: vi.fn().mockResolvedValue({ id: 1, userId: 1, creditCardId: 1, personId: 1, amount: 5000, interestRate: 14, lateFee: 500, date: new Date(), notes: "Test debt" }),
  updateCreditCardDebt: vi.fn().mockResolvedValue({ success: true }),
  deleteCreditCardDebt: vi.fn().mockResolvedValue({ success: true }),
  getCcDebtTransactions: vi.fn().mockResolvedValue([]),
  createCcDebtTransaction: vi.fn().mockResolvedValue({ success: true }),
  applyCcStatementCharges: vi.fn().mockResolvedValue({ success: true }),
}));

function createMockContext(): TrpcContext {
  const user: User = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Expense Tracker Routers", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  describe("Person Router", () => {
    it("should list persons for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Brother-in-law");
    });

    it("should create a person", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.create({ name: "New Person", notes: "Test notes" });

      expect(result).toEqual({ success: true });
    });

    it("should create a person with a relationship", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.create({ name: "Cousin Sunny", relationship: "Family", notes: "Debt allocator tracker" });

      expect(result).toEqual({ success: true });
    });

    it("should get person history", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.getHistory({ personId: 1 });

      expect(result).toBeInstanceOf(Array);
    });

    it("should update a person", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.update({ id: 1, name: "Updated Name", notes: "Updated notes" });

      expect(result).toEqual({ success: true });
    });

    it("should delete a person", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.person.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });
  });

  describe("EMI Router", () => {
    it("should list EMIs for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.emi.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.amount).toBe(2000000); // ₹20,000 in paise
    });

    it("should create an EMI", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.emi.create({
        personId: 1,
        amount: 2000000,
        startDate: new Date("2024-01-01"),
        description: "Monthly EMI",
      });

      expect(result).toEqual({ success: true });
    });

    it("should update an EMI", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.emi.update({
        id: 1,
        amount: 2100000,
        description: "Updated EMI",
      });

      expect(result).toEqual({ success: true });
    });

    it("should delete an EMI", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.emi.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });
  });

  describe("Loan Router", () => {
    it("should list loans for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.loan.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("given");
    });

    it("should create a loan", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.loan.create({
        personId: 2,
        amount: 500000,
        type: "given",
        date: new Date("2024-11-01"),
        notes: "Loan to friend",
      });

      expect(result).toEqual({ success: true });
    });

    it("should update a loan", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.loan.update({
        id: 1,
        amount: 600000,
        notes: "Updated loan",
      });

      expect(result).toEqual({ success: true });
    });

    it("should delete a loan", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.loan.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });
  });

  describe("Payment Router", () => {
    it("should list payments for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.payment.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("paid");
    });

    it("should get payments by month", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.payment.getByMonth({ year: 2024, month: 11 });

      expect(result).toHaveLength(1);
      expect(result[0]?.dueDate.getMonth()).toBe(10); // November is month 10 (0-indexed)
    });

    it("should update payment status to paid", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.payment.updateStatus({
        id: 1,
        status: "paid",
        paidDate: new Date("2024-11-05"),
      });

      expect(result).toEqual({ success: true });
    });

    it("should delete a payment", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.payment.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });
  });

  describe("Auth Router", () => {
    it("should return current user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();

      expect(result).toEqual(ctx.user);
    });

    it("should logout user", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(ctx.res.clearCookie).toHaveBeenCalled();
    });
  });

  describe("Credit Card Router", () => {
    it("should list credit cards", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.list();
      expect(result).toBeInstanceOf(Array);
    });

    it("should create a credit card", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.create({
        name: "SBI Card",
        cardLimit: 150000,
        interestRate: 14.5,
        lateFee: 500,
      });
      expect(result).toEqual({ success: true });
    });

    it("should update a credit card", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.update({
        id: 1,
        name: "SBI Card Premium",
        cardLimit: 200000,
        interestRate: 13.5,
        lateFee: 450,
      });
      expect(result).toEqual({ success: true });
    });

    it("should delete a credit card", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.delete({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("should list debts", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.listDebts();
      expect(result).toBeInstanceOf(Array);
    });

    it("should create a debt allocation", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.createDebt({
        creditCardId: 1,
        personId: 1,
        amount: 25000,
        interestRate: 14.5,
        lateFee: 500,
        date: new Date(),
        notes: "Shared purchases on card",
      });
      expect(result).toEqual({ success: true });
    });

    it("should get CC ledger", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.getLedger({ debtId: 1 });
      expect(result).toBeInstanceOf(Array);
    });

    it("should record a CC debt repayment", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.recordPayment({
        debtId: 1,
        amount: 5000,
        date: new Date(),
        notes: "Cash repayment",
      });
      expect(result).toEqual({ success: true });
    });

    it("should apply statement charges", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.creditCard.applyStatement({
        creditCardId: 1,
        totalStatementBalance: 100000,
        interestCharged: 1500,
        feesCharged: 500,
        date: new Date(),
      });
      expect(result).toEqual({ success: true });
    });
  });
});
