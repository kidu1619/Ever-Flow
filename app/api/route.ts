import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "EverFlow SaaS API",
    phase: "Release 1 (MVP) Foundation",
    timestamp: new Date().toISOString(),
  });
}
