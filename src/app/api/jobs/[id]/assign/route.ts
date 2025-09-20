// src/app/api/jobs/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models/Job";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json(); // "accept" or "reject"

  const job = await Job.findById(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "assignment_requested") {
    return NextResponse.json(
      { error: "Job is not in assignment_requested state" },
      { status: 400 }
    );
  }

  if (action === "accept") {
    job.assignedTo = job.claimRequestedBy;
    job.claimRequestedBy = null;
    job.status = "in_progress";
  } else if (action === "reject") {
    job.claimRequestedBy = null;
    job.status = "pending";
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await job.save();

  return NextResponse.json(job);
}
