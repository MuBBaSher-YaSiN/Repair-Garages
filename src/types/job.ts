// src/types/job.ts
export interface ServiceItem {
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allowCustomPrice?: boolean;
  notes?: string;
}

export interface Invoice {
  subtotal: number;
  tax?: number;
  total: number;
  paid?: boolean;
  generatedAt?: string;
}

export interface Job {
  _id: string;
  carNumber: string;
  customerName: string;
  engineNumber?: string;
  status: "pending" | "in_progress" | "completed" | "rejected" | "accepted" | "delivered";
  assignedTo?: {
    _id: string;
    email: string;
  } | null;
  rejectionNote?: string;
  services?: ServiceItem[];
  invoice?: Invoice;
  totalOverride?: number; // admin manual override for grand total
  createdAt?: string;
  updatedAt?: string;
}
