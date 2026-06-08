import type { Response } from "express";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

// ============ Validation Schemas ============
const PersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional(),
});

const EMISchema = z.object({
  personId: z.number().positive("Person is required"),
  amount: z.number().positive("Amount must be positive"),
  startDate: z.date(),
  endDate: z.date().optional(),
  description: z.string().optional(),
});

const LoanSchema = z.object({
  personId: z.number().positive("Person is required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["given", "received"]),
  date: z.date(),
  notes: z.string().optional(),
});

const PaymentStatusSchema = z.object({
  status: z.enum(["pending", "paid"]),
  paidDate: z.date().optional(),
  paidBy: z.enum(["user", "borrower"]).optional(),
});

const CreditCardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cardLimit: z.number().positive("Card limit must be positive"),
  interestRate: z.number().nonnegative(),
  lateFee: z.number().nonnegative(),
});

const CreditCardDebtSchema = z.object({
  creditCardId: z.number().positive(),
  borrowerName: z.string().min(1, "Borrower name is required"),
  amount: z.number().positive("Amount must be positive"),
  interestRate: z.number().nonnegative(),
  lateFee: z.number().nonnegative(),
  date: z.date(),
  notes: z.string().optional(),
});

const ChittiSchema = z.object({
  name: z.string().min(1, "Name is required"),
  totalAmount: z.number().positive("Total amount must be positive"),
  members: z.number().positive("Members must be positive"),
  monthlyContribution: z.number().positive("Monthly contribution must be positive"),
  friendName: z.string().min(1, "Friend name is required"),
  startDate: z.date(),
  status: z.enum(["active", "completed"]).default("active"),
});

const ChittiContributionSchema = z.object({
  chittiId: z.number().positive(),
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  type: z.enum(["contribution", "payout"]),
  notes: z.string().optional(),
});

const GeneralExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

const GoldLoanSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.date(),
  paidForPersonId: z.number().positive("Person is required"),
  notes: z.string().optional(),
});

// ============ Person Router ============
const personRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getPersonsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching persons:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch persons" });
    }
  }),

  create: protectedProcedure.input(PersonSchema).mutation(async ({ ctx, input }) => {
    try {
      await db.createPerson(ctx.user.id, input.name, input.notes);
      return { success: true };
    } catch (error) {
      console.error("Error creating person:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create person" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...PersonSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const person = await db.getPersonById(input.id);
        if (!person || person.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updatePerson(input.id, input.name, input.notes);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating person:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update person" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const person = await db.getPersonById(input.id);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deletePerson(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting person:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete person" });
    }
  }),
});

// ============ EMI Router ============
const emiRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getEMIsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching EMIs:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch EMIs" });
    }
  }),

  create: protectedProcedure.input(EMISchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await db.getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      const result = await db.createEMI(ctx.user.id, input.personId, input.amount, input.startDate, input.endDate, input.description);
      
      const emis = await db.getEMIsByUserId(ctx.user.id);
      const newEmi = emis[emis.length - 1];
      if (newEmi) {
        await db.generateEMIPayments(ctx.user.id, newEmi.id, newEmi);
      }
      
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error creating EMI:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create EMI" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...EMISchema.partial().shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const emi = await db.getEMIById(input.id);
        if (!emi || emi.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateEMI(input.id, input.amount, input.endDate, undefined, input.description);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating EMI:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update EMI" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const emi = await db.getEMIById(input.id);
      if (!emi || emi.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteEMI(emi.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting EMI:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete EMI" });
    }
  }),
});

// ============ Loan Router ============
const loanRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getLoansByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching loans:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch loans" });
    }
  }),

  create: protectedProcedure.input(LoanSchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await db.getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.createLoan(ctx.user.id, input.personId, input.amount, input.type, input.date, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error creating loan:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create loan" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...LoanSchema.partial().shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const loan = await db.getLoanById(input.id);
        if (!loan || loan.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateLoan(input.id, input.amount, input.date, input.notes);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating loan:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update loan" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const loan = await db.getLoanById(input.id);
      if (!loan || loan.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteLoan(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting loan:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete loan" });
    }
  }),
});

// ============ Payment Router ============
const paymentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getPaymentsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching payments:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
    }
  }),

  getByMonth: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      try {
        return await db.getPaymentsByMonth(ctx.user.id, input.year, input.month);
      } catch (error) {
        console.error("Error fetching payments by month:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
      }
    }),

  getByPersonAndMonth: protectedProcedure
    .input(z.object({ personId: z.number().positive(), year: z.number(), month: z.number().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      try {
        const person = await db.getPersonById(input.personId);
        if (!person || person.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        return await db.getPaymentsByPersonAndMonth(ctx.user.id, input.personId, input.year, input.month);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching payments by person and month:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
      }
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...PaymentStatusSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const payment = await db.getPaymentById(input.id);
        if (!payment || payment.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updatePaymentStatus(input.id, input.status, input.paidDate, input.paidBy);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating payment status:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update payment status" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const payment = await db.getPaymentById(input.id);
      if (!payment || payment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deletePayment(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting payment:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete payment" });
    }
  }),
});

// ============ Balance Router ============
const balanceRouter = router({
  getPersonBalance: protectedProcedure
    .input(z.object({ personId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const person = await db.getPersonById(input.personId);
        if (!person || person.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        return await db.getPersonBalance(ctx.user.id, input.personId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching person balance:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch balance" });
      }
    }),

  getAllBalances: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getAllPersonBalances(ctx.user.id);
    } catch (error) {
      console.error("Error fetching all balances:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch balances" });
    }
  }),

  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getDashboardSummary(ctx.user.id);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch summary" });
    }
  }),

  getMonthlyBreakdown: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        return await db.getMonthlyBreakdown(ctx.user.id, input.year);
      } catch (error) {
        console.error("Error fetching monthly breakdown:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch breakdown" });
      }
    }),
});

// ============ Credit Card Router ============
const creditCardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getCreditCardsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing credit cards:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list credit cards" });
    }
  }),

  create: protectedProcedure.input(CreditCardSchema).mutation(async ({ ctx, input }) => {
    try {
      await db.createCreditCard(ctx.user.id, input.name, input.cardLimit, input.interestRate, input.lateFee);
      return { success: true };
    } catch (error) {
      console.error("Error creating credit card:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create credit card" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...CreditCardSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const card = await db.getCreditCardById(input.id);
        if (!card || card.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateCreditCard(input.id, input.name, input.cardLimit, input.interestRate, input.lateFee);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating credit card:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update credit card" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const card = await db.getCreditCardById(input.id);
      if (!card || card.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteCreditCard(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting credit card:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete credit card" });
    }
  }),

  listDebts: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getCreditCardDebtsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing credit card debts:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list credit card debts" });
    }
  }),

  createDebt: protectedProcedure.input(CreditCardDebtSchema).mutation(async ({ ctx, input }) => {
    try {
      const card = await db.getCreditCardById(input.creditCardId);
      if (!card || card.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized credit card reference" });
      }
      await db.createCreditCardDebt(
        ctx.user.id,
        input.creditCardId,
        input.borrowerName,
        input.amount,
        input.interestRate,
        input.lateFee,
        input.date,
        input.notes
      );
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error creating credit card debt:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create credit card debt" });
    }
  }),

  updateDebt: protectedProcedure
    .input(z.object({ id: z.number().positive(), amount: z.number().positive(), date: z.date(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const debt = await db.getCreditCardDebtById(input.id);
        if (!debt || debt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateCreditCardDebt(input.id, input.amount, input.date, input.notes);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating credit card debt:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update credit card debt" });
      }
    }),

  deleteDebt: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const debt = await db.getCreditCardDebtById(input.id);
      if (!debt || debt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteCreditCardDebt(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting credit card debt:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete credit card debt" });
    }
  }),
});

// ============ Chitti Router ============
const chittiRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getChittisByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing chittis:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list chittis" });
    }
  }),

  create: protectedProcedure.input(ChittiSchema).mutation(async ({ ctx, input }) => {
    try {
      await db.createChitti(
        ctx.user.id,
        input.name,
        input.totalAmount,
        input.members,
        input.monthlyContribution,
        input.friendName,
        input.startDate,
        input.status
      );
      return { success: true };
    } catch (error) {
      console.error("Error creating chitti:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create chitti" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...ChittiSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const chitti = await db.getChittiById(input.id);
        if (!chitti || chitti.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateChitti(
          input.id,
          input.name,
          input.totalAmount,
          input.members,
          input.monthlyContribution,
          input.friendName,
          input.startDate,
          input.status
        );
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating chitti:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update chitti" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const chitti = await db.getChittiById(input.id);
      if (!chitti || chitti.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteChitti(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting chitti:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete chitti" });
    }
  }),

  listContributions: protectedProcedure
    .input(z.object({ chittiId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        if (input.chittiId) {
          const chitti = await db.getChittiById(input.chittiId);
          if (!chitti || chitti.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
          }
          return await db.getChittiContributionsByChittiId(input.chittiId);
        }
        return await db.getChittiContributionsByUserId(ctx.user.id);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error listing chitti contributions:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list contributions" });
      }
    }),

  createContribution: protectedProcedure.input(ChittiContributionSchema).mutation(async ({ ctx, input }) => {
    try {
      const chitti = await db.getChittiById(input.chittiId);
      if (!chitti || chitti.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized chitti reference" });
      }
      await db.createChittiContribution(ctx.user.id, input.chittiId, input.amount, input.date, input.type, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error creating chitti contribution:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create contribution" });
    }
  }),

  deleteContribution: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const contrib = await db.getChittiContributionById(input.id);
      if (!contrib || contrib.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteChittiContribution(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting chitti contribution:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete contribution" });
    }
  }),
});

// ============ Expense Router ============
const expenseRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getGeneralExpensesByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing expenses:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list expenses" });
    }
  }),

  create: protectedProcedure.input(GeneralExpenseSchema).mutation(async ({ ctx, input }) => {
    try {
      await db.createGeneralExpense(ctx.user.id, input.amount, input.date, input.category, input.description);
      return { success: true };
    } catch (error) {
      console.error("Error creating expense:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create expense" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...GeneralExpenseSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const exp = await db.getGeneralExpenseById(input.id);
        if (!exp || exp.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateGeneralExpense(input.id, input.amount, input.date, input.category, input.description);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating expense:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update expense" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const exp = await db.getGeneralExpenseById(input.id);
      if (!exp || exp.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteGeneralExpense(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting expense:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete expense" });
    }
  }),

  getBreakdown: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getGeneralExpenseCategoryBreakdown(ctx.user.id);
    } catch (error) {
      console.error("Error fetching expense breakdown:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch expense breakdown" });
    }
  }),
});

// ============ Gold Loan Router ============
const goldLoanRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await db.getGoldLoanInterestsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing gold loan interest logs:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list gold loan logs" });
    }
  }),

  create: protectedProcedure.input(GoldLoanSchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await db.getPersonById(input.paidForPersonId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized person reference" });
      }
      await db.createGoldLoanInterest(ctx.user.id, input.amount, input.date, input.paidForPersonId, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error creating gold loan log:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create gold loan log" });
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().positive(), ...GoldLoanSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      try {
        const log = await db.getGoldLoanInterestById(input.id);
        if (!log || log.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        await db.updateGoldLoanInterest(input.id, input.amount, input.date, input.paidForPersonId, input.notes);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error updating gold loan log:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update gold loan log" });
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const log = await db.getGoldLoanInterestById(input.id);
      if (!log || log.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await db.deleteGoldLoanInterest(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error deleting gold loan log:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete gold loan log" });
    }
  }),
});

// ============ AI Router ============
const aiRouter = router({
  parseEntry: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(500) }))
    .mutation(async ({ input }) => {
      const systemPrompt = `You are a financial assistant for an Indian household expense tracker. 
Parse the user's natural language input into structured fields.
Always respond with ONLY valid JSON, no markdown.
Fields: type ("expense"|"loan"|"payment"|null), amount (integer in paise, null if unknown), personName (string|null), category (string|null, one of: Groceries, Food & Dining, Utilities, Transport, Entertainment, Shopping, Medical, Other), date (ISO date string YYYY-MM-DD or null), notes (string|null), confidence ("high"|"medium"|"low"), suggestion (brief 1-sentence action tip).
Today is ${new Date().toISOString().split('T')[0]}. Convert ₹ amounts to paise (multiply by 100).`;

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.text },
          ],
          responseFormat: { type: "json_object" },
          maxTokens: 512,
        });
        const content = result.choices[0]?.message?.content;
        const text = typeof content === "string" ? content : JSON.stringify(content);
        return JSON.parse(text);
      } catch (error) {
        console.error("AI parseEntry error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI parsing failed. Please try again." });
      }
    }),
});

// ============ Main Router ============
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  person: personRouter,
  emi: emiRouter,
  loan: loanRouter,
  payment: paymentRouter,
  balance: balanceRouter,
  creditCard: creditCardRouter,
  chitti: chittiRouter,
  expense: expenseRouter,
  goldLoan: goldLoanRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
