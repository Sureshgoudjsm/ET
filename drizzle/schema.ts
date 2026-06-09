import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Person table: Stores information about people involved in transactions
 * (brother-in-law, friends, etc.)
 */
export const persons = mysqlTable("persons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;

/**
 * EMI table: Stores recurring EMI entries
 * Example: Brother-in-law's ₹20,000 monthly EMI starting from Jan 2024
 */
export const emis = mysqlTable("emis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  amount: int("amount").notNull(), // Amount in paise (₹1 = 100 paise)
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"), // Optional: when EMI ends
  description: varchar("description", { length: 255 }),
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EMI = typeof emis.$inferSelect;
export type InsertEMI = typeof emis.$inferInsert;

/**
 * Loan table: Stores loan transactions (given or received)
 * Example: Gave ₹5,000 to Bilal on Nov 1st
 */
export const loans = mysqlTable("loans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  amount: int("amount").notNull(), // Amount in paise
  type: mysqlEnum("type", ["given", "received"]).notNull(), // "given" = I gave money, "received" = I received money
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

/**
 * Payment table: Tracks individual payment records for EMIs and loans
 * Example: Paid ₹20,000 for Nov EMI on Nov 5th
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  emiId: int("emiId"), // Reference to EMI if this is an EMI payment
  loanId: int("loanId"), // Reference to Loan if this is a loan payment
  amount: int("amount").notNull(), // Amount in paise
  dueDate: timestamp("dueDate").notNull(), // The month/date this payment is due
  paidDate: timestamp("paidDate"), // When it was actually paid (null if pending)
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  paidBy: mysqlEnum("paidBy", ["user", "borrower"]).default("user").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * CreditCard table: Stores credit card details
 */
export const creditCards = mysqlTable("credit_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cardLimit: int("cardLimit").notNull(), // Limit in paise
  interestRate: int("interestRate").notNull(), // Interest rate in basis points (e.g. 3500 for 35% annual)
  lateFee: int("lateFee").notNull(), // Late fee in paise
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = typeof creditCards.$inferInsert;

/**
 * CreditCardDebt table: Stores debt entries for credit cards (specifically Sunny's debt)
 */
export const creditCardDebts = mysqlTable("credit_card_debts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  creditCardId: int("creditCardId").notNull(),
  personId: int("personId"),
  borrowerName: varchar("borrowerName", { length: 255 }), // e.g. "Sunny"
  amount: int("amount").notNull(), // Amount in paise
  interestRate: int("interestRate").notNull(), // Custom rate override in basis points
  lateFee: int("lateFee").notNull(), // Custom late fee override in paise
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCardDebt = typeof creditCardDebts.$inferSelect;
export type InsertCreditCardDebt = typeof creditCardDebts.$inferInsert;

/**
 * ccDebtTransactions table: Tracks payments, interest charges, and fees for credit card debts.
 */
export const ccDebtTransactions = mysqlTable("cc_debt_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  creditCardDebtId: int("creditCardDebtId").notNull(),
  type: mysqlEnum("type", ["principal", "interest", "fee", "payment"]).notNull(),
  amount: int("amount").notNull(), // Amount in paise
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CcDebtTransaction = typeof ccDebtTransactions.$inferSelect;
export type InsertCcDebtTransaction = typeof ccDebtTransactions.$inferInsert;

/**
 * Chitti table: Stores chitti savings details
 */
export const chittis = mysqlTable("chittis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalAmount: int("totalAmount").notNull(), // Total value in paise
  members: int("members").notNull(),
  monthlyContribution: int("monthlyContribution").notNull(), // Monthly contribution in paise
  friendName: varchar("friendName", { length: 255 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Chitti = typeof chittis.$inferSelect;
export type InsertChitti = typeof chittis.$inferInsert;

/**
 * ChittiContribution table: Stores chitti logs (contributions and payouts)
 */
export const chittiContributions = mysqlTable("chitti_contributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  chittiId: int("chittiId").notNull(),
  amount: int("amount").notNull(), // Amount in paise
  date: timestamp("date").notNull(),
  type: mysqlEnum("type", ["contribution", "payout"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChittiContribution = typeof chittiContributions.$inferSelect;
export type InsertChittiContribution = typeof chittiContributions.$inferInsert;

/**
 * GeneralExpense table: Stores general categorizable expenses (food, util, etc.)
 */
export const generalExpenses = mysqlTable("general_expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId"),
  isProxy: int("isProxy").default(0).notNull(), // 0 = personal, 1 = proxy for someone else
  amount: int("amount").notNull(), // Amount in paise
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // e.g. "food", "transport", "utilities"
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneralExpense = typeof generalExpenses.$inferSelect;
export type InsertGeneralExpense = typeof generalExpenses.$inferInsert;

/**
 * GoldLoanInterest table: Tracks gold loan interest payments
 */
export const goldLoanInterest = mysqlTable("gold_loan_interest", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(), // Amount in paise
  date: timestamp("date").notNull(),
  paidForPersonId: int("paidForPersonId").notNull(), // Linked to persons
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoldLoanInterest = typeof goldLoanInterest.$inferSelect;
export type InsertGoldLoanInterest = typeof goldLoanInterest.$inferInsert;