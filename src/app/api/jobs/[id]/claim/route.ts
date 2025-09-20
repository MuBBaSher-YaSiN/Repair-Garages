// src/app/api/jobs/[id]/claim/route.ts
import { connectToDB } from "@/lib/db";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession({ req, ...authOptions });

    if (!session || session.user.role !== "team") {
      console.error(" Unauthorized access attempt to claim route");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const user = await User.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const job = await Job.findById(params.id).exec();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only allow requesting assignment if job is still pending and no existing assignment request
    if (job.status !== "pending") {
      return NextResponse.json({ error: "Job cannot be requested" }, { status: 400 });
    }

    job.claimRequestedBy = user._id;
    job.status = "assignment_requested";
    await job.save();

    return NextResponse.json({ message: "Assignment requested. Waiting for admin approval." });
  } catch (err: any) {
    console.error(" Error in claim route:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
