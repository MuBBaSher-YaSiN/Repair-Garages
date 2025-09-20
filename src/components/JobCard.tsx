// src/components/JobCard.tsx
// @ts-nocheck
"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Sparkles,
  Check,
  X,
  Download,
  Wrench,
  Car,
  User,
} from "lucide-react";
import { cardVariants } from "@/lib/animations";

export default function JobCard({
  job,
  refreshJobs,
}: {
  job: any;
  refreshJobs: () => void;
}) {
  const { data: session } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [localStatus, setLocalStatus] = useState(job.status);

  const isTeam = session?.user?.role === "team";
  const isAdmin = session?.user?.role === "admin";
  const userId = session?.user?._id;
  const assignedTo =
    typeof job.assignedTo === "object" ? job.assignedTo._id : job.assignedTo;
  const statusText = (localStatus || "").replace("_", " ");

  const services = job.services || [];
  const subtotal = services.reduce(
    (s: number, it: any) => s + (Number(it.totalPrice) || 0),
    0
  );
  const total =
    typeof job.totalOverride === "number" && job.totalOverride !== null
      ? job.totalOverride
      : job.invoice?.total ?? subtotal;

  // --- API Actions ---
  const handleClaim = async () => {
    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/claim`, { method: "PATCH" });
    if (res.ok) {
      setLocalStatus("assignment_requested");
      setTimeout(() => refreshJobs(), 800);
    }
    setIsAnimating(false);
  };

  const handleAssignToRequester = async () => {
    if (!job.claimRequestedBy?._id) {
      alert("No requester found");
      return;
    }
    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    if (res.ok) {
      setLocalStatus("in_progress");
      setTimeout(() => refreshJobs(), 800);
    } else {
      const err = await res.json();
      alert("Error assigning: " + (err.error || "Something went wrong"));
    }
    setIsAnimating(false);
  };

  const handleRejectAssignment = async () => {
    const note = prompt("Enter rejection reason:");
    if (!note) return;

    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: note }),
    });
    if (res.ok) {
      setLocalStatus("pending");
      setTimeout(() => refreshJobs(), 800);
    } else {
      const err = await res.json();
      alert("Error rejecting: " + (err.error || "Something went wrong"));
    }
    setIsAnimating(false);
  };

  const handleComplete = async () => {
    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/complete`, {
      method: "PATCH",
    });
    if (res.ok) {
      setLocalStatus("completed");
      setTimeout(() => refreshJobs(), 800);
    }
    setIsAnimating(false);
  };

  const handleAccept = async () => {
    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/accept`, {
      method: "PATCH",
    });
    if (res.ok) {
      setLocalStatus("accepted");
      setTimeout(() => refreshJobs(), 800);
    } else {
      alert("Error: " + (await res.json())?.error || "Something went wrong");
    }
    setIsAnimating(false);
  };

  const handleReject = async () => {
    const note = prompt("Enter rejection reason:");
    if (!note) return;

    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectionNote: note }),
    });
    if (res.ok) {
      setLocalStatus("rejected");
      setTimeout(() => refreshJobs(), 800);
    } else {
      alert("Error: " + (await res.json())?.error || "Something went wrong");
    }
    setIsAnimating(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    setIsAnimating(true);
    const res = await fetch(`/api/jobs/${job._id}`, { method: "DELETE" });
    if (res.ok) {
      alert("Job deleted successfully");
      setTimeout(() => refreshJobs(), 800);
    } else {
      const data = await res.json();
      alert("Error: " + (data?.error || "Something went wrong"));
    }
    setIsAnimating(false);
  };

  const handleEdit = () => {
    window.location.href = `/admin/dashboard/edit-job/${job._id}`;
  };

  // --- Status chip colors ---
  const statusColors: Record<string, string> = {
    pending: "bg-gray-200 text-gray-800",
    assignment_requested: "bg-orange-100 text-orange-700 border border-orange-300",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    accepted: "bg-purple-100 text-purple-700",
    rejected: "bg-red-100 text-red-700",
    delivered: "bg-teal-100 text-teal-700",
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative overflow-hidden mb-3"
    >
      <Card className="relative border border-gray-200 backdrop-blur-sm bg-white/70 dark:bg-gray-900/70 transition-all duration-300">
        <CardContent className="space-y-4 p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: isHovered ? 10 : 0 }}>
                <Car className="w-6 h-6 text-gray-600" />
              </motion.div>
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  {job.carNumber}
                  {isHovered && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full"
                    >
                      #{String(job._id).slice(-4)}
                    </motion.span>
                  )}
                </h3>
                <p className="text-muted-foreground flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {job.customerName}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1.5 text-xs rounded-full font-medium ${
                  statusColors[localStatus] || "bg-gray-100"
                }`}
              >
                {statusText}
              </span>
              <div className="mt-2 text-sm">
                Total:{" "}
                <span className="font-semibold">
                  {Number(total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Engine</p>
                <p className="font-medium">{job.engineNumber || "-"}</p>
              </div>
            </div>

            {assignedTo && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Assigned</p>
                  <p className="truncate font-medium">
                    {job.assignedTo?.email || assignedTo}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Services preview */}
          {services.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
              <p className="font-medium flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Services
              </p>
              <p className="text-muted-foreground mt-1">
                {services
                  .slice(0, 2)
                  .map(
                    (s: any) =>
                      `${s.name} (${s.quantity ?? 1} × ${s.unitPrice ?? 0})`
                  )
                  .join(", ")}
                {services.length > 2 && ` +${services.length - 2} more`}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {isTeam && job.status === "pending" && !assignedTo && (
              <button
                onClick={handleClaim}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Claim
              </button>
            )}

            {isAdmin && job.status === "assignment_requested" && (
              <>
                <button
                  onClick={handleAssignToRequester}
                  className="px-4 py-2 bg-orange-600 text-white rounded"
                >
                  Assign to requester
                </button>
                <button
                  onClick={handleRejectAssignment}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Reject request
                </button>
              </>
            )}

            {isTeam &&
              job.status === "in_progress" &&
              assignedTo === userId && (
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Complete
                </button>
              )}

            <button
              onClick={() => window.open(`/api/pdf/${job._id}`, "_blank")}
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              Download PDF
            </button>

            {isAdmin && job.status === "completed" && (
              <>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2 bg-green-700 text-white rounded"
                >
                  Accept
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Reject
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
