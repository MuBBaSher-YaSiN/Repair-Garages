// src/models/Job.ts
import mongoose, { Schema, models } from "mongoose";

const ServiceItemSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: false },
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  allowCustomPrice: { type: Boolean, default: true },
  notes: { type: String },
});

const InvoiceSchema = new Schema({
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  generatedAt: { type: Date },
});

const JobSchema = new Schema(
  {
    carNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    engineNumber: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "rejected", "accepted", "delivered"],
      default: "pending",
    },
    services: [ServiceItemSchema],
    invoice: InvoiceSchema,
    totalOverride: { type: Number, default: null },
    rejectionNote: String,
  },
  { timestamps: true }
);

export const Job = models.Job || mongoose.model("Job", JobSchema);
