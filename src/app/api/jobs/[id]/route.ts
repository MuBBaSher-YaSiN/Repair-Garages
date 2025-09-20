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
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession({ req, ...authOptions });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDB();
    const body = await req.json();

    const job = await Job.findById(params.id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Allow admin or assigned team member to patch depending on fields
    // For simplicity, require admin for changing assignedTo/status beyond team actions
    const role = session.user.role;

    // Update basic fields if provided
    if (body.carNumber) job.carNumber = body.carNumber;
    if (body.customerName) job.customerName = body.customerName;
    if ("engineNumber" in body) job.engineNumber = body.engineNumber;

    // Update services if provided — recalc totals server-side
    if (Array.isArray(body.services)) {
      let subtotal = 0;
      const validated = await Promise.all(
        body.services.map(async (s) => {
          // If serviceId present, load catalog to enforce allowCustomPrice if needed
          if (s.serviceId) {
            const svc = await Service.findById(s.serviceId).lean();
            if (svc) {
              if (!svc.allowCustomPrice && svc.defaultPrice !== null && svc.defaultPrice !== undefined) {
                s.unitPrice = svc.defaultPrice;
              }
              s.name = svc.name || s.name;
            }
          }
          s.quantity = Number(s.quantity || 1);
          s.unitPrice = Number(s.unitPrice || 0);
          s.totalPrice = Number(s.unitPrice * s.quantity);
          subtotal += s.totalPrice;
          return s;
        })
      );

      job.services = validated;
      // Recompute invoice subtotal/total unless totalOverride present
      job.invoice = job.invoice || {};
      job.invoice.subtotal = subtotal;
      job.invoice.total = typeof job.totalOverride === "number" && job.totalOverride !== null ? job.totalOverride : subtotal;
      job.invoice.generatedAt = job.invoice.generatedAt || new Date();
    }

    // totalOverride update
    if ("totalOverride" in body) {
      const override = body.totalOverride;
      job.totalOverride = override === null ? null : Number(override);
      job.invoice = job.invoice || {};
      job.invoice.total = job.totalOverride !== null && job.totalOverride !== undefined ? Number(job.totalOverride) : job.invoice.subtotal ?? 0;
    }

    // status/rejectionNote updates (admin)
    if (body.status) {
      if (role !== "admin" && role !== "team") {
        return NextResponse.json({ error: "Unauthorized to change status" }, { status: 403 });
      }
      job.status = body.status;
    }
    if ("rejectionNote" in body) job.rejectionNote = body.rejectionNote;

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
