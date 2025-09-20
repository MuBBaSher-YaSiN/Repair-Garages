// src/types/job.ts
export type Severity = "minor" | "major" | "ok";

export interface SubIssue {
  key: string;
  label: string;
  severity: Severity;
  comment?: string;
}

export interface InspectionTab {
  key: string;
  label: string;
  subIssues: SubIssue[];
}

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
  status: "pending" | "assignment_requested" | "in_progress" | "completed" | "rejected" | "accepted" | "delivered";
  assignedTo?: {
    _id: string;
    email: string;
  } | null;
  claimRequestedBy?: { _id: string; email?: string } | null;
  rejectionNote?: string;
  inspectionTabs?: InspectionTab[];
  services?: ServiceItem[];
  invoice?: Invoice;
  createdAt?: string;
  updatedAt?: string;
}
