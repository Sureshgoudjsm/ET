import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import {
  InsertUser,
  users,
  persons,
  emis,
  loans,
  payments,
  creditCards,
  creditCardDebts,
  ccDebtTransactions,
  chittis,
  chittiContributions,
  generalExpenses,
  goldLoanInterest
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let hasAttemptedConnection = false;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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
        connectTimeout: 5000,
      });

      // Test connection and verify schema exists (users table)
      await _pool.promise().query("SELECT 1 FROM users LIMIT 1").catch((err) => {
        throw new Error(`Schema check failed (is the DB migrated?): ${err.message}`);
      });

      _db = drizzle(_pool);
      console.log("[Database] Connected successfully to MySQL database.");
    } catch (error) {
      console.warn("[Database] Failed to connect, falling back to in-memory store:", error);
      _db = null;
      if (_pool) {
        await _pool.promise().end().catch(() => {});
        _pool = null;
      }
    }
  } else {
    hasAttemptedConnection = true;
  }
  return _db;
}

let nextMemId = 1000;
function getNextId() {
  return nextMemId++;
}

// In-memory fallback database pre-populated with premium seed data
const memStore = {
  users: [] as any[],
  persons: [
    { id: 1, userId: 1, name: "Sunny (Brother-in-law)", relationship: "Family", notes: "EMI and Credit Card Debt tracking", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, userId: 1, name: "Bilal", relationship: "Friend", notes: "Personal loan tracking", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, userId: 1, name: "Mother", relationship: "Family", notes: "Gold Loan tracking", createdAt: new Date(), updatedAt: new Date() },
    { id: 4, userId: 1, name: "Sister", relationship: "Family", notes: "Gold Loan tracking", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  emis: [
    { id: 101, userId: 1, personId: 1, amount: 2000000, startDate: new Date("2026-01-01"), endDate: null, description: "Monthly EMI Contribution", isActive: 1, createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  loans: [
    { id: 201, userId: 1, personId: 2, amount: 500000, type: "given", date: new Date("2026-05-01"), notes: "Gave for emergency", createdAt: new Date(), updatedAt: new Date() },
    { id: 202, userId: 1, personId: 2, amount: 200000, type: "received", date: new Date("2026-05-15"), notes: "Bilal returned part of loan", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  payments: [] as any[],
  creditCards: [
    { id: 301, userId: 1, name: "SBI Card Prime", cardLimit: 30000000, interestRate: 4200, lateFee: 50000, createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  creditCardDebts: [
    { id: 401, userId: 1, creditCardId: 301, personId: 1, borrowerName: "Sunny", amount: 5000000, interestRate: 4200, lateFee: 50000, date: new Date("2026-01-15"), notes: "Mobile phone purchase", createdAt: new Date(), updatedAt: new Date() },
    { id: 402, userId: 1, creditCardId: 301, personId: 1, borrowerName: "Sunny", amount: 2500000, interestRate: 4200, lateFee: 50000, date: new Date("2026-03-10"), notes: "Flight tickets", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  ccDebtTransactions: [
    { id: 901, userId: 1, creditCardDebtId: 401, type: "principal", amount: 5000000, date: new Date("2026-01-15"), notes: "Mobile phone purchase", createdAt: new Date(), updatedAt: new Date() },
    { id: 902, userId: 1, creditCardDebtId: 402, type: "principal", amount: 2500000, date: new Date("2026-03-10"), notes: "Flight tickets", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  chittis: [
    { id: 501, userId: 1, name: "Sravani Chit Fund", totalAmount: 100000000, members: 20, monthlyContribution: 500000, friendName: "Ramesh", startDate: new Date("2026-01-01"), status: "active", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  chittiContributions: [
    { id: 601, userId: 1, chittiId: 501, amount: 500000, date: new Date("2026-01-10"), type: "contribution", notes: "Jan Contribution", createdAt: new Date(), updatedAt: new Date() },
    { id: 602, userId: 1, chittiId: 501, amount: 500000, date: new Date("2026-02-10"), type: "contribution", notes: "Feb Contribution", createdAt: new Date(), updatedAt: new Date() },
    { id: 603, userId: 1, chittiId: 501, amount: 500000, date: new Date("2026-03-10"), type: "contribution", notes: "Mar Contribution", createdAt: new Date(), updatedAt: new Date() },
    { id: 604, userId: 1, chittiId: 501, amount: 500000, date: new Date("2026-04-10"), type: "contribution", notes: "Apr Contribution", createdAt: new Date(), updatedAt: new Date() },
    { id: 605, userId: 1, chittiId: 501, amount: 85000000, date: new Date("2026-04-20"), type: "payout", notes: "Chit Payout Lifted", createdAt: new Date(), updatedAt: new Date() },
    { id: 606, userId: 1, chittiId: 501, amount: 500000, date: new Date("2026-05-10"), type: "contribution", notes: "May Contribution", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  generalExpenses: [
    { id: 701, userId: 1, amount: 450000, date: new Date("2026-05-02"), category: "Groceries", description: "Weekly market run", personId: null, isProxy: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 702, userId: 1, amount: 320000, date: new Date("2026-05-05"), category: "Food & Dining", description: "Dinner with family", personId: null, isProxy: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 703, userId: 1, amount: 280000, date: new Date("2026-05-10"), category: "Utilities", description: "Electricity bill", personId: null, isProxy: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 704, userId: 1, amount: 500000, date: new Date("2026-05-12"), category: "Transport", description: "Petrol fill up", personId: null, isProxy: 0, createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
  goldLoanInterest: [
    { id: 801, userId: 1, amount: 1200000, date: new Date("2026-04-15"), paidForPersonId: 3, notes: "April Interest payment for Mother", createdAt: new Date(), updatedAt: new Date() },
    { id: 802, userId: 1, amount: 800000, date: new Date("2026-05-15"), paidForPersonId: 4, notes: "May Interest payment for Sister", createdAt: new Date(), updatedAt: new Date() }
  ] as any[],
};

// Auto-populate payments for EMIs in memStore
(function initMemStorePayments() {
  const emi = memStore.emis[0];
  const startDate = new Date(emi.startDate);
  const today = new Date();
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  let id = 10000;
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
      paidBy: "borrower", // Sunny paid his EMI
      notes: isPast ? `Payment for ${dueDate.toLocaleString('default', { month: 'short' })}` : "",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
})();

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available, tracking in-mem");
    const existing = memStore.users.find(u => u.openId === user.openId);
    if (existing) {
      Object.assign(existing, { ...user, updatedAt: new Date(), lastSignedIn: new Date() });
    } else {
      memStore.users.push({ id: 1, ...user, role: user.openId === ENV.ownerOpenId ? 'admin' : 'user', createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    }
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available, checking memStore");
    let u = memStore.users.find(x => x.openId === openId);
    if (!u) {
      u = { id: 1, openId, name: "Owner", email: "owner@example.com", loginMethod: "mock", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
      memStore.users.push(u);
    }
    return u;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Person Queries ============
export async function createPerson(userId: number, name: string, relationship?: string, notes?: string) {
  const db = await getDb();
  if (!db) {
    const newPerson = { id: getNextId(), userId, name, relationship: relationship || null, notes: notes || null, createdAt: new Date(), updatedAt: new Date() };
    memStore.persons.push(newPerson);
    return [newPerson];
  }
  
  return db.insert(persons).values({
    userId,
    name,
    relationship,
    notes,
  });
}

export async function getPersonsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.persons.filter(p => p.userId === userId);
  }
  
  return db.select().from(persons).where(eq(persons.userId, userId));
}

export async function getPersonById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.persons.find(p => p.id === id);
  }
  
  const result = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
  return result[0];
}

export async function updatePerson(id: number, name: string, relationship?: string, notes?: string) {
  const db = await getDb();
  if (!db) {
    const person = memStore.persons.find(p => p.id === id);
    if (person) {
      person.name = name;
      person.relationship = relationship || null;
      person.notes = notes || null;
      person.updatedAt = new Date();
    }
    return person;
  }
  
  return db.update(persons).set({ name, relationship, notes }).where(eq(persons.id, id));
}

export async function deletePerson(id: number) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.persons.findIndex(p => p.id === id);
    if (idx !== -1) memStore.persons.splice(idx, 1);
    return;
  }
  
  return db.delete(persons).where(eq(persons.id, id));
}

// ============ EMI Queries ============
export async function createEMI(userId: number, personId: number, amount: number, startDate: Date, endDate?: Date, description?: string) {
  const db = await getDb();
  if (!db) {
    const newEMI = { id: getNextId(), userId, personId, amount, startDate, endDate: endDate || null, description: description || null, isActive: 1, createdAt: new Date(), updatedAt: new Date() };
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
    isActive: 1,
  });
}

export async function getEMIsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.emis.filter(e => e.userId === userId);
  }
  
  return db.select().from(emis).where(eq(emis.userId, userId));
}

export async function getEMIById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.emis.find(e => e.id === id);
  }
  
  const result = await db.select().from(emis).where(eq(emis.id, id)).limit(1);
  return result[0];
}

export async function updateEMI(id: number, amount?: number, endDate?: Date, isActive?: number, description?: string) {
  const db = await getDb();
  if (!db) {
    const emi = memStore.emis.find(e => e.id === id);
    if (emi) {
      if (amount !== undefined) emi.amount = amount;
      if (endDate !== undefined) emi.endDate = endDate || null;
      if (isActive !== undefined) emi.isActive = isActive;
      if (description !== undefined) emi.description = description || null;
      emi.updatedAt = new Date();
    }
    return emi;
  }
  
  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates.amount = amount;
  if (endDate !== undefined) updates.endDate = endDate;
  if (isActive !== undefined) updates.isActive = isActive;
  if (description !== undefined) updates.description = description;
  
  return db.update(emis).set(updates).where(eq(emis.id, id));
}

export async function deleteEMI(id: number) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.emis.findIndex(e => e.id === id);
    if (idx !== -1) memStore.emis.splice(idx, 1);
    memStore.payments = memStore.payments.filter(p => p.emiId !== id);
    return;
  }
  
  return db.delete(emis).where(eq(emis.id, id));
}

// ============ Loan Queries ============
export async function createLoan(userId: number, personId: number, amount: number, type: "given" | "received", date: Date, notes?: string) {
  const db = await getDb();
  if (!db) {
    const newLoan = { id: getNextId(), userId, personId, amount, type, date, notes: notes || null, createdAt: new Date(), updatedAt: new Date() };
    memStore.loans.push(newLoan);
    return [newLoan];
  }
  
  return db.insert(loans).values({
    userId,
    personId,
    amount,
    type,
    date,
    notes,
  });
}

export async function getLoansByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.loans.filter(l => l.userId === userId);
  }
  
  return db.select().from(loans).where(eq(loans.userId, userId));
}

export async function getLoanById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.loans.find(l => l.id === id);
  }
  
  const result = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return result[0];
}

export async function updateLoan(id: number, amount?: number, date?: Date, notes?: string) {
  const db = await getDb();
  if (!db) {
    const loan = memStore.loans.find(l => l.id === id);
    if (loan) {
      if (amount !== undefined) loan.amount = amount;
      if (date !== undefined) loan.date = date;
      if (notes !== undefined) loan.notes = notes || null;
      loan.updatedAt = new Date();
    }
    return loan;
  }
  
  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates.amount = amount;
  if (date !== undefined) updates.date = date;
  if (notes !== undefined) updates.notes = notes;
  
  return db.update(loans).set(updates).where(eq(loans.id, id));
}

export async function deleteLoan(id: number) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.loans.findIndex(l => l.id === id);
    if (idx !== -1) memStore.loans.splice(idx, 1);
    return;
  }
  
  return db.delete(loans).where(eq(loans.id, id));
}

// ============ Payment Queries ============
export async function createPayment(userId: number, personId: number, amount: number, dueDate: Date, emiId?: number, loanId?: number, status: "pending" | "paid" = "pending", paidDate?: Date, notes?: string) {
  const db = await getDb();
  if (!db) {
    const newPayment = {
      id: getNextId(),
      userId,
      personId,
      emiId: emiId || null,
      loanId: loanId || null,
      amount,
      dueDate,
      paidDate: paidDate || null,
      status,
      paidBy: "user",
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memStore.payments.push(newPayment);
    return [newPayment];
  }
  
  return db.insert(payments).values({
    userId,
    personId,
    amount,
    dueDate,
    emiId,
    loanId,
    status,
    paidDate,
    notes,
    paidBy: "user"
  });
}

export async function getPaymentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.payments.filter(p => p.userId === userId);
  }
  
  return db.select().from(payments).where(eq(payments.userId, userId));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.payments.find(p => p.id === id);
  }
  
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result[0];
}

export async function updatePaymentStatus(id: number, status: "pending" | "paid", paidDate?: Date, paidBy?: "user" | "borrower") {
  const db = await getDb();
  if (!db) {
    const payment = memStore.payments.find(p => p.id === id);
    if (payment) {
      payment.status = status;
      payment.paidDate = paidDate || null;
      if (paidBy !== undefined) payment.paidBy = paidBy;
      payment.updatedAt = new Date();
    }
    return payment;
  }
  
  const updates: Record<string, unknown> = { status };
  if (paidDate !== undefined) updates.paidDate = paidDate;
  if (paidBy !== undefined) updates.paidBy = paidBy;
  
  return db.update(payments).set(updates).where(eq(payments.id, id));
}

export async function updatePayment(id: number, amount?: number, dueDate?: Date, notes?: string) {
  const db = await getDb();
  if (!db) {
    const payment = memStore.payments.find(p => p.id === id);
    if (payment) {
      if (amount !== undefined) payment.amount = amount;
      if (dueDate !== undefined) payment.dueDate = dueDate;
      if (notes !== undefined) payment.notes = notes || null;
      payment.updatedAt = new Date();
    }
    return payment;
  }
  
  const updates: Record<string, unknown> = {};
  if (amount !== undefined) updates.amount = amount;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (notes !== undefined) updates.notes = notes;
  
  return db.update(payments).set(updates).where(eq(payments.id, id));
}

export async function deletePayment(id: number) {
  const db = await getDb();
  if (!db) {
    const idx = memStore.payments.findIndex(p => p.id === id);
    if (idx !== -1) memStore.payments.splice(idx, 1);
    return;
  }
  
  return db.delete(payments).where(eq(payments.id, id));
}

export async function getPaymentsByPersonAndMonth(userId: number, personId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return memStore.payments.filter(p => 
      p.userId === userId && 
      p.personId === personId && 
      new Date(p.dueDate) >= startDate && 
      new Date(p.dueDate) <= endDate
    );
  }
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return db.select().from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.personId, personId),
        gte(payments.dueDate, startDate),
        lte(payments.dueDate, endDate)
      )
    );
}

export async function getPaymentsByMonth(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return memStore.payments.filter(p => 
      p.userId === userId && 
      new Date(p.dueDate) >= startDate && 
      new Date(p.dueDate) <= endDate
    );
  }
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return db.select().from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        gte(payments.dueDate, startDate),
        lte(payments.dueDate, endDate)
      )
    );
}

// ============ Credit Card Queries ============
export async function createCreditCard(userId: number, name: string, cardLimit: number, interestRate: number, lateFee: number) {
  const db = await getDb();
  if (!db) {
    const newCard = { id: getNextId(), userId, name, cardLimit, interestRate, lateFee, createdAt: new Date(), updatedAt: new Date() };
    memStore.creditCards.push(newCard);
    return [newCard];
  }
  return db.insert(creditCards).values({ userId, name, cardLimit, interestRate, lateFee });
}

export async function getCreditCardsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCards.filter(c => c.userId === userId);
  }
  return db.select().from(creditCards).where(eq(creditCards.userId, userId));
}

export async function getCreditCardById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCards.find(c => c.id === id);
  }
  const result = await db.select().from(creditCards).where(eq(creditCards.id, id)).limit(1);
  return result[0];
}

export async function updateCreditCard(id: number, name: string, cardLimit: number, interestRate: number, lateFee: number) {
  const db = await getDb();
  if (!db) {
    const card = memStore.creditCards.find(c => c.id === id);
    if (card) {
      card.name = name;
      card.cardLimit = cardLimit;
      card.interestRate = interestRate;
      card.lateFee = lateFee;
      card.updatedAt = new Date();
    }
    return card;
  }
  return db.update(creditCards).set({ name, cardLimit, interestRate, lateFee }).where(eq(creditCards.id, id));
}

export async function deleteCreditCard(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.creditCards.findIndex(c => c.id === id);
    if (index !== -1) memStore.creditCards.splice(index, 1);
    memStore.creditCardDebts = memStore.creditCardDebts.filter(d => d.creditCardId !== id);
    return;
  }
  return db.delete(creditCards).where(eq(creditCards.id, id));
}

// ============ Credit Card Debt Queries ============
export async function createCreditCardDebt(
  userId: number,
  creditCardId: number,
  personId: number | null,
  amount: number,
  interestRate: number,
  lateFee: number,
  date: Date,
  notes?: string
) {
  const db = await getDb();
  let borrowerName = "Sunny";
  
  if (personId) {
    const person = await getPersonById(personId);
    if (person) {
      borrowerName = person.name;
    }
  }

  if (!db) {
    const debtId = getNextId();
    const newDebt = {
      id: debtId,
      userId,
      creditCardId,
      personId,
      borrowerName,
      amount: 0, // Will be updated by transaction
      interestRate,
      lateFee,
      date,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memStore.creditCardDebts.push(newDebt);
    
    // Create initial principal transaction
    await createCcDebtTransaction(userId, debtId, "principal", amount, date, notes);
    
    return [newDebt];
  }

  await db.insert(creditCardDebts).values({
    userId,
    creditCardId,
    personId,
    borrowerName,
    amount: 0, // Will be updated by transaction
    interestRate,
    lateFee,
    date,
    notes,
  });

  const allDebts = await db.select().from(creditCardDebts).where(eq(creditCardDebts.userId, userId));
  const newDebt = allDebts[allDebts.length - 1];
  if (newDebt) {
    await createCcDebtTransaction(userId, newDebt.id, "principal", amount, date, notes);
  }
}

export async function getCreditCardDebtsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCardDebts.filter(d => d.userId === userId);
  }
  return db.select().from(creditCardDebts).where(eq(creditCardDebts.userId, userId));
}

export async function getCreditCardDebtById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.creditCardDebts.find(d => d.id === id);
  }
  const result = await db.select().from(creditCardDebts).where(eq(creditCardDebts.id, id)).limit(1);
  return result[0];
}

export async function updateCreditCardDebt(id: number, amount: number, date: Date, notes?: string) {
  const db = await getDb();
  if (!db) {
    const debt = memStore.creditCardDebts.find(d => d.id === id);
    if (debt) {
      debt.date = date;
      debt.notes = notes || null;
      debt.updatedAt = new Date();
      
      const pTx = memStore.ccDebtTransactions.find(t => t.creditCardDebtId === id && t.type === "principal");
      if (pTx) {
        pTx.amount = amount;
        pTx.date = date;
      }
      
      const allTx = memStore.ccDebtTransactions.filter(t => t.creditCardDebtId === id);
      let total = 0;
      for (const t of allTx) {
        if (t.type === "payment") total -= t.amount;
        else total += t.amount;
      }
      debt.amount = total;
    }
    return debt;
  }
  
  await db.update(creditCardDebts).set({ date, notes }).where(eq(creditCardDebts.id, id));
  
  const pTxs = await db.select().from(ccDebtTransactions).where(
    and(
      eq(ccDebtTransactions.creditCardDebtId, id),
      eq(ccDebtTransactions.type, "principal")
    )
  );
  if (pTxs[0]) {
    await db.update(ccDebtTransactions).set({ amount, date }).where(eq(ccDebtTransactions.id, pTxs[0].id));
  }
  
  const allTx = await db.select().from(ccDebtTransactions).where(eq(ccDebtTransactions.creditCardDebtId, id));
  let total = 0;
  for (const t of allTx) {
    if (t.type === "payment") total -= t.amount;
    else total += t.amount;
  }
  await db.update(creditCardDebts).set({ amount: total }).where(eq(creditCardDebts.id, id));
}

export async function deleteCreditCardDebt(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.creditCardDebts.findIndex(d => d.id === id);
    if (index !== -1) memStore.creditCardDebts.splice(index, 1);
    memStore.ccDebtTransactions = memStore.ccDebtTransactions.filter(t => t.creditCardDebtId !== id);
    return;
  }
  await db.delete(ccDebtTransactions).where(eq(ccDebtTransactions.creditCardDebtId, id));
  return db.delete(creditCardDebts).where(eq(creditCardDebts.id, id));
}

// ============ Credit Card Debt Ledger Queries ============
export async function getCcDebtTransactions(userId: number, debtId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.ccDebtTransactions.filter(t => t.userId === userId && t.creditCardDebtId === debtId);
  }
  return db.select().from(ccDebtTransactions).where(
    and(
      eq(ccDebtTransactions.userId, userId),
      eq(ccDebtTransactions.creditCardDebtId, debtId)
    )
  );
}

export async function createCcDebtTransaction(
  userId: number,
  creditCardDebtId: number,
  type: "principal" | "interest" | "fee" | "payment",
  amount: number,
  date: Date,
  notes?: string
) {
  const db = await getDb();
  if (!db) {
    const newTx = {
      id: getNextId(),
      userId,
      creditCardDebtId,
      type,
      amount,
      date,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memStore.ccDebtTransactions.push(newTx);
    
    // Update parent debt amount
    const debt = memStore.creditCardDebts.find(d => d.id === creditCardDebtId);
    if (debt) {
      const allTx = memStore.ccDebtTransactions.filter(t => t.creditCardDebtId === creditCardDebtId);
      let total = 0;
      for (const t of allTx) {
        if (t.type === "payment") total -= t.amount;
        else total += t.amount;
      }
      debt.amount = total;
    }
    return [newTx];
  }
  
  await db.insert(ccDebtTransactions).values({
    userId,
    creditCardDebtId,
    type,
    amount,
    date,
    notes,
  });

  // Update parent debt amount
  const allTx = await db.select().from(ccDebtTransactions).where(eq(ccDebtTransactions.creditCardDebtId, creditCardDebtId));
  let total = 0;
  for (const t of allTx) {
    if (t.type === "payment") total -= t.amount;
    else total += t.amount;
  }
  await db.update(creditCardDebts).set({ amount: total }).where(eq(creditCardDebts.id, creditCardDebtId));
}

// ============ Chitti Queries ============
export async function createChitti(userId: number, name: string, totalAmount: number, members: number, monthlyContribution: number, friendName: string, startDate: Date, status: "active" | "completed" = "active") {
  const db = await getDb();
  if (!db) {
    const newChitti = { id: getNextId(), userId, name, totalAmount, members, monthlyContribution, friendName, startDate, status, createdAt: new Date(), updatedAt: new Date() };
    memStore.chittis.push(newChitti);
    return [newChitti];
  }
  return db.insert(chittis).values({ userId, name, totalAmount, members, monthlyContribution, friendName, startDate, status });
}

export async function getChittisByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.chittis.filter(c => c.userId === userId);
  }
  return db.select().from(chittis).where(eq(chittis.userId, userId));
}

export async function getChittiById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.chittis.find(c => c.id === id);
  }
  const result = await db.select().from(chittis).where(eq(chittis.id, id)).limit(1);
  return result[0];
}

export async function updateChitti(id: number, name: string, totalAmount: number, members: number, monthlyContribution: number, friendName: string, startDate: Date, status: "active" | "completed") {
  const db = await getDb();
  if (!db) {
    const chitti = memStore.chittis.find(c => c.id === id);
    if (chitti) {
      chitti.name = name;
      chitti.totalAmount = totalAmount;
      chitti.members = members;
      chitti.monthlyContribution = monthlyContribution;
      chitti.friendName = friendName;
      chitti.startDate = startDate;
      chitti.status = status;
      chitti.updatedAt = new Date();
    }
    return chitti;
  }
  return db.update(chittis).set({ name, totalAmount, members, monthlyContribution, friendName, startDate, status }).where(eq(chittis.id, id));
}

export async function deleteChitti(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.chittis.findIndex(c => c.id === id);
    if (index !== -1) memStore.chittis.splice(index, 1);
    memStore.chittiContributions = memStore.chittiContributions.filter(c => c.chittiId !== id);
    return;
  }
  return db.delete(chittis).where(eq(chittis.id, id));
}

// ============ Chitti Contribution Queries ============
export async function createChittiContribution(userId: number, chittiId: number, amount: number, date: Date, type: "contribution" | "payout", notes?: string) {
  const db = await getDb();
  if (!db) {
    const newContrib = { id: getNextId(), userId, chittiId, amount, date, type, notes: notes || null, createdAt: new Date(), updatedAt: new Date() };
    memStore.chittiContributions.push(newContrib);
    return [newContrib];
  }
  return db.insert(chittiContributions).values({ userId, chittiId, amount, date, type, notes });
}

export async function getChittiContributionsByChittiId(chittiId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.filter(c => c.chittiId === chittiId);
  }
  return db.select().from(chittiContributions).where(eq(chittiContributions.chittiId, chittiId));
}

export async function getChittiContributionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.filter(c => c.userId === userId);
  }
  return db.select().from(chittiContributions).where(eq(chittiContributions.userId, userId));
}

export async function getChittiContributionById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.chittiContributions.find(c => c.id === id);
  }
  const result = await db.select().from(chittiContributions).where(eq(chittiContributions.id, id)).limit(1);
  return result[0];
}

export async function deleteChittiContribution(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.chittiContributions.findIndex(c => c.id === id);
    if (index !== -1) memStore.chittiContributions.splice(index, 1);
    return;
  }
  return db.delete(chittiContributions).where(eq(chittiContributions.id, id));
}

// ============ General Expense Queries ============
export async function createGeneralExpense(userId: number, amount: number, date: Date, category: string, description?: string, personId?: number | null, isProxy?: number) {
  const db = await getDb();
  const actualPersonId = personId ?? null;
  const actualIsProxy = isProxy ?? 0;
  if (!db) {
    const newExp = { id: getNextId(), userId, amount, date, category, description: description || null, personId: actualPersonId, isProxy: actualIsProxy, createdAt: new Date(), updatedAt: new Date() };
    memStore.generalExpenses.push(newExp);
    return [newExp];
  }
  return db.insert(generalExpenses).values({ userId, amount, date, category, description, personId: actualPersonId, isProxy: actualIsProxy });
}

export async function getGeneralExpensesByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.generalExpenses.filter(e => e.userId === userId);
  }
  return db.select().from(generalExpenses).where(eq(generalExpenses.userId, userId));
}

export async function getGeneralExpenseById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.generalExpenses.find(e => e.id === id);
  }
  const result = await db.select().from(generalExpenses).where(eq(generalExpenses.id, id)).limit(1);
  return result[0];
}

export async function updateGeneralExpense(id: number, amount: number, date: Date, category: string, description?: string, personId?: number | null, isProxy?: number) {
  const db = await getDb();
  const actualPersonId = personId ?? null;
  const actualIsProxy = isProxy ?? 0;
  if (!db) {
    const exp = memStore.generalExpenses.find(e => e.id === id);
    if (exp) {
      exp.amount = amount;
      exp.date = date;
      exp.category = category;
      exp.description = description || null;
      exp.personId = actualPersonId;
      exp.isProxy = actualIsProxy;
      exp.updatedAt = new Date();
    }
    return exp;
  }
  return db.update(generalExpenses).set({ amount, date, category, description, personId: actualPersonId, isProxy: actualIsProxy }).where(eq(generalExpenses.id, id));
}

export async function deleteGeneralExpense(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.generalExpenses.findIndex(e => e.id === id);
    if (index !== -1) memStore.generalExpenses.splice(index, 1);
    return;
  }
  return db.delete(generalExpenses).where(eq(generalExpenses.id, id));
}

export async function getGeneralExpenseCategoryBreakdown(userId: number) {
  const db = await getDb();
  if (!db) {
    const userExps = memStore.generalExpenses.filter(e => e.userId === userId);
    const breakdown: Record<string, number> = {};
    for (const exp of userExps) {
      breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
    }
    return Object.entries(breakdown).map(([category, amount]) => ({ category, amount }));
  }
  const all = await db.select().from(generalExpenses).where(eq(generalExpenses.userId, userId));
  const breakdown: Record<string, number> = {};
  for (const exp of all) {
    breakdown[exp.category] = (breakdown[exp.category] || 0) + exp.amount;
  }
  return Object.entries(breakdown).map(([category, amount]) => ({ category, amount }));
}

// ============ Gold Loan Queries ============
export async function createGoldLoanInterest(userId: number, amount: number, date: Date, paidForPersonId: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    const newGold = { id: getNextId(), userId, amount, date, paidForPersonId, notes: notes || null, createdAt: new Date(), updatedAt: new Date() };
    memStore.goldLoanInterest.push(newGold);
    return [newGold];
  }
  return db.insert(goldLoanInterest).values({ userId, amount, date, paidForPersonId, notes });
}

export async function getGoldLoanInterestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    return memStore.goldLoanInterest.filter(g => g.userId === userId);
  }
  return db.select().from(goldLoanInterest).where(eq(goldLoanInterest.userId, userId));
}

export async function getGoldLoanInterestById(id: number) {
  const db = await getDb();
  if (!db) {
    return memStore.goldLoanInterest.find(g => g.id === id);
  }
  const result = await db.select().from(goldLoanInterest).where(eq(goldLoanInterest.id, id)).limit(1);
  return result[0];
}

export async function updateGoldLoanInterest(id: number, amount: number, date: Date, paidForPersonId: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    const gold = memStore.goldLoanInterest.find(g => g.id === id);
    if (gold) {
      gold.amount = amount;
      gold.date = date;
      gold.paidForPersonId = paidForPersonId;
      gold.notes = notes || null;
      gold.updatedAt = new Date();
    }
    return gold;
  }
  return db.update(goldLoanInterest).set({ amount, date, paidForPersonId, notes }).where(eq(goldLoanInterest.id, id));
}

export async function deleteGoldLoanInterest(id: number) {
  const db = await getDb();
  if (!db) {
    const index = memStore.goldLoanInterest.findIndex(g => g.id === id);
    if (index !== -1) memStore.goldLoanInterest.splice(index, 1);
    return;
  }
  return db.delete(goldLoanInterest).where(eq(goldLoanInterest.id, id));
}

// ============ Balance Calculation Queries ============
export async function getPersonBalance(userId: number, personId: number) {
  const db = await getDb();
  
  if (!db) {
    const allPayments = memStore.payments.filter(p => p.userId === userId && p.personId === personId);
    const allLoans = memStore.loans.filter(l => l.userId === userId && l.personId === personId);
    const allGold = memStore.goldLoanInterest.filter(g => g.userId === userId && g.paidForPersonId === personId);
    const allProxyExpenses = memStore.generalExpenses.filter(e => e.userId === userId && e.personId === personId && e.isProxy === 1);
    const allCcDebts = memStore.creditCardDebts.filter(d => d.userId === userId && d.personId === personId);

    let totalOwedToMe = 0;
    let totalOwedByMe = 0;

    for (const payment of allPayments) {
      if (payment.status === "paid") {
        if (payment.paidBy === "user") {
          // If User paid Sunny's EMI, Sunny owes it to User
          totalOwedToMe += payment.amount;
        } else {
          // If Sunny paid it himself, no balance shift (it is paid off)
        }
      } else {
        // Pending EMIs: if borrower is supposed to pay, it doesn't count as debt yet until paid by user
      }
    }

    for (const loan of allLoans) {
      if (loan.type === "given") {
        totalOwedToMe += loan.amount;
      } else if (loan.type === "received") {
        totalOwedByMe += loan.amount;
      }
    }

    // Gold Loan interest: user paid interest on behalf of family member, so they owe it to user
    for (const gold of allGold) {
      totalOwedToMe += gold.amount;
    }

    // Proxy expenses paid by user
    for (const exp of allProxyExpenses) {
      totalOwedToMe += exp.amount;
    }

    // Credit Card Debt outstanding
    for (const debt of allCcDebts) {
      totalOwedToMe += debt.amount;
    }

    const netBalance = totalOwedToMe - totalOwedByMe;

    return {
      personId,
      totalOwedToMe,
      totalOwedByMe,
      netBalance,
    };
  }

  // Get all payments for this person
  const allPayments = await db.select().from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.personId, personId)));

  // Get all loans for this person
  const allLoans = await db.select().from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.personId, personId)));
    
  // Get all gold loan interest payments for this person
  const allGold = await db.select().from(goldLoanInterest)
    .where(and(eq(goldLoanInterest.userId, userId), eq(goldLoanInterest.paidForPersonId, personId)));

  // Get all proxy general expenses paid for this person
  const allProxyExpenses = await db.select().from(generalExpenses)
    .where(and(
      eq(generalExpenses.userId, userId),
      eq(generalExpenses.personId, personId),
      eq(generalExpenses.isProxy, 1)
    ));

  // Get all Credit Card Debts for this person
  const allCcDebts = await db.select().from(creditCardDebts)
    .where(and(
      eq(creditCardDebts.userId, userId),
      eq(creditCardDebts.personId, personId)
    ));

  let totalOwedToMe = 0;
  let totalOwedByMe = 0;

  // Calculate from payments (EMI payments)
  for (const payment of allPayments) {
    if (payment.status === "paid") {
      // If payment was paid by user on behalf of borrower, borrower owes us.
      // If paid by borrower directly, it's settled.
      if (payment.paidBy === "user") {
        totalOwedToMe += payment.amount;
      }
    }
  }

  // Calculate from loans
  for (const loan of allLoans) {
    if (loan.type === "given") {
      totalOwedToMe += loan.amount;
    } else if (loan.type === "received") {
      totalOwedByMe += loan.amount;
    }
  }

  // Add Gold Loan interest paid on behalf of person
  for (const gold of allGold) {
    totalOwedToMe += gold.amount;
  }

  // Add Proxy General Expenses paid on behalf of person
  for (const exp of allProxyExpenses) {
    totalOwedToMe += exp.amount;
  }

  // Add CC debts outstanding
  for (const debt of allCcDebts) {
    totalOwedToMe += debt.amount;
  }

  const netBalance = totalOwedToMe - totalOwedByMe;

  return {
    personId,
    totalOwedToMe,
    totalOwedByMe,
    netBalance,
  };
}

// ============ Proportional CC Statement Calculation ============
export async function applyCcStatementCharges(
  userId: number,
  creditCardId: number,
  totalStatementBalance: number,
  interestCharged: number,
  feesCharged: number,
  date: Date
) {
  const db = await getDb();
  if (totalStatementBalance <= 0) return;

  if (!db) {
    // memStore branch
    const cardDebts = memStore.creditCardDebts.filter(
      d => d.userId === userId && d.creditCardId === creditCardId && d.amount > 0
    );
    for (const debt of cardDebts) {
      const ratio = debt.amount / totalStatementBalance;
      const propInterest = Math.round(interestCharged * ratio);
      const propFees = Math.round(feesCharged * ratio);

      if (propInterest > 0) {
        await createCcDebtTransaction(userId, debt.id, "interest", propInterest, date, "Proportional statement interest");
      }
      if (propFees > 0) {
        await createCcDebtTransaction(userId, debt.id, "fee", propFees, date, "Proportional statement fees");
      }
    }
    return;
  }

  // DB branch
  const cardDebts = await db.select().from(creditCardDebts).where(
    and(
      eq(creditCardDebts.userId, userId),
      eq(creditCardDebts.creditCardId, creditCardId),
      gte(creditCardDebts.amount, 1) // outstanding balance > 0
    )
  );

  for (const debt of cardDebts) {
    const ratio = debt.amount / totalStatementBalance;
    const propInterest = Math.round(interestCharged * ratio);
    const propFees = Math.round(feesCharged * ratio);

    if (propInterest > 0) {
      await createCcDebtTransaction(userId, debt.id, "interest", propInterest, date, "Proportional statement interest");
    }
    if (propFees > 0) {
      await createCcDebtTransaction(userId, debt.id, "fee", propFees, date, "Proportional statement fees");
    }
  }
}

// ============ Person Audit History / Timeline ============
export async function getPersonHistory(userId: number, personId: number) {
  const db = await getDb();
  
  let pPayments: any[] = [];
  let pLoans: any[] = [];
  let pGold: any[] = [];
  let pProxyExpenses: any[] = [];
  let pCcTransactions: any[] = [];

  if (!db) {
    pPayments = memStore.payments.filter(p => p.userId === userId && p.personId === personId && p.status === "paid");
    pLoans = memStore.loans.filter(l => l.userId === userId && l.personId === personId);
    pGold = memStore.goldLoanInterest.filter(g => g.userId === userId && g.paidForPersonId === personId);
    pProxyExpenses = memStore.generalExpenses.filter(e => e.userId === userId && e.personId === personId && e.isProxy === 1);
    
    // Find CC Debt allocations for this person
    const debts = memStore.creditCardDebts.filter(d => d.userId === userId && d.personId === personId);
    for (const debt of debts) {
      const txs = memStore.ccDebtTransactions.filter(t => t.creditCardDebtId === debt.id);
      const card = memStore.creditCards.find(c => c.id === debt.creditCardId);
      for (const tx of txs) {
        pCcTransactions.push({
          ...tx,
          cardName: card?.name || "Credit Card",
          debtNotes: debt.notes
        });
      }
    }
  } else {
    pPayments = await db.select().from(payments).where(
      and(
        eq(payments.userId, userId),
        eq(payments.personId, personId),
        eq(payments.status, "paid")
      )
    );
    pLoans = await db.select().from(loans).where(
      and(
        eq(loans.userId, userId),
        eq(loans.personId, personId)
      )
    );
    pGold = await db.select().from(goldLoanInterest).where(
      and(
        eq(goldLoanInterest.userId, userId),
        eq(goldLoanInterest.paidForPersonId, personId)
      )
    );
    pProxyExpenses = await db.select().from(generalExpenses).where(
      and(
        eq(generalExpenses.userId, userId),
        eq(generalExpenses.personId, personId),
        eq(generalExpenses.isProxy, 1)
      )
    );

    // CC debts
    const debts = await db.select().from(creditCardDebts).where(
      and(
        eq(creditCardDebts.userId, userId),
        eq(creditCardDebts.personId, personId)
      )
    );
    for (const debt of debts) {
      const txs = await db.select().from(ccDebtTransactions).where(eq(ccDebtTransactions.creditCardDebtId, debt.id));
      const cardResult = await db.select().from(creditCards).where(eq(creditCards.id, debt.creditCardId)).limit(1);
      const card = cardResult[0];
      for (const tx of txs) {
        pCcTransactions.push({
          ...tx,
          cardName: card?.name || "Credit Card",
          debtNotes: debt.notes
        });
      }
    }
  }

  // Format all entries into a unified timeline
  const timeline: any[] = [];

  // 1. EMI Payments
  for (const p of pPayments) {
    timeline.push({
      id: `payment-${p.id}`,
      type: p.paidBy === "user" ? "proxy_payment" : "repayment",
      amount: p.amount,
      date: p.paidDate || p.dueDate,
      description: p.paidBy === "user" ? `Paid EMI on behalf of borrower` : `Borrower repaid EMI`,
      notes: p.notes,
      reference: `EMI Payment`
    });
  }

  // 2. Loans
  for (const l of pLoans) {
    timeline.push({
      id: `loan-${l.id}`,
      type: l.type === "given" ? "loan_given" : "loan_received",
      amount: l.amount,
      date: l.date,
      description: l.type === "given" ? `Lent money` : `Borrowed money`,
      notes: l.notes,
      reference: `Informal Loan`
    });
  }

  // 3. Gold Loan Interest
  for (const g of pGold) {
    timeline.push({
      id: `gold-${g.id}`,
      type: "proxy_payment",
      amount: g.amount,
      date: g.date,
      description: `Paid Gold Loan Interest on behalf of borrower`,
      notes: g.notes,
      reference: `Gold Loan Interest`
    });
  }

  // 4. General Expenses (Proxy)
  for (const e of pProxyExpenses) {
    timeline.push({
      id: `expense-${e.id}`,
      type: "proxy_payment",
      amount: e.amount,
      date: e.date,
      description: `Proxy expense: ${e.category}`,
      notes: e.description,
      reference: `General Expense`
    });
  }

  // 5. Credit Card Transactions
  for (const t of pCcTransactions) {
    let type = "cc_principal";
    let desc = "Credit Card Charge";
    if (t.type === "interest") {
      type = "cc_interest";
      desc = `Interest accrued on CC: ${t.cardName}`;
    } else if (t.type === "fee") {
      type = "cc_fee";
      desc = `Fee accrued on CC: ${t.cardName}`;
    } else if (t.type === "payment") {
      type = "repayment";
      desc = `Payment towards CC: ${t.cardName}`;
    } else {
      desc = `Credit Card initial charge: ${t.cardName}`;
    }

    timeline.push({
      id: `cc-tx-${t.id}`,
      type,
      amount: t.amount,
      date: t.date,
      description: desc,
      notes: t.notes || t.debtNotes,
      reference: t.cardName
    });
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return timeline;
}

export async function getAllPersonBalances(userId: number) {
  const db = await getDb();
  if (!db) {
    const userPersons = memStore.persons.filter(p => p.userId === userId);
    const balances = [];
    for (const person of userPersons) {
      const balance = await getPersonBalance(userId, person.id);
      balances.push({
        person,
        ...balance,
      });
    }
    return balances;
  }

  const userPersons = await db.select().from(persons).where(eq(persons.userId, userId));
  const balances = [];

  for (const person of userPersons) {
    const balance = await getPersonBalance(userId, person.id);
    balances.push({
      person,
      ...balance,
    });
  }

  return balances;
}

export async function getDashboardSummary(userId: number) {
  const db = await getDb();
  if (!db) {
    const allPayments = memStore.payments.filter(p => p.userId === userId);
    const allDebts = memStore.creditCardDebts.filter(d => d.userId === userId);
    const allLoans = memStore.loans.filter(l => l.userId === userId);
    const allGold = memStore.goldLoanInterest.filter(g => g.userId === userId);
    const allExpenses = memStore.generalExpenses.filter(e => e.userId === userId);

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
    
    // Net loans balance
    let totalLoansGiven = allLoans.filter(l => l.type === "given").reduce((sum, l) => sum + l.amount, 0);
    let totalLoansReceived = allLoans.filter(l => l.type === "received").reduce((sum, l) => sum + l.amount, 0);
    
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
  
  let totalLoansGiven = allLoans.filter(l => l.type === "given").reduce((sum, l) => sum + l.amount, 0);
  let totalLoansReceived = allLoans.filter(l => l.type === "received").reduce((sum, l) => sum + l.amount, 0);
  
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

export async function getMonthlyBreakdown(userId: number, year: number) {
  const db = await getDb();
  if (!db) {
    const monthlyData: Record<number, { paid: number; pending: number }> = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = { paid: 0, pending: 0 };
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const yearPayments = memStore.payments.filter(p => 
      p.userId === userId && 
      new Date(p.dueDate) >= startDate && 
      new Date(p.dueDate) <= endDate
    );

    for (const payment of yearPayments) {
      const month = new Date(payment.dueDate).getMonth() + 1;
      if (payment.status === "paid") {
        monthlyData[month]!.paid += payment.amount;
      } else if (payment.status === "pending") {
        monthlyData[month]!.pending += payment.amount;
      }
    }
    return monthlyData;
  }

  const monthlyData: Record<number, { paid: number; pending: number }> = {};

  // Initialize all 12 months
  for (let month = 1; month <= 12; month++) {
    monthlyData[month] = { paid: 0, pending: 0 };
  }

  // Get all payments for the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const yearPayments = await db.select().from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        gte(payments.dueDate, startDate),
        lte(payments.dueDate, endDate)
      )
    );

  for (const payment of yearPayments) {
    const month = payment.dueDate.getMonth() + 1;
    if (payment.status === "paid") {
      monthlyData[month]!.paid += payment.amount;
    } else if (payment.status === "pending") {
      monthlyData[month]!.pending += payment.amount;
    }
  }

  return monthlyData;
}

// ============ EMI Payment Generation ============
export async function generateEMIPayments(userId: number, emiId: number, emi: typeof emis.$inferSelect) {
  const db = await getDb();
  if (!db) {
    const startDate = new Date(emi.startDate);
    const endDate = emi.endDate ? new Date(emi.endDate) : new Date();

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

    const existingPayments = memStore.payments.filter(p => p.emiId === emiId);
    const existingDates = new Set(
      existingPayments.map((p) => new Date(p.dueDate).toISOString().split("T")[0])
    );

    for (const dueDate of monthsToGenerate) {
      const dateStr = dueDate.toISOString().split("T")[0];
      if (!existingDates.has(dateStr)) {
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
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    return;
  }

  const startDate = new Date(emi.startDate);
  const endDate = emi.endDate ? new Date(emi.endDate) : new Date();

  // Generate all months from start to end
  const monthsToGenerate = [];
  let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (currentDate <= endDate) {
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), startDate.getDate());
    
    // Handle months with fewer days (e.g., Feb 30 -> Feb 28/29)
    if (dueDate.getMonth() !== currentDate.getMonth()) {
      dueDate.setDate(0); // Last day of previous month
    }

    monthsToGenerate.push(dueDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Get existing payments for this EMI to avoid duplicates
  const existingPayments = await db.select().from(payments).where(eq(payments.emiId, emiId));
  const existingDates = new Set(
    existingPayments.map((p) => p.dueDate.toISOString().split("T")[0])
  );

  // Create new payment records for months that don't have one yet
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
