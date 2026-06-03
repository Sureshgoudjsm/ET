import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount in paise to Indian Rupees currency string
 * @param amountInPaise Amount in paise (₹1 = 100 paise)
 * @returns Formatted currency string (e.g., "₹20,000")
 */
export function formatCurrency(amountInPaise: number): string {
  const amountInRupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInRupees);
}

/**
 * Format date to readable format
 * @param date Date object
 * @returns Formatted date string (e.g., "01 Nov 2024")
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format date to month-year format
 * @param date Date object
 * @returns Formatted month-year string (e.g., "Nov 2024")
 */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
