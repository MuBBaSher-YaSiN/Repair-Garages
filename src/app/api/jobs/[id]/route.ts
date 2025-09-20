// src/app/api/jobs/[id]/route.ts
import { connectToDB } from "@/lib/db";
import { Job } from "@/models/Job";
import { Service } from "@/models/Service";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { User } from "@/models/User";

// GET /api/jobs/:id
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDB();
    const job = await Job.findById(params.id).populate("assignedTo", "email").lean();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    console.error("GET job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/jobs/:id
// inside src/app/api/jobs/[id]/route.ts -> PATCH function
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDB();
    const body = await req.json();
    const job = await Job.findById(params.id).exec();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const role = session.user.role;

    // --- totalOverride: only admin allowed ---
    if ("totalOverride" in body) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Only admin can override total" }, { status: 403 });
      }
      job.totalOverride = body.totalOverride === null ? null : Number(body.totalOverride);
      job.invoice = job.invoice || {};
      job.invoice.total = job.totalOverride !== null && job.totalOverride !== undefined ? Number(job.totalOverride) : job.invoice.subtotal ?? 0;
    }

    // --- assigning a job to a team member (admin action) ---
    if ("assignedTo" in body) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Only admin can assign jobs" }, { status: 403 });
      }
      if (body.assignedTo) {
        job.assignedTo = body.assignedTo;
        job.status = "in_progress";
        job.claimRequestedBy = null;
      } else {
        // unassigning
        job.assignedTo = null;
      }
    }

    // --- services update: allow admin to edit services. If team tries, reject price edits ---
    if (Array.isArray(body.services)) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Only admin can update services/prices" }, { status: 403 });
      }
      // Validate & recalc
      let subtotal = 0;
      const validated = await Promise.all(body.services.map(async (s: any) => {
        if (s.serviceId) {
          const svc = await Service.findById(s.serviceId).lean().exec();
          if (svc) {
            if (!svc.allowCustomPrice && svc.defaultPrice !== null && svc.defaultPrice !== undefined) {
              s.unitPrice = svc.defaultPrice;
            }
            s.name = svc.name || s.name;
            s.allowCustomPrice = svc.allowCustomPrice;
          }
        }
        s.quantity = Number(s.quantity || 1);
        s.unitPrice = Number(s.unitPrice || 0);
        s.totalPrice = Number(s.quantity * s.unitPrice);
        subtotal += s.totalPrice;
        return s;
      }));
      job.services = validated;
      job.invoice = job.invoice || {};
      job.invoice.subtotal = subtotal;
      // Recompute invoice total unless override present
      job.invoice.total = job.totalOverride !== null && job.totalOverride !== undefined ? job.totalOverride : subtotal;
    }

    // --- status / rejectionNote changes (admin allowed; teams limited) ---
    if (body.status) {
      // Admin can set any status. Team cannot set to completed/accepted etc.
      if (role !== "admin") {
        // restrict team to only allowed transitions: request assignment (handled separately), maybe mark complete AFTER assigned to them
        // For safety, only allow team to set status to "completed" if they are the assignedTo
        if (body.status === "completed") {
          const user = await User.findOne({ email: session.user.email }).exec();
          if (!user || !job.assignedTo || job.assignedTo.toString() !== user._id.toString()) {
            return NextResponse.json({ error: "Only assigned technician can mark as complete" }, { status: 403 });
          }
          job.status = "completed";
        } else {
          return NextResponse.json({ error: "Unauthorized to set status" }, { status: 403 });
        }
      } else {
        job.status = body.status;
      }
    }

    if ("rejectionNote" in body) {
      if (role !== "admin") return NextResponse.json({ error: "Only admin can set rejection note" }, { status: 403 });
      job.rejectionNote = body.rejectionNote;
    }

    // Basic fields allowed for admin
    if ("carNumber" in body && role === "admin") job.carNumber = body.carNumber;
    if ("customerName" in body && role === "admin") job.customerName = body.customerName;
    if ("engineNumber" in body && role === "admin") job.engineNumber = body.engineNumber;

    await job.save();
    return NextResponse.json(job);
  } catch (err: any) {
    console.error("PATCH job error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}


// DELETE /api/jobs/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDB();
    const res = await Job.findByIdAndDelete(params.id);
    if (!res) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json({ message: "Job deleted" });
  } catch (err) {
    console.error("DELETE job error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
