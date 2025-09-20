// src/lib/validations/jobSchema.ts
import { z } from "zod";

export const subIssueSchema = z.object({
  key: z.string(),
  label: z.string(),
  severity: z.enum(["minor", "major", "ok"]),
  comment: z.string().optional(),
});

export const inspectionTabSchema = z.object({
  key: z.string(),
  label: z.string(),
  subIssues: z.array(subIssueSchema),
});

export const serviceItemSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string(),
  quantity: z.number().min(1).optional().default(1),
  unitPrice: z.number().min(0).optional().default(0),
  totalPrice: z.number().min(0).optional().default(0),
  allowCustomPrice: z.boolean().optional().default(true),
  notes: z.string().optional(),
});

export const invoiceSchema = z.object({
  subtotal: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
  total: z.number().min(0).optional().default(0),
  paid: z.boolean().optional().default(false),
  generatedAt: z.string().optional(),
});

export const jobSchema = z.object({
  carNumber: z.string().min(1, "Car number is required"),
  customerName: z.string().min(1, "Customer name is required"),
  engineNumber: z.string().optional(),
  inspectionTabs: z.array(inspectionTabSchema).optional().default([]),
  // New: services + invoice
  services: z.array(serviceItemSchema).optional().default([]),
  invoice: invoiceSchema.optional(),
  // Updated status enum to include the new intermediate state and more statuses
  status: z.enum([
    "pending",
    "assignment_requested",
    "in_progress",
    "completed",
    "rejected",
    "accepted",
    "delivered",
  ]).optional(),
});
