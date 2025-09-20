// src/app/api/services/route.ts
import { connectToDB } from "@/lib/db";
import { Service } from "@/models/Service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();
    const services = await Service.find({}).lean();
    return NextResponse.json(services);
  } catch (err) {
    console.error("Failed to fetch services:", err);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

// Optional: create service (admin only). Keep for quick seeding from UI or remove in production.
export async function POST(req: Request) {
  try {
    await connectToDB();
    const body = await req.json();
    const { key, name, defaultPrice, allowCustomPrice } = body;
    if (!key || !name) {
      return NextResponse.json({ error: "key and name required" }, { status: 400 });
    }
    const existing = await Service.findOne({ key });
    if (existing) return NextResponse.json({ error: "Service exists" }, { status: 409 });
    const s = await Service.create({ key, name, defaultPrice: defaultPrice ?? null, allowCustomPrice: allowCustomPrice ?? true });
    return NextResponse.json(s, { status: 201 });
  } catch (err) {
    console.error("Failed to create service:", err);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
