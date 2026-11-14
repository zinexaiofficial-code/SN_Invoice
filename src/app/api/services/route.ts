import { NextRequest, NextResponse } from 'next/server';
import { getAllServices, saveService } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAllServices();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Missing service name' }, { status: 400 });
    }
    const saved = await saveService(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Failed to save service:', err);
    return NextResponse.json({ error: err.message || 'Database error saving service' }, { status: 500 });
  }
}
