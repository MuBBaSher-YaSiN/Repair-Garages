// src/lib/validations/jobSchema.ts
import { z } from "zod";

export const subIssueSchema = z.object({
  key: z.string(),
  label: z.string(),
  severity: z.enum(["minor", "major", "ok"]),
  comment: z.string().optional(),
  // images: z.array(z.string()).optional(),
});

export const inspectionTabSchema = z.object({
  key: z.string(),
  label: z.string(),
  subIssues: z.array(subIssueSchema),
});

export const serviceItemSchema = z.object({
  serviceId: z.string().optional(), // optional in case custom service (no catalog id)
  name: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  allowCustomPrice: z.boolean().optional(),
  notes: z.string().optional(),
});

export const invoiceSchema = z.object({
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  paid: z.boolean().optional(),
});

export const jobSchema = z.object({
  carNumber: z.string().min(1, "Car number is required"),
  customerName: z.string().min(1, "Customer name is required"),
  engineNumber: z.string().optional(),
  inspectionTabs: z.array(inspectionTabSchema).optional(),
  services: z.array(serviceItemSchema).optional(),
  invoice: invoiceSchema.optional(),
  status: z.enum(["pending", "in_progress", "completed", "rejected", "accepted", "delivered"]).optional(),
});
