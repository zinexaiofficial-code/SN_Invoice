import { NextRequest, NextResponse } from 'next/server';
import { getAllClients, saveClient } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAllClients();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.companyName) {
      return NextResponse.json({ error: 'Missing company name' }, { status: 400 });
    }
    const saved = await saveClient(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Failed to save client:', err);
    return NextResponse.json({ error: err.message || 'Database error saving client' }, { status: 500 });
  }
}
