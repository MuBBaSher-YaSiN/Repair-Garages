"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/types/job";

type ServiceItem = {
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  allowCustomPrice?: boolean;
  notes?: string;
};

export default function PostJobPage() {
  const router = useRouter();
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [serviceSelect, setServiceSelect] = useState<string>("");
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [serviceCustomPrice, setServiceCustomPrice] = useState<number | "">("");
  const [addedServices, setAddedServices] = useState<ServiceItem[]>([]);
  const [form, setForm] = useState<Partial<Job & { totalOverride?: number }>>({
    carNumber: "",
    customerName: "",
    engineNumber: "",
    totalOverride: undefined,
  });

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setServicesCatalog(data || []);
      } else {
        setServicesCatalog([]);
      }
    };
    load();
  }, []);

  const handleAddService = () => {
    if (!serviceSelect) return alert("Select a service first");
    const svc = servicesCatalog.find((s) => s._id === serviceSelect);
    if (!svc) return alert("Service not found");

    const allowCustom = !!svc.allowCustomPrice;
    const unit = allowCustom ? (serviceCustomPrice === "" ? 0 : Number(serviceCustomPrice)) : Number(svc.defaultPrice ?? 0);
    const qty = Number(serviceQuantity || 1);
    if (!allowCustom && (svc.defaultPrice === null || svc.defaultPrice === undefined)) {
      return alert("Selected service has no default price; please allow custom price in service settings.");
    }
    const total = unit * qty;
    const item: ServiceItem = {
      serviceId: svc._id,
      name: svc.name,
      quantity: qty,
      unitPrice: unit,
      totalPrice: total,
      allowCustomPrice: allowCustom,
    };
    setAddedServices((p) => [item, ...p]);
    setServiceSelect("");
    setServiceQuantity(1);
    setServiceCustomPrice("");
  };

  const updateService = (idx: number, patch: Partial<ServiceItem>) => {
    setAddedServices((prev) => {
      const copy = [...prev];
      const it = { ...copy[idx], ...patch };
      it.quantity = Number(it.quantity || 1);
      it.unitPrice = Number(it.unitPrice || 0);
      it.totalPrice = Number(it.quantity * it.unitPrice);
      copy[idx] = it;
      return copy;
    });
  };

  const handleRemoveService = (idx: number) => {
    setAddedServices((p) => p.filter((_, i) => i !== idx));
  };

  const calcSubtotal = () => addedServices.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const subtotal = calcSubtotal();
  const grandTotal = typeof form.totalOverride === "number" ? form.totalOverride : subtotal;

  const handleSubmit = async () => {
    if (!form.carNumber || !form.customerName) {
      return alert("Car number and customer name required");
    }
    if (addedServices.length === 0) {
      if (!confirm("No services added. Create job anyway?")) return;
    }

    const payload = {
      carNumber: form.carNumber,
      customerName: form.customerName,
      engineNumber: form.engineNumber,
      services: addedServices,
      invoice: { subtotal, tax: 0, total: grandTotal },
      status: "pending",
      totalOverride: typeof form.totalOverride === "number" ? form.totalOverride : null,
    };

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const err = await res.json().catch(() => null);
      alert("Error creating job: " + (err?.details || err?.error || "Unknown"));
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-lg font-bold">Job Details</h2>
          <input className="w-full my-2 p-2 border rounded" placeholder="Car Number" value={form.carNumber || ""} onChange={(e) => setForm({ ...form, carNumber: e.target.value })} />
          <input className="w-full my-2 p-2 border rounded" placeholder="Customer Name" value={form.customerName || ""} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="w-full my-2 p-2 border rounded" placeholder="Engine Number" value={form.engineNumber || ""} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-4">
          <h3 className="font-semibold">Add Services / Estimate</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <select className="p-2 border rounded col-span-2" value={serviceSelect} onChange={(e) => setServiceSelect(e.target.value)}>
              <option value="">-- Select service --</option>
              {servicesCatalog.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.defaultPrice !== null && s.defaultPrice !== undefined ? `- ${s.defaultPrice}` : ""}
                </option>
              ))}
            </select>

            <input type="number" min={1} className="p-2 border rounded" value={serviceQuantity} onChange={(e) => setServiceQuantity(Number(e.target.value))} placeholder="Quantity" />

            {/* ALWAYS show editable price input (prefill if default exists) */}
            {serviceSelect && (() => {
              const svc = servicesCatalog.find((x) => x._id === serviceSelect);
              if (!svc) return null;
              return (
                <input
                  type="number"
                  min={0}
                  className="p-2 border rounded col-span-4 md:col-span-1"
                  value={serviceCustomPrice === "" ? (svc.defaultPrice ?? "") : serviceCustomPrice}
                  onChange={(e) => setServiceCustomPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Unit price (editable)"
                />
              );
            })()}
          </div>

          <div>
            <button onClick={handleAddService} className="px-4 py-2 bg-indigo-600 text-white rounded">Add to estimate</button>
          </div>

          <div className="mt-4">
            <h4 className="font-medium">Estimate items</h4>
            {addedServices.length === 0 ? <p className="text-sm text-muted-foreground">No items added</p> : (
              <ul className="space-y-2 mt-2">
                {addedServices.map((it, idx) => (
                  <li key={idx} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-muted-foreground">
                        <input type="number" min={1} value={it.quantity} onChange={(e) => updateService(idx, { quantity: Number(e.target.value) })} className="w-20 mr-2 p-1 border rounded inline" />
                        ×
                        <input type="number" min={0} value={it.unitPrice} onChange={(e) => updateService(idx, { unitPrice: Number(e.target.value) })} className="w-28 ml-2 p-1 border rounded inline" />
                        = <strong className="ml-2">{(it.totalPrice || 0).toFixed(2)}</strong>
                      </div>
                      <input type="text" placeholder="Notes (optional)" value={it.notes || ""} onChange={(e) => updateService(idx, { notes: e.target.value })} className="mt-1 w-full p-1 border rounded" />
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => handleRemoveService(idx)} className="text-sm text-red-600">Remove</button>
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
              <div className="mt-2 font-semibold">Total to invoice: {grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSubmit} className="px-6 py-2 rounded bg-green-600 text-white">Submit Job</button>
        </div>
      </div>
    </div>
  );
}
