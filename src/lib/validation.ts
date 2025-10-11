import { z } from 'zod';

/**
 * Centralized validation schemas for all user inputs
 * Implements comprehensive input validation to prevent injection attacks and data corruption
 */

// Transaction amount validation - prevents negative/extreme values
const amountSchema = z.number()
  .positive({ message: "Amount must be positive" })
  .max(10000000, { message: "Amount must be less than $10,000,000" })
  .finite({ message: "Amount must be a valid number" });

// Date validation
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" })
  .refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d <= new Date();
  }, { message: "Date cannot be in the future" });

// Text field validation - prevents XSS and buffer overflow
const descriptionSchema = z.string()
  .trim()
  .min(1, { message: "Description is required" })
  .max(200, { message: "Description must be less than 200 characters" })
  .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, { message: "Description contains invalid characters" });

// Category validation
const categorySchema = z.string()
  .trim()
  .min(1, { message: "Category is required" })
  .max(50, { message: "Category must be less than 50 characters" })
  .regex(/^[a-z0-9\-_]+$/, { message: "Category must be lowercase alphanumeric with hyphens/underscores only" });

// Custom category name (display name)
const customCategoryNameSchema = z.string()
  .trim()
  .min(1, { message: "Category name is required" })
  .max(50, { message: "Category name must be less than 50 characters" })
  .regex(/^[a-zA-Z0-9\s\-_]+$/, { message: "Category name contains invalid characters" });

/**
 * Expense validation schema
 */
export const expenseSchema = z.object({
  amount: amountSchema,
  description: descriptionSchema,
  category: categorySchema,
  date: dateSchema,
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

/**
 * Income validation schema
 */
export const incomeSchema = z.object({
  amount: amountSchema,
  description: descriptionSchema,
  category: categorySchema,
  date: dateSchema,
});

export type IncomeInput = z.infer<typeof incomeSchema>;

/**
 * Budget allocation validation schema
 */
export const budgetSchema = z.object({
  category: categorySchema,
  allocated: z.number()
    .nonnegative({ message: "Budget cannot be negative" })
    .max(10000000, { message: "Budget must be less than $10,000,000" })
    .finite({ message: "Budget must be a valid number" }),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

/**
 * Profile name validation schema
 */
export const profileNameSchema = z.string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(50, { message: "Name must be less than 50 characters" })
  .regex(/^[a-zA-Z\s'\-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" })
  .toLowerCase();

/**
 * Password validation schema
 */
export const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be less than 72 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

/**
 * Custom category validation schema
 */
export const customCategorySchema = z.object({
  name: categorySchema,
  label: customCategoryNameSchema,
  type: z.enum(['income', 'expense'], { message: "Type must be 'income' or 'expense'" }),
});

export type CustomCategoryInput = z.infer<typeof customCategorySchema>;

/**
 * OCR data validation schema - sanitizes extracted receipt data
 */
export const ocrDataSchema = z.object({
  text: z.string()
    .max(5000, { message: "OCR text too long" })
    .optional(),
  vendor: z.string()
    .trim()
    .max(100, { message: "Vendor name too long" })
    .regex(/^[a-zA-Z0-9\s\-_.,&]+$/, { message: "Vendor name contains invalid characters" })
    .optional()
    .nullable(),
  amount: z.number()
    .positive()
    .max(10000000)
    .optional()
    .nullable(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export type OCRDataInput = z.infer<typeof ocrDataSchema>;

/**
 * Receipt upload validation
 */
export const receiptUploadSchema = z.object({
  transactionId: z.string().uuid({ message: "Invalid transaction ID" }),
  filePath: z.string()
    .min(1, { message: "File path is required" })
    .max(500, { message: "File path too long" })
    .regex(/^[a-zA-Z0-9\-_\/\.]+$/, { message: "Invalid file path format" }),
  ocrData: ocrDataSchema.optional(),
});

export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>;
