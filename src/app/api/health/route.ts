import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sn-invoice",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  }, { status: 200 });
}
