// src/app/api/jobs/route.ts
import { connectToDB } from "@/lib/db";
import { Job } from "@/models/Job";
import { Service } from "@/models/Service";
import { jobSchema } from "@/lib/validations/jobSchema";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();
    const parsed = jobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate & compute services
    let services = data.services || [];
    let subtotal = 0;

    if (Array.isArray(services) && services.length > 0) {
      const validatedServices = await Promise.all(
        services.map(async (s: any) => {
          if (s.serviceId) {
            const svc = await Service.findById(s.serviceId).lean().exec();
            if (!svc) throw new Error(`Service not found: ${s.serviceId}`);

            // If catalog forbids custom price, enforce defaultPrice
            if (!svc.allowCustomPrice && svc.defaultPrice !== null && svc.defaultPrice !== undefined) {
              s.unitPrice = svc.defaultPrice;
            }

            s.unitPrice = Number(s.unitPrice || 0);
            s.quantity = Number(s.quantity || 1);
            s.totalPrice = Number(s.unitPrice * s.quantity);
            s.name = svc.name || s.name || "Service";
            s.allowCustomPrice = svc.allowCustomPrice;
          } else {
            s.unitPrice = Number(s.unitPrice || 0);
            s.quantity = Number(s.quantity || 1);
            s.totalPrice = Number(s.unitPrice * s.quantity);
            s.allowCustomPrice = s.allowCustomPrice ?? true;
          }
          subtotal += s.totalPrice;
          return s;
        })
      );
      services = validatedServices;
    }

    const invoice = {
      subtotal,
      tax: 0,
      total: subtotal,
      generatedAt: new Date(),
    };

    // Use `new` + `save()` to avoid some TS overload typing problems with Model.create
    const jobDoc = new Job({
      carNumber: data.carNumber,
      customerName: data.customerName,
      engineNumber: data.engineNumber,
      services,
      invoice,
      status: data.status || "pending",
      totalOverride: typeof data.totalOverride === "number" ? data.totalOverride : null,
    });

    // if totalOverride is set, apply to invoice.total
    if (typeof jobDoc.totalOverride === "number" && jobDoc.totalOverride !== null) {
      jobDoc.invoice.total = Number(jobDoc.totalOverride);
    }

    await jobDoc.save();

    return NextResponse.json(jobDoc, { status: 201 });
  } catch (error: any) {
    console.error("Job create error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Job creation failed", details: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession({ req, ...authOptions });

    if (!session) {
      console.log(" No session found in /api/jobs");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const role = session.user.role;
    const email = session.user.email;

    let jobs;

    if (role === "admin") {
      // use .exec() to normalize return type and avoid TS overload union errors
      jobs = await Job.find({}).populate("assignedTo", "email").sort({ createdAt: -1 }).exec();
    } else {
      // Lookup user ID from email
      const user = await User.findOne({ email }).lean().exec();

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const userId = user._id;
      // Team members see pending jobs (to request assignment) and in_progress assigned to them
      jobs = await Job.find({
        $or: [
          { status: "pending" },
          // JOBS assigned to them already
          { status: "in_progress", assignedTo: userId },
          // Or requests they themselves made (assignment_requested by them) — optional
          { status: "assignment_requested", claimRequestedBy: userId },
        ],
      })
        .sort({ createdAt: -1 })
        .exec();
    }

    return NextResponse.json(jobs);
  } catch (error: unknown) {
    console.error(" Failed to fetch jobs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch jobs", details: message }, { status: 500 });
  }
}
