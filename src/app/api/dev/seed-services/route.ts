// src/app/api/dev/seed-services/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import { Service } from "@/models/Service";

export async function GET() {
  try {
    await connectToDB();
    const defaults = [
      { key: "car-wash", name: "Car Wash", defaultPrice: 5, allowCustomPrice: false },
      { key: "brake-pad-replacement", name: "Brake Pad Replacement", defaultPrice: 50, allowCustomPrice: false },
      { key: "oil-change", name: "Oil Change", defaultPrice: 30, allowCustomPrice: false },
      { key: "custom-labor", name: "Labor (Custom)", defaultPrice: null, allowCustomPrice: true },
    ];

    const created = [];
    for (const d of defaults) {
      const existing = await Service.findOne({ key: d.key });
      if (!existing) {
        const c = await Service.create(d);
        created.push(c);
      }
    }

    return NextResponse.json({ created }, { status: 201 });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
