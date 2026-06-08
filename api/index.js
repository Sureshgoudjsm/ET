// server/app.ts
import "dotenv/config";
import express from "express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var persons = mysqlTable("persons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var emis = mysqlTable("emis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  amount: int("amount").notNull(),
  // Amount in paise (₹1 = 100 paise)
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  // Optional: when EMI ends
  description: varchar("description", { length: 255 }),
  isActive: int("isActive").default(1).notNull(),
  // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var loans = mysqlTable("loans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  amount: int("amount").notNull(),
  // Amount in paise
  type: mysqlEnum("type", ["given", "received"]).notNull(),
  // "given" = I gave money, "received" = I received money
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personId: int("personId").notNull(),
  emiId: int("emiId"),
  // Reference to EMI if this is an EMI payment
  loanId: int("loanId"),
  // Reference to Loan if this is a loan payment
  amount: int("amount").notNull(),
  // Amount in paise
  dueDate: timestamp("dueDate").notNull(),
  // The month/date this payment is due
  paidDate: timestamp("paidDate"),
  // When it was actually paid (null if pending)
  status: mysqlEnum("status", ["pending", "paid"]).default("pending").notNull(),
  paidBy: mysqlEnum("paidBy", ["user", "borrower"]).default("user").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var creditCards = mysqlTable("credit_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cardLimit: int("cardLimit").notNull(),
  // Limit in paise
  interestRate: int("interestRate").notNull(),
  // Interest rate in basis points (e.g. 3500 for 35% annual)
  lateFee: int("lateFee").notNull(),
  // Late fee in paise
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var creditCardDebts = mysqlTable("credit_card_debts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  creditCardId: int("creditCardId").notNull(),
  borrowerName: varchar("borrowerName", { length: 255 }).notNull(),
  // e.g. "Sunny"
  amount: int("amount").notNull(),
  // Amount in paise
  interestRate: int("interestRate").notNull(),
  // Custom rate override in basis points
  lateFee: int("lateFee").notNull(),
  // Custom late fee override in paise
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var chittis = mysqlTable("chittis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  totalAmount: int("totalAmount").notNull(),
  // Total value in paise
  members: int("members").notNull(),
  monthlyContribution: int("monthlyContribution").notNull(),
  // Monthly contribution in paise
  friendName: varchar("friendName", { length: 255 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  status: mysqlEnum("status", ["active", "completed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var chittiContributions = mysqlTable("chitti_contributions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  chittiId: int("chittiId").notNull(),
  amount: int("amount").notNull(),
  // Amount in paise
  date: timestamp("date").notNull(),
  type: mysqlEnum("type", ["contribution", "payout"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var generalExpenses = mysqlTable("general_expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  // Amount in paise
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  // e.g. "food", "transport", "utilities"
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var goldLoanInterest = mysqlTable("gold_loan_interest", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),
  // Amount in paise
  date: timestamp("date").notNull(),
  paidForPersonId: int("paidForPersonId").notNull(),
  // Linked to persons
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID || "local-dev-app-id",
  cookieSecret: process.env.JWT_SECRET || "local-dev-secret-key-1234567890-must-be-long-enough",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
var _pool = null;
var hasAttemptedConnection = false;
async function getDb() {
  if (hasAttemptedConnection) {
    return _db;
  }
  if (process.env.DATABASE_URL) {
    hasAttemptedConnection = true;
    try {
      const url = process.env.DATABASE_URL;
      if (!url.startsWith("mysql://") && !url.startsWith("mysql2://") && !url.includes("mysql")) {
        throw new Error("DATABASE_URL is not a MySQL connection string");
      }
      _pool = mysql.createPool({
        uri: url,
        connectionLimit: 5,
        connectTimeout: 5e3
      });
      await _pool.promise().query("SELECT 1 FROM users LIMIT 1").catch((err) => {
        throw new Error(`Schema check failed (is the DB migrated?): ${err.message}`);
      });
      _db = drizzle(_pool);
      console.log("[Database] Connected successfully to MySQL database.");
    } catch (error) {
      console.warn("[Database] Failed to connect, falling back to in-memory store:", error);
      _db = null;
      if (_pool) {
        await _pool.promise().end().catch(() => {
        });
        _pool = null;
      }
    }
  } else {
    hasAttemptedConnection = true;
  }
  return _db;
}
var nextMemId = 1e3;
function getNextId() {
  return nextMemId++;
}
var memStore = {
  users: [],
  persons: [
    { id: 1, userId: 1, name: "Sunny (Brother-in-law)", notes: "EMI and Credit Card Debt tracking", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 2, userId: 1, name: "Bilal", notes: "Personal loan tracking", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 3, userId: 1, name: "Mother", notes: "Gold Loan tracking", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 4, userId: 1, name: "Sister", notes: "Gold Loan tracking", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  emis: [
    { id: 101, userId: 1, personId: 1, amount: 2e6, startDate: /* @__PURE__ */ new Date("2026-01-01"), endDate: null, description: "Monthly EMI Contribution", isActive: 1, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  loans: [
    { id: 201, userId: 1, personId: 2, amount: 5e5, type: "given", date: /* @__PURE__ */ new Date("2026-05-01"), notes: "Gave for emergency", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 202, userId: 1, personId: 2, amount: 2e5, type: "received", date: /* @__PURE__ */ new Date("2026-05-15"), notes: "Bilal returned part of loan", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  payments: [],
  creditCards: [
    { id: 301, userId: 1, name: "SBI Card Prime", cardLimit: 3e7, interestRate: 4200, lateFee: 5e4, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  creditCardDebts: [
    { id: 401, userId: 1, creditCardId: 301, borrowerName: "Sunny", amount: 5e6, interestRate: 4200, lateFee: 5e4, date: /* @__PURE__ */ new Date("2026-01-15"), notes: "Mobile phone purchase", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 402, userId: 1, creditCardId: 301, borrowerName: "Sunny", amount: 25e5, interestRate: 4200, lateFee: 5e4, date: /* @__PURE__ */ new Date("2026-03-10"), notes: "Flight tickets", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  chittis: [
    { id: 501, userId: 1, name: "Sravani Chit Fund", totalAmount: 1e8, members: 20, monthlyContribution: 5e5, friendName: "Ramesh", startDate: /* @__PURE__ */ new Date("2026-01-01"), status: "active", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  chittiContributions: [
    { id: 601, userId: 1, chittiId: 501, amount: 5e5, date: /* @__PURE__ */ new Date("2026-01-10"), type: "contribution", notes: "Jan Contribution", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 602, userId: 1, chittiId: 501, amount: 5e5, date: /* @__PURE__ */ new Date("2026-02-10"), type: "contribution", notes: "Feb Contribution", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 603, userId: 1, chittiId: 501, amount: 5e5, date: /* @__PURE__ */ new Date("2026-03-10"), type: "contribution", notes: "Mar Contribution", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 604, userId: 1, chittiId: 501, amount: 5e5, date: /* @__PURE__ */ new Date("2026-04-10"), type: "contribution", notes: "Apr Contribution", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 605, userId: 1, chittiId: 501, amount: 85e6, date: /* @__PURE__ */ new Date("2026-04-20"), type: "payout", notes: "Chit Payout Lifted", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 606, userId: 1, chittiId: 501, amount: 5e5, date: /* @__PURE__ */ new Date("2026-05-10"), type: "contribution", notes: "May Contribution", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  generalExpenses: [
    { id: 701, userId: 1, amount: 45e4, date: /* @__PURE__ */ new Date("2026-05-02"), category: "Groceries", description: "Weekly market run", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 702, userId: 1, amount: 32e4, date: /* @__PURE__ */ new Date("2026-05-05"), category: "Food & Dining", description: "Dinner with family", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 703, userId: 1, amount: 28e4, date: /* @__PURE__ */ new Date("2026-05-10"), category: "Utilities", description: "Electricity bill", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 704, userId: 1, amount: 5e5, date: /* @__PURE__ */ new Date("2026-05-12"), category: "Transport", description: "Petrol fill up", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ],
  goldLoanInterest: [
    { id: 801, userId: 1, amount: 12e5, date: /* @__PURE__ */ new Date("2026-04-15"), paidForPersonId: 3, notes: "April Interest payment for Mother", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
    { id: 802, userId: 1, amount: 8e5, date: /* @__PURE__ */ new Date("2026-05-15"), paidForPersonId: 4, notes: "May Interest payment for Sister", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
  ]
};
(function initMemStorePayments() {
  const emi = memStore.emis[0];
  const startDate = new Date(emi.startDate);
  const today = /* @__PURE__ */ new Date();
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let id = 1e4;
  while (currentDate <= today) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), startDate.getDate());
    const paidDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 4);
    const isPast = currentDate.getMonth() < today.getMonth();
    memStore.payments.push({
      id: id++,
      userId: 1,
      personId: emi.personId,
      emiId: emi.id,
      amount: emi.amount,
      dueDate,
      paidDate: isPast ? paidDate : null,
      status: isPast ? "paid" : "pending",
      paidBy: "borrower",
      // Sunny paid his EMI
      notes: isPast ? `Payment for ${dueDate.toLocaleString("default", { month: "short" })}` : "",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
})();
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available, tracking in-mem");
    const existing = memStore.users.find((u) => u.openId === user.openId);
    if (existing) {
      Object.assign(existing, { ...user, updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date() });
    } else {
      memStore.users.push({ id: 1, ...user, role: user.openId === ENV.ownerOpenId ? "admin" : "user", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date() });
    }
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available, checking memStore");
    let u = memStore.users.find((x) => x.openId === openId);
    if (!u) {
      u = { id: 1, openId, name: "Owner", email: "owner@example.com", loginMethod: "mock", role: "admin", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date() };
      memStore.users.push(u);
    }
    return u;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createPerson(userId, name, notes) {
  const db = await getDb();
  if (!db) {
    const newPerson = { id: getNextId(), userId, name, notes: notes || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.persons.push(newPerson);
    return [newPerson];
  }
  return db.insert(persons).values({
    userId,
    name,
    notes
  });
}
async function getPersonsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.persons.filter((p) => p.userId === userId);
  }
  return db.select().from(persons).where(eq(persons.userId, userId));
}
async function getPersonById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.persons.find((p) => p.id === id);
  }
  const result = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
  return result[0];
}
async function updatePerson(id, name, notes) {
  const db = await getDb();
  if (!db) {
    const person = memStore.persons.find((p) => p.id === id);
    if (person) {
      person.name = name;
      person.notes = notes || null;
      person.updatedAt = /* @__PURE__ */ new Date();
    }
    return person;
  }
  return db.update(persons).set({ name, notes }).where(eq(persons.id, id));
}
async function deletePerson(id) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.persons.findIndex((p) => p.id === id);
    if (idx !== -1) memStore.persons.splice(idx, 1);
    return;
  }
  return db.delete(persons).where(eq(persons.id, id));
}
async function createEMI(userId, personId, amount, startDate, endDate, description) {
  const db = await getDb();
  if (!db) {
    const newEMI = { id: getNextId(), userId, personId, amount, startDate, endDate: endDate || null, description: description || null, isActive: 1, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.emis.push(newEMI);
    return [newEMI];
  }
  return db.insert(emis).values({
    userId,
    personId,
    amount,
    startDate,
    endDate,
    description,
    isActive: 1
  });
}
async function getEMIsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.emis.filter((e) => e.userId === userId);
  }
  return db.select().from(emis).where(eq(emis.userId, userId));
}
async function getEMIById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.emis.find((e) => e.id === id);
  }
  const result = await db.select().from(emis).where(eq(emis.id, id)).limit(1);
  return result[0];
}
async function updateEMI(id, amount, endDate, isActive, description) {
  const db = await getDb();
  if (!db) {
    const emi = memStore.emis.find((e) => e.id === id);
    if (emi) {
      if (amount !== void 0) emi.amount = amount;
      if (endDate !== void 0) emi.endDate = endDate || null;
      if (isActive !== void 0) emi.isActive = isActive;
      if (description !== void 0) emi.description = description || null;
      emi.updatedAt = /* @__PURE__ */ new Date();
    }
    return emi;
  }
  const updates = {};
  if (amount !== void 0) updates.amount = amount;
  if (endDate !== void 0) updates.endDate = endDate;
  if (isActive !== void 0) updates.isActive = isActive;
  if (description !== void 0) updates.description = description;
  return db.update(emis).set(updates).where(eq(emis.id, id));
}
async function deleteEMI(id) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.emis.findIndex((e) => e.id === id);
    if (idx !== -1) memStore.emis.splice(idx, 1);
    memStore.payments = memStore.payments.filter((p) => p.emiId !== id);
    return;
  }
  return db.delete(emis).where(eq(emis.id, id));
}
async function createLoan(userId, personId, amount, type, date, notes) {
  const db = await getDb();
  if (!db) {
    const newLoan = { id: getNextId(), userId, personId, amount, type, date, notes: notes || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.loans.push(newLoan);
    return [newLoan];
  }
  return db.insert(loans).values({
    userId,
    personId,
    amount,
    type,
    date,
    notes
  });
}
async function getLoansByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.loans.filter((l) => l.userId === userId);
  }
  return db.select().from(loans).where(eq(loans.userId, userId));
}
async function getLoanById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.loans.find((l) => l.id === id);
  }
  const result = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return result[0];
}
async function updateLoan(id, amount, date, notes) {
  const db = await getDb();
  if (!db) {
    const loan = memStore.loans.find((l) => l.id === id);
    if (loan) {
      if (amount !== void 0) loan.amount = amount;
      if (date !== void 0) loan.date = date;
      if (notes !== void 0) loan.notes = notes || null;
      loan.updatedAt = /* @__PURE__ */ new Date();
    }
    return loan;
  }
  const updates = {};
  if (amount !== void 0) updates.amount = amount;
  if (date !== void 0) updates.date = date;
  if (notes !== void 0) updates.notes = notes;
  return db.update(loans).set(updates).where(eq(loans.id, id));
}
async function deleteLoan(id) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.loans.findIndex((l) => l.id === id);
    if (idx !== -1) memStore.loans.splice(idx, 1);
    return;
  }
  return db.delete(loans).where(eq(loans.id, id));
}
async function getPaymentsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.payments.filter((p) => p.userId === userId);
  }
  return db.select().from(payments).where(eq(payments.userId, userId));
}
async function getPaymentById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.payments.find((p) => p.id === id);
  }
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result[0];
}
async function updatePaymentStatus(id, status, paidDate, paidBy) {
  const db = await getDb();
  if (!db) {
    const payment = memStore.payments.find((p) => p.id === id);
    if (payment) {
      payment.status = status;
      payment.paidDate = paidDate || null;
      if (paidBy !== void 0) payment.paidBy = paidBy;
      payment.updatedAt = /* @__PURE__ */ new Date();
    }
    return payment;
  }
  const updates = { status };
  if (paidDate !== void 0) updates.paidDate = paidDate;
  if (paidBy !== void 0) updates.paidBy = paidBy;
  return db.update(payments).set(updates).where(eq(payments.id, id));
}
async function deletePayment(id) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.payments.findIndex((p) => p.id === id);
    if (idx !== -1) memStore.payments.splice(idx, 1);
    return;
  }
  return db.delete(payments).where(eq(payments.id, id));
}
async function getPaymentsByPersonAndMonth(userId, personId, year, month) {
  const db = await getDb();
  if (!db) {
    const startDate2 = new Date(year, month - 1, 1);
    const endDate2 = new Date(year, month, 0, 23, 59, 59);
    return memStore.payments.filter(
      (p) => p.userId === userId && p.personId === personId && new Date(p.dueDate) >= startDate2 && new Date(p.dueDate) <= endDate2
    );
  }
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return db.select().from(payments).where(
    and(
      eq(payments.userId, userId),
      eq(payments.personId, personId),
      gte(payments.dueDate, startDate),
      lte(payments.dueDate, endDate)
    )
  );
}
async function getPaymentsByMonth(userId, year, month) {
  const db = await getDb();
  if (!db) {
    const startDate2 = new Date(year, month - 1, 1);
    const endDate2 = new Date(year, month, 0, 23, 59, 59);
    return memStore.payments.filter(
      (p) => p.userId === userId && new Date(p.dueDate) >= startDate2 && new Date(p.dueDate) <= endDate2
    );
  }
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return db.select().from(payments).where(
    and(
      eq(payments.userId, userId),
      gte(payments.dueDate, startDate),
      lte(payments.dueDate, endDate)
    )
  );
}
async function createCreditCard(userId, name, cardLimit, interestRate, lateFee) {
  const db = await getDb();
  if (!db) {
    const newCard = { id: getNextId(), userId, name, cardLimit, interestRate, lateFee, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.creditCards.push(newCard);
    return [newCard];
  }
  return db.insert(creditCards).values({ userId, name, cardLimit, interestRate, lateFee });
}
async function getCreditCardsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCards.filter((c) => c.userId === userId);
  }
  return db.select().from(creditCards).where(eq(creditCards.userId, userId));
}
async function getCreditCardById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCards.find((c) => c.id === id);
  }
  const result = await db.select().from(creditCards).where(eq(creditCards.id, id)).limit(1);
  return result[0];
}
async function updateCreditCard(id, name, cardLimit, interestRate, lateFee) {
  const db = await getDb();
  if (!db) {
    const card = memStore.creditCards.find((c) => c.id === id);
    if (card) {
      card.name = name;
      card.cardLimit = cardLimit;
      card.interestRate = interestRate;
      card.lateFee = lateFee;
      card.updatedAt = /* @__PURE__ */ new Date();
    }
    return card;
  }
  return db.update(creditCards).set({ name, cardLimit, interestRate, lateFee }).where(eq(creditCards.id, id));
}
async function deleteCreditCard(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.creditCards.findIndex((c) => c.id === id);
    if (index !== -1) memStore.creditCards.splice(index, 1);
    memStore.creditCardDebts = memStore.creditCardDebts.filter((d) => d.creditCardId !== id);
    return;
  }
  return db.delete(creditCards).where(eq(creditCards.id, id));
}
async function createCreditCardDebt(userId, creditCardId, borrowerName, amount, interestRate, lateFee, date, notes) {
  const db = await getDb();
  if (!db) {
    const newDebt = { id: getNextId(), userId, creditCardId, borrowerName, amount, interestRate, lateFee, date, notes: notes || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.creditCardDebts.push(newDebt);
    return [newDebt];
  }
  return db.insert(creditCardDebts).values({ userId, creditCardId, borrowerName, amount, interestRate, lateFee, date, notes });
}
async function getCreditCardDebtsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCardDebts.filter((d) => d.userId === userId);
  }
  return db.select().from(creditCardDebts).where(eq(creditCardDebts.userId, userId));
}
async function getCreditCardDebtById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCardDebts.find((d) => d.id === id);
  }
  const result = await db.select().from(creditCardDebts).where(eq(creditCardDebts.id, id)).limit(1);
  return result[0];
}
async function updateCreditCardDebt(id, amount, date, notes) {
  const db = await getDb();
  if (!db) {
    const debt = memStore.creditCardDebts.find((d) => d.id === id);
    if (debt) {
      debt.amount = amount;
      debt.date = date;
      debt.notes = notes || null;
      debt.updatedAt = /* @__PURE__ */ new Date();
    }
    return debt;
  }
  return db.update(creditCardDebts).set({ amount, date, notes }).where(eq(creditCardDebts.id, id));
}
async function deleteCreditCardDebt(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.creditCardDebts.findIndex((d) => d.id === id);
    if (index !== -1) memStore.creditCardDebts.splice(index, 1);
    return;
  }
  return db.delete(creditCardDebts).where(eq(creditCardDebts.id, id));
}
async function createChitti(userId, name, totalAmount, members, monthlyContribution, friendName, startDate, status = "active") {
  const db = await getDb();
  if (!db) {
    const newChitti = { id: getNextId(), userId, name, totalAmount, members, monthlyContribution, friendName, startDate, status, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.chittis.push(newChitti);
    return [newChitti];
  }
  return db.insert(chittis).values({ userId, name, totalAmount, members, monthlyContribution, friendName, startDate, status });
}
async function getChittisByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.chittis.filter((c) => c.userId === userId);
  }
  return db.select().from(chittis).where(eq(chittis.userId, userId));
}
async function getChittiById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.chittis.find((c) => c.id === id);
  }
  const result = await db.select().from(chittis).where(eq(chittis.id, id)).limit(1);
  return result[0];
}
async function updateChitti(id, name, totalAmount, members, monthlyContribution, friendName, startDate, status) {
  const db = await getDb();
  if (!db) {
    const chitti = memStore.chittis.find((c) => c.id === id);
    if (chitti) {
      chitti.name = name;
      chitti.totalAmount = totalAmount;
      chitti.members = members;
      chitti.monthlyContribution = monthlyContribution;
      chitti.friendName = friendName;
      chitti.startDate = startDate;
      chitti.status = status;
      chitti.updatedAt = /* @__PURE__ */ new Date();
    }
    return chitti;
  }
  return db.update(chittis).set({ name, totalAmount, members, monthlyContribution, friendName, startDate, status }).where(eq(chittis.id, id));
}
async function deleteChitti(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.chittis.findIndex((c) => c.id === id);
    if (index !== -1) memStore.chittis.splice(index, 1);
    memStore.chittiContributions = memStore.chittiContributions.filter((c) => c.chittiId !== id);
    return;
  }
  return db.delete(chittis).where(eq(chittis.id, id));
}
async function createChittiContribution(userId, chittiId, amount, date, type, notes) {
  const db = await getDb();
  if (!db) {
    const newContrib = { id: getNextId(), userId, chittiId, amount, date, type, notes: notes || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.chittiContributions.push(newContrib);
    return [newContrib];
  }
  return db.insert(chittiContributions).values({ userId, chittiId, amount, date, type, notes });
}
async function getChittiContributionsByChittiId(chittiId) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.filter((c) => c.chittiId === chittiId);
  }
  return db.select().from(chittiContributions).where(eq(chittiContributions.chittiId, chittiId));
}
async function getChittiContributionsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.filter((c) => c.userId === userId);
  }
  return db.select().from(chittiContributions).where(eq(chittiContributions.userId, userId));
}
async function getChittiContributionById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.find((c) => c.id === id);
  }
  const result = await db.select().from(chittiContributions).where(eq(chittiContributions.id, id)).limit(1);
  return result[0];
}
async function deleteChittiContribution(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.chittiContributions.findIndex((c) => c.id === id);
    if (index !== -1) memStore.chittiContributions.splice(index, 1);
    return;
  }
  return db.delete(chittiContributions).where(eq(chittiContributions.id, id));
}
async function createGeneralExpense(userId, amount, date, category, description) {
  const db = await getDb();
  if (!db) {
    const newExp = { id: getNextId(), userId, amount, date, category, description: description || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.generalExpenses.push(newExp);
    return [newExp];
  }
  return db.insert(generalExpenses).values({ userId, amount, date, category, description });
}
async function getGeneralExpensesByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.generalExpenses.filter((e) => e.userId === userId);
  }
  return db.select().from(generalExpenses).where(eq(generalExpenses.userId, userId));
}
async function getGeneralExpenseById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.generalExpenses.find((e) => e.id === id);
  }
  const result = await db.select().from(generalExpenses).where(eq(generalExpenses.id, id)).limit(1);
  return result[0];
}
async function updateGeneralExpense(id, amount, date, category, description) {
  const db = await getDb();
  if (!db) {
    const exp = memStore.generalExpenses.find((e) => e.id === id);
    if (exp) {
      exp.amount = amount;
      exp.date = date;
      exp.category = category;
      exp.description = description || null;
      exp.updatedAt = /* @__PURE__ */ new Date();
    }
    return exp;
  }
  return db.update(generalExpenses).set({ amount, date, category, description }).where(eq(generalExpenses.id, id));
}
async function deleteGeneralExpense(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.generalExpenses.findIndex((e) => e.id === id);
    if (index !== -1) memStore.generalExpenses.splice(index, 1);
    return;
  }
  return db.delete(generalExpenses).where(eq(generalExpenses.id, id));
}
async function getGeneralExpenseCategoryBreakdown(userId) {
  const db = await getDb();
  if (!db) {
    const userExps = memStore.generalExpenses.filter((e) => e.userId === userId);
    const breakdown2 = {};
    for (const exp of userExps) {
      breakdown2[exp.category] = (breakdown2[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown2).map(([category, amount]) => ({ category, amount }));
  }
  const all = await db.select().from(generalExpenses).where(eq(generalExpenses.userId, userId));
  const breakdown = {};
  for (const exp of all) {
    breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
  }
  return Object.entries(breakdown).map(([category, amount]) => ({ category, amount }));
}
async function createGoldLoanInterest(userId, amount, date, paidForPersonId, notes) {
  const db = await getDb();
  if (!db) {
    const newGold = { id: getNextId(), userId, amount, date, paidForPersonId, notes: notes || null, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() };
    memStore.goldLoanInterest.push(newGold);
    return [newGold];
  }
  return db.insert(goldLoanInterest).values({ userId, amount, date, paidForPersonId, notes });
}
async function getGoldLoanInterestsByUserId(userId) {
  const db = await getDb();
  if (!db) {
    return memStore.goldLoanInterest.filter((g) => g.userId === userId);
  }
  return db.select().from(goldLoanInterest).where(eq(goldLoanInterest.userId, userId));
}
async function getGoldLoanInterestById(id) {
  const db = await getDb();
  if (!db) {
    return memStore.goldLoanInterest.find((g) => g.id === id);
  }
  const result = await db.select().from(goldLoanInterest).where(eq(goldLoanInterest.id, id)).limit(1);
  return result[0];
}
async function updateGoldLoanInterest(id, amount, date, paidForPersonId, notes) {
  const db = await getDb();
  if (!db) {
    const gold = memStore.goldLoanInterest.find((g) => g.id === id);
    if (gold) {
      gold.amount = amount;
      gold.date = date;
      gold.paidForPersonId = paidForPersonId;
      gold.notes = notes || null;
      gold.updatedAt = /* @__PURE__ */ new Date();
    }
    return gold;
  }
  return db.update(goldLoanInterest).set({ amount, date, paidForPersonId, notes }).where(eq(goldLoanInterest.id, id));
}
async function deleteGoldLoanInterest(id) {
  const db = await getDb();
  if (!db) {
    const index = memStore.goldLoanInterest.findIndex((g) => g.id === id);
    if (index !== -1) memStore.goldLoanInterest.splice(index, 1);
    return;
  }
  return db.delete(goldLoanInterest).where(eq(goldLoanInterest.id, id));
}
async function getPersonBalance(userId, personId) {
  const db = await getDb();
  if (!db) {
    const allPayments2 = memStore.payments.filter((p) => p.userId === userId && p.personId === personId);
    const allLoans2 = memStore.loans.filter((l) => l.userId === userId && l.personId === personId);
    const allGold2 = memStore.goldLoanInterest.filter((g) => g.userId === userId && g.paidForPersonId === personId);
    let totalOwedToMe2 = 0;
    let totalOwedByMe2 = 0;
    for (const payment of allPayments2) {
      if (payment.status === "paid") {
        if (payment.paidBy === "user") {
          totalOwedToMe2 += payment.amount;
        } else {
        }
      } else {
      }
    }
    for (const loan of allLoans2) {
      if (loan.type === "given") {
        totalOwedToMe2 += loan.amount;
      } else if (loan.type === "received") {
        totalOwedByMe2 += loan.amount;
      }
    }
    for (const gold of allGold2) {
      totalOwedToMe2 += gold.amount;
    }
    const netBalance2 = totalOwedToMe2 - totalOwedByMe2;
    return {
      personId,
      totalOwedToMe: totalOwedToMe2,
      totalOwedByMe: totalOwedByMe2,
      netBalance: netBalance2
    };
  }
  const allPayments = await db.select().from(payments).where(and(eq(payments.userId, userId), eq(payments.personId, personId)));
  const allLoans = await db.select().from(loans).where(and(eq(loans.userId, userId), eq(loans.personId, personId)));
  const allGold = await db.select().from(goldLoanInterest).where(and(eq(goldLoanInterest.userId, userId), eq(goldLoanInterest.paidForPersonId, personId)));
  let totalOwedToMe = 0;
  let totalOwedByMe = 0;
  for (const payment of allPayments) {
    if (payment.status === "paid") {
      if (payment.paidBy === "user") {
        totalOwedToMe += payment.amount;
      }
    }
  }
  for (const loan of allLoans) {
    if (loan.type === "given") {
      totalOwedToMe += loan.amount;
    } else if (loan.type === "received") {
      totalOwedByMe += loan.amount;
    }
  }
  for (const gold of allGold) {
    totalOwedToMe += gold.amount;
  }
  const netBalance = totalOwedToMe - totalOwedByMe;
  return {
    personId,
    totalOwedToMe,
    totalOwedByMe,
    netBalance
  };
}
async function getAllPersonBalances(userId) {
  const db = await getDb();
  if (!db) {
    const userPersons2 = memStore.persons.filter((p) => p.userId === userId);
    const balances2 = [];
    for (const person of userPersons2) {
      const balance = await getPersonBalance(userId, person.id);
      balances2.push({
        person,
        ...balance
      });
    }
    return balances2;
  }
  const userPersons = await db.select().from(persons).where(eq(persons.userId, userId));
  const balances = [];
  for (const person of userPersons) {
    const balance = await getPersonBalance(userId, person.id);
    balances.push({
      person,
      ...balance
    });
  }
  return balances;
}
async function getDashboardSummary(userId) {
  const db = await getDb();
  if (!db) {
    const allPayments2 = memStore.payments.filter((p) => p.userId === userId);
    const allDebts2 = memStore.creditCardDebts.filter((d) => d.userId === userId);
    const allLoans2 = memStore.loans.filter((l) => l.userId === userId);
    const allGold2 = memStore.goldLoanInterest.filter((g) => g.userId === userId);
    const allExpenses2 = memStore.generalExpenses.filter((e) => e.userId === userId);
    let totalPaid2 = 0;
    let totalPending2 = 0;
    for (const payment of allPayments2) {
      if (payment.status === "paid") {
        totalPaid2 += payment.amount;
      } else if (payment.status === "pending") {
        totalPending2 += payment.amount;
      }
    }
    let totalCreditCardDebt2 = allDebts2.reduce((sum, d) => sum + d.amount, 0);
    let totalGeneralExpense2 = allExpenses2.reduce((sum, e) => sum + e.amount, 0);
    let totalLoansGiven2 = allLoans2.filter((l) => l.type === "given").reduce((sum, l) => sum + l.amount, 0);
    let totalLoansReceived2 = allLoans2.filter((l) => l.type === "received").reduce((sum, l) => sum + l.amount, 0);
    let totalGoldLoanPaid2 = allGold2.reduce((sum, g) => sum + g.amount, 0);
    return {
      totalPaid: totalPaid2,
      totalPending: totalPending2,
      totalOutstanding: totalPaid2 + totalPending2,
      totalCreditCardDebt: totalCreditCardDebt2,
      totalGeneralExpense: totalGeneralExpense2,
      totalLoansGiven: totalLoansGiven2,
      totalLoansReceived: totalLoansReceived2,
      totalGoldLoanPaid: totalGoldLoanPaid2
    };
  }
  const allPayments = await db.select().from(payments).where(eq(payments.userId, userId));
  const allDebts = await db.select().from(creditCardDebts).where(eq(creditCardDebts.userId, userId));
  const allLoans = await db.select().from(loans).where(eq(loans.userId, userId));
  const allGold = await db.select().from(goldLoanInterest).where(eq(goldLoanInterest.userId, userId));
  const allExpenses = await db.select().from(generalExpenses).where(eq(generalExpenses.userId, userId));
  let totalPaid = 0;
  let totalPending = 0;
  for (const payment of allPayments) {
    if (payment.status === "paid") {
      totalPaid += payment.amount;
    } else if (payment.status === "pending") {
      totalPending += payment.amount;
    }
  }
  let totalCreditCardDebt = allDebts.reduce((sum, d) => sum + d.amount, 0);
  let totalGeneralExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  let totalLoansGiven = allLoans.filter((l) => l.type === "given").reduce((sum, l) => sum + l.amount, 0);
  let totalLoansReceived = allLoans.filter((l) => l.type === "received").reduce((sum, l) => sum + l.amount, 0);
  let totalGoldLoanPaid = allGold.reduce((sum, g) => sum + g.amount, 0);
  return {
    totalPaid,
    totalPending,
    totalOutstanding: totalPaid + totalPending,
    totalCreditCardDebt,
    totalGeneralExpense,
    totalLoansGiven,
    totalLoansReceived,
    totalGoldLoanPaid
  };
}
async function getMonthlyBreakdown(userId, year) {
  const db = await getDb();
  if (!db) {
    const monthlyData2 = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData2[month] = { paid: 0, pending: 0 };
    }
    const startDate2 = new Date(year, 0, 1);
    const endDate2 = new Date(year, 11, 31, 23, 59, 59);
    const yearPayments2 = memStore.payments.filter(
      (p) => p.userId === userId && new Date(p.dueDate) >= startDate2 && new Date(p.dueDate) <= endDate2
    );
    for (const payment of yearPayments2) {
      const month = new Date(payment.dueDate).getMonth() + 1;
      if (payment.status === "paid") {
        monthlyData2[month].paid += payment.amount;
      } else if (payment.status === "pending") {
        monthlyData2[month].pending += payment.amount;
      }
    }
    return monthlyData2;
  }
  const monthlyData = {};
  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = { paid: 0, pending: 0 };
  }
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  const yearPayments = await db.select().from(payments).where(
    and(
      eq(payments.userId, userId),
      gte(payments.dueDate, startDate),
      lte(payments.dueDate, endDate)
    )
  );
  for (const payment of yearPayments) {
    const month = payment.dueDate.getMonth() + 1;
    if (payment.status === "paid") {
      monthlyData[month].paid += payment.amount;
    } else if (payment.status === "pending") {
      monthlyData[month].pending += payment.amount;
    }
  }
  return monthlyData;
}
async function generateEMIPayments(userId, emiId, emi) {
  const db = await getDb();
  if (!db) {
    const startDate2 = new Date(emi.startDate);
    const endDate2 = emi.endDate ? new Date(emi.endDate) : /* @__PURE__ */ new Date();
    const monthsToGenerate2 = [];
    let currentDate2 = new Date(startDate2.getFullYear(), startDate2.getMonth(), 1);
    while (currentDate2 <= endDate2) {
      const dueDate = new Date(currentDate2.getFullYear(), currentDate2.getMonth(), startDate2.getDate());
      if (dueDate.getMonth() !== currentDate2.getMonth()) {
        dueDate.setDate(0);
      }
      monthsToGenerate2.push(dueDate);
      currentDate2.setMonth(currentDate2.getMonth() + 1);
    }
    const existingPayments2 = memStore.payments.filter((p) => p.emiId === emiId);
    const existingDates2 = new Set(
      existingPayments2.map((p) => new Date(p.dueDate).toISOString().split("T")[0])
    );
    for (const dueDate of monthsToGenerate2) {
      const dateStr = dueDate.toISOString().split("T")[0];
      if (!existingDates2.has(dateStr)) {
        memStore.payments.push({
          id: getNextId(),
          userId,
          personId: emi.personId,
          emiId,
          amount: emi.amount,
          dueDate,
          paidDate: null,
          status: "pending",
          paidBy: "user",
          notes: null,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return;
  }
  const startDate = new Date(emi.startDate);
  const endDate = emi.endDate ? new Date(emi.endDate) : /* @__PURE__ */ new Date();
  const monthsToGenerate = [];
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (currentDate <= endDate) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), startDate.getDate());
    if (dueDate.getMonth() !== currentDate.getMonth()) {
      dueDate.setDate(0);
    }
    monthsToGenerate.push(dueDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  const existingPayments = await db.select().from(payments).where(eq(payments.emiId, emiId));
  const existingDates = new Set(
    existingPayments.map((p) => p.dueDate.toISOString().split("T")[0])
  );
  for (const dueDate of monthsToGenerate) {
    const dateStr = dueDate.toISOString().split("T")[0];
    if (!existingDates.has(dateStr)) {
      await db.insert(payments).values({
        userId,
        personId: emi.personId,
        emiId,
        amount: emi.amount,
        dueDate,
        status: "pending",
        paidBy: "user"
      });
    }
  }
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || LOCAL_HOSTS.has(hostname);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isLocal ? "lax" : "none",
    secure: isLocal ? false : isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user && sessionUserId === "dev_user_1") {
      user = {
        id: 1,
        openId: "dev_user_1",
        name: "Local Developer",
        email: "dev@localhost",
        loginMethod: "mock",
        role: "admin",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      };
    }
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  const handleMockLogin = async (req, res) => {
    if (!ENV.oAuthServerUrl) {
      try {
        const mockOpenId = "dev_user_1";
        const mockName = "Local Developer";
        await upsertUser({
          openId: mockOpenId,
          name: mockName,
          email: "dev@localhost",
          loginMethod: "mock",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        const sessionToken = await sdk.createSessionToken(mockOpenId, {
          name: mockName,
          expiresInMs: ONE_YEAR_MS
        });
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        res.redirect(302, "/");
      } catch (error) {
        console.error("[OAuth] Local mock login failed:", error);
        res.status(500).send("Local mock login failed");
      }
    } else {
      res.status(404).send("Not Found");
    }
  };
  app2.get("/app-auth", handleMockLogin);
  app2.get("/api/app-auth", handleMockLogin);
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/app.ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
var PersonSchema = z2.object({
  name: z2.string().min(1, "Name is required"),
  notes: z2.string().optional()
});
var EMISchema = z2.object({
  personId: z2.number().positive("Person is required"),
  amount: z2.number().positive("Amount must be positive"),
  startDate: z2.date(),
  endDate: z2.date().optional(),
  description: z2.string().optional()
});
var LoanSchema = z2.object({
  personId: z2.number().positive("Person is required"),
  amount: z2.number().positive("Amount must be positive"),
  type: z2.enum(["given", "received"]),
  date: z2.date(),
  notes: z2.string().optional()
});
var PaymentStatusSchema = z2.object({
  status: z2.enum(["pending", "paid"]),
  paidDate: z2.date().optional(),
  paidBy: z2.enum(["user", "borrower"]).optional()
});
var CreditCardSchema = z2.object({
  name: z2.string().min(1, "Name is required"),
  cardLimit: z2.number().positive("Card limit must be positive"),
  interestRate: z2.number().nonnegative(),
  lateFee: z2.number().nonnegative()
});
var CreditCardDebtSchema = z2.object({
  creditCardId: z2.number().positive(),
  borrowerName: z2.string().min(1, "Borrower name is required"),
  amount: z2.number().positive("Amount must be positive"),
  interestRate: z2.number().nonnegative(),
  lateFee: z2.number().nonnegative(),
  date: z2.date(),
  notes: z2.string().optional()
});
var ChittiSchema = z2.object({
  name: z2.string().min(1, "Name is required"),
  totalAmount: z2.number().positive("Total amount must be positive"),
  members: z2.number().positive("Members must be positive"),
  monthlyContribution: z2.number().positive("Monthly contribution must be positive"),
  friendName: z2.string().min(1, "Friend name is required"),
  startDate: z2.date(),
  status: z2.enum(["active", "completed"]).default("active")
});
var ChittiContributionSchema = z2.object({
  chittiId: z2.number().positive(),
  amount: z2.number().positive("Amount must be positive"),
  date: z2.date(),
  type: z2.enum(["contribution", "payout"]),
  notes: z2.string().optional()
});
var GeneralExpenseSchema = z2.object({
  amount: z2.number().positive("Amount must be positive"),
  date: z2.date(),
  category: z2.string().min(1, "Category is required"),
  description: z2.string().optional()
});
var GoldLoanSchema = z2.object({
  amount: z2.number().positive("Amount must be positive"),
  date: z2.date(),
  paidForPersonId: z2.number().positive("Person is required"),
  notes: z2.string().optional()
});
var personRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getPersonsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching persons:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch persons" });
    }
  }),
  create: protectedProcedure.input(PersonSchema).mutation(async ({ ctx, input }) => {
    try {
      await createPerson(ctx.user.id, input.name, input.notes);
      return { success: true };
    } catch (error) {
      console.error("Error creating person:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create person" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...PersonSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.id);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updatePerson(input.id, input.name, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating person:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update person" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.id);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deletePerson(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting person:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete person" });
    }
  })
});
var emiRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getEMIsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching EMIs:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch EMIs" });
    }
  }),
  create: protectedProcedure.input(EMISchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      const result = await createEMI(ctx.user.id, input.personId, input.amount, input.startDate, input.endDate, input.description);
      const emis2 = await getEMIsByUserId(ctx.user.id);
      const newEmi = emis2[emis2.length - 1];
      if (newEmi) {
        await generateEMIPayments(ctx.user.id, newEmi.id, newEmi);
      }
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error creating EMI:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create EMI" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...EMISchema.partial().shape })).mutation(async ({ ctx, input }) => {
    try {
      const emi = await getEMIById(input.id);
      if (!emi || emi.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateEMI(input.id, input.amount, input.endDate, void 0, input.description);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating EMI:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update EMI" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const emi = await getEMIById(input.id);
      if (!emi || emi.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteEMI(emi.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting EMI:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete EMI" });
    }
  })
});
var loanRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getLoansByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching loans:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch loans" });
    }
  }),
  create: protectedProcedure.input(LoanSchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await createLoan(ctx.user.id, input.personId, input.amount, input.type, input.date, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error creating loan:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create loan" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...LoanSchema.partial().shape })).mutation(async ({ ctx, input }) => {
    try {
      const loan = await getLoanById(input.id);
      if (!loan || loan.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateLoan(input.id, input.amount, input.date, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating loan:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update loan" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const loan = await getLoanById(input.id);
      if (!loan || loan.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteLoan(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting loan:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete loan" });
    }
  })
});
var paymentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getPaymentsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error fetching payments:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
    }
  }),
  getByMonth: protectedProcedure.input(z2.object({ year: z2.number(), month: z2.number().min(1).max(12) })).query(async ({ ctx, input }) => {
    try {
      return await getPaymentsByMonth(ctx.user.id, input.year, input.month);
    } catch (error) {
      console.error("Error fetching payments by month:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
    }
  }),
  getByPersonAndMonth: protectedProcedure.input(z2.object({ personId: z2.number().positive(), year: z2.number(), month: z2.number().min(1).max(12) })).query(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      return await getPaymentsByPersonAndMonth(ctx.user.id, input.personId, input.year, input.month);
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error fetching payments by person and month:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch payments" });
    }
  }),
  updateStatus: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...PaymentStatusSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const payment = await getPaymentById(input.id);
      if (!payment || payment.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updatePaymentStatus(input.id, input.status, input.paidDate, input.paidBy);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating payment status:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update payment status" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const payment = await getPaymentById(input.id);
      if (!payment || payment.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deletePayment(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting payment:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete payment" });
    }
  })
});
var balanceRouter = router({
  getPersonBalance: protectedProcedure.input(z2.object({ personId: z2.number().positive() })).query(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.personId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      return await getPersonBalance(ctx.user.id, input.personId);
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error fetching person balance:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch balance" });
    }
  }),
  getAllBalances: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getAllPersonBalances(ctx.user.id);
    } catch (error) {
      console.error("Error fetching all balances:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch balances" });
    }
  }),
  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getDashboardSummary(ctx.user.id);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch summary" });
    }
  }),
  getMonthlyBreakdown: protectedProcedure.input(z2.object({ year: z2.number() })).query(async ({ ctx, input }) => {
    try {
      return await getMonthlyBreakdown(ctx.user.id, input.year);
    } catch (error) {
      console.error("Error fetching monthly breakdown:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch breakdown" });
    }
  })
});
var creditCardRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getCreditCardsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing credit cards:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list credit cards" });
    }
  }),
  create: protectedProcedure.input(CreditCardSchema).mutation(async ({ ctx, input }) => {
    try {
      await createCreditCard(ctx.user.id, input.name, input.cardLimit, input.interestRate, input.lateFee);
      return { success: true };
    } catch (error) {
      console.error("Error creating credit card:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create credit card" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...CreditCardSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const card = await getCreditCardById(input.id);
      if (!card || card.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateCreditCard(input.id, input.name, input.cardLimit, input.interestRate, input.lateFee);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating credit card:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update credit card" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const card = await getCreditCardById(input.id);
      if (!card || card.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteCreditCard(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting credit card:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete credit card" });
    }
  }),
  listDebts: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getCreditCardDebtsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing credit card debts:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list credit card debts" });
    }
  }),
  createDebt: protectedProcedure.input(CreditCardDebtSchema).mutation(async ({ ctx, input }) => {
    try {
      const card = await getCreditCardById(input.creditCardId);
      if (!card || card.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized credit card reference" });
      }
      await createCreditCardDebt(
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
      if (error instanceof TRPCError3) throw error;
      console.error("Error creating credit card debt:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create credit card debt" });
    }
  }),
  updateDebt: protectedProcedure.input(z2.object({ id: z2.number().positive(), amount: z2.number().positive(), date: z2.date(), notes: z2.string().optional() })).mutation(async ({ ctx, input }) => {
    try {
      const debt = await getCreditCardDebtById(input.id);
      if (!debt || debt.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateCreditCardDebt(input.id, input.amount, input.date, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating credit card debt:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update credit card debt" });
    }
  }),
  deleteDebt: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const debt = await getCreditCardDebtById(input.id);
      if (!debt || debt.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteCreditCardDebt(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting credit card debt:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete credit card debt" });
    }
  })
});
var chittiRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getChittisByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing chittis:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list chittis" });
    }
  }),
  create: protectedProcedure.input(ChittiSchema).mutation(async ({ ctx, input }) => {
    try {
      await createChitti(
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
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create chitti" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...ChittiSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const chitti = await getChittiById(input.id);
      if (!chitti || chitti.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateChitti(
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
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating chitti:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update chitti" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const chitti = await getChittiById(input.id);
      if (!chitti || chitti.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteChitti(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting chitti:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete chitti" });
    }
  }),
  listContributions: protectedProcedure.input(z2.object({ chittiId: z2.number().optional() })).query(async ({ ctx, input }) => {
    try {
      if (input.chittiId) {
        const chitti = await getChittiById(input.chittiId);
        if (!chitti || chitti.userId !== ctx.user.id) {
          throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
        }
        return await getChittiContributionsByChittiId(input.chittiId);
      }
      return await getChittiContributionsByUserId(ctx.user.id);
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error listing chitti contributions:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list contributions" });
    }
  }),
  createContribution: protectedProcedure.input(ChittiContributionSchema).mutation(async ({ ctx, input }) => {
    try {
      const chitti = await getChittiById(input.chittiId);
      if (!chitti || chitti.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized chitti reference" });
      }
      await createChittiContribution(ctx.user.id, input.chittiId, input.amount, input.date, input.type, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error creating chitti contribution:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create contribution" });
    }
  }),
  deleteContribution: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const contrib = await getChittiContributionById(input.id);
      if (!contrib || contrib.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteChittiContribution(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting chitti contribution:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete contribution" });
    }
  })
});
var expenseRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getGeneralExpensesByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing expenses:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list expenses" });
    }
  }),
  create: protectedProcedure.input(GeneralExpenseSchema).mutation(async ({ ctx, input }) => {
    try {
      await createGeneralExpense(ctx.user.id, input.amount, input.date, input.category, input.description);
      return { success: true };
    } catch (error) {
      console.error("Error creating expense:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create expense" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...GeneralExpenseSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const exp = await getGeneralExpenseById(input.id);
      if (!exp || exp.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateGeneralExpense(input.id, input.amount, input.date, input.category, input.description);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating expense:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update expense" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const exp = await getGeneralExpenseById(input.id);
      if (!exp || exp.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteGeneralExpense(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting expense:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete expense" });
    }
  }),
  getBreakdown: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getGeneralExpenseCategoryBreakdown(ctx.user.id);
    } catch (error) {
      console.error("Error fetching expense breakdown:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch expense breakdown" });
    }
  })
});
var goldLoanRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getGoldLoanInterestsByUserId(ctx.user.id);
    } catch (error) {
      console.error("Error listing gold loan interest logs:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to list gold loan logs" });
    }
  }),
  create: protectedProcedure.input(GoldLoanSchema).mutation(async ({ ctx, input }) => {
    try {
      const person = await getPersonById(input.paidForPersonId);
      if (!person || person.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized person reference" });
      }
      await createGoldLoanInterest(ctx.user.id, input.amount, input.date, input.paidForPersonId, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error creating gold loan log:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create gold loan log" });
    }
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number().positive(), ...GoldLoanSchema.shape })).mutation(async ({ ctx, input }) => {
    try {
      const log = await getGoldLoanInterestById(input.id);
      if (!log || log.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await updateGoldLoanInterest(input.id, input.amount, input.date, input.paidForPersonId, input.notes);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error updating gold loan log:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update gold loan log" });
    }
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const log = await getGoldLoanInterestById(input.id);
      if (!log || log.userId !== ctx.user.id) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Unauthorized" });
      }
      await deleteGoldLoanInterest(input.id);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      console.error("Error deleting gold loan log:", error);
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete gold loan log" });
    }
  })
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  person: personRouter,
  emi: emiRouter,
  loan: loanRouter,
  payment: paymentRouter,
  balance: balanceRouter,
  creditCard: creditCardRouter,
  chitti: chittiRouter,
  expense: expenseRouter,
  goldLoan: goldLoanRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/app.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var app_default = app;

// server/api-entry.ts
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
async function handler(req, res) {
  try {
    return app_default(req, res);
  } catch (err) {
    console.error("CRITICAL RUNTIME ERROR:", err);
    res.status(500).json({
      error: true,
      message: err?.message || String(err),
      stack: err?.stack
    });
  }
}
export {
  handler as default
};
