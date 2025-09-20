"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Job } from "@/types/job";

export default function EditJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Partial<Job> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        const job = await res.json();
        setForm({
          ...job,
          // ensure services array exists
          services: job.services || [],
          totalOverride: job.totalOverride ?? job.invoice?.total ?? null,
        });
      } else {
        alert("Failed to load job");
      }
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  const updateService = (idx: number, patch: Partial<any>) => {
    if (!form) return;
    const services = [...(form.services || [])];
    const it = { ...(services[idx] || {}), ...patch };
    it.quantity = Number(it.quantity || 1);
    it.unitPrice = Number(it.unitPrice || 0);
    it.totalPrice = Number(it.quantity * it.unitPrice);
    services[idx] = it;
    setForm({ ...form, services });
  };

  const addCustomService = () => {
    if (!form) return;
    const services = [{ name: "Custom service", quantity: 1, unitPrice: 0, totalPrice: 0 }, ...(form.services || [])];
    setForm({ ...form, services });
  };

  const removeService = (idx: number) => {
    if (!form) return;
    const services = (form.services || []).filter((_, i) => i !== idx);
    setForm({ ...form, services });
  };

  const calcSubtotal = () => (form?.services || []).reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const subtotal = calcSubtotal();
  const totalToUse = typeof form?.totalOverride === "number" ? form.totalOverride : subtotal;

  const handleSubmit = async () => {
    if (!form) return;
    const payload: any = {
      carNumber: form.carNumber,
      customerName: form.customerName,
      engineNumber: form.engineNumber,
      services: form.services,
      totalOverride: form.totalOverride ?? null,
    };
    // set invoice object
    payload.invoice = { subtotal, tax: 0, total: totalToUse };

    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert("Job updated");
      router.push("/admin/dashboard");
    } else {
      const err = await res.json().catch(() => null);
      alert("Failed to update job: " + (err?.details || err?.error || "Unknown"));
    }
  };

  if (loading || !form) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-lg font-bold">Edit Job</h2>
          <input className="w-full my-2 p-2 border rounded" placeholder="Car Number" value={form.carNumber || ""} onChange={(e) => setForm({ ...form, carNumber: e.target.value })} />
          <input className="w-full my-2 p-2 border rounded" placeholder="Customer Name" value={form.customerName || ""} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="w-full my-2 p-2 border rounded" placeholder="Engine Number" value={form.engineNumber || ""} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h3 className="font-semibold">Services</h3>
          <div className="mt-3 space-y-2">
            <button onClick={addCustomService} className="px-3 py-1 bg-indigo-600 text-white rounded">Add custom service</button>
            {(form.services || []).length === 0 ? <p className="text-sm text-muted-foreground">No services</p> : (
              <ul className="space-y-2 mt-3">
                {(form.services || []).map((it: any, idx: number) => (
                  <li key={idx} className="p-2 border rounded flex gap-3 items-start">
                    <div className="flex-1">
                      <input className="w-full mb-1 p-1 border rounded" value={it.name || ""} onChange={(e) => updateService(idx, { name: e.target.value })} />
                      <div className="text-sm text-muted-foreground">
                        <input type="number" className="w-20 p-1 mr-2 border rounded inline" value={it.quantity} onChange={(e) => updateService(idx, { quantity: Number(e.target.value) })} />
                        ×
                        <input type="number" className="w-28 ml-2 p-1 border rounded inline" value={it.unitPrice} onChange={(e) => updateService(idx, { unitPrice: Number(e.target.value) })} />
                        = <strong className="ml-2">{(it.totalPrice || 0).toFixed(2)}</strong>
                      </div>
                      <input className="w-full mt-2 p-1 border rounded" placeholder="Notes" value={it.notes || ""} onChange={(e) => updateService(idx, { notes: e.target.value })} />
                    </div>
                    <div>
                      <button className="text-red-600" onClick={() => removeService(idx)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-right mt-3">
              <div>Subtotal: <strong>{subtotal.toFixed(2)}</strong></div>
              <div className="mt-2">
                <label className="mr-2">Grand total (override)</label>
                <input type="number" value={form.totalOverride ?? ""} onChange={(e) => setForm({ ...form, totalOverride: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-36 p-1 border rounded inline" />
                <div className="text-sm text-muted-foreground">Leave blank to use subtotal</div>
              </div>
              <div className="mt-2 font-semibold">Total to invoice: {(totalToUse || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSubmit} className="px-6 py-2 rounded bg-green-600 text-white">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
