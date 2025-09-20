// src/app/api/jobs/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Job } from "@/models/Job";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, rejectionNote } = await req.json(); // action = "accept" | "reject"

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
      job.rejectionNote = rejectionNote || "Assignment request rejected by admin";
      job.claimRequestedBy = null;
      job.status = "pending";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await job.save();

    // repopulate assignedTo for clean frontend response
    const updatedJob = await Job.findById(job._id)
      .populate("assignedTo", "email")
      .exec();

    return NextResponse.json(updatedJob);
  } catch (err: any) {
    console.error("❌ Error in assign route:", err);
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
