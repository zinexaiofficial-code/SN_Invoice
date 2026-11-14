import { NextRequest, NextResponse } from 'next/server';
import { getAllBillingEntities, saveBillingEntity } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAllBillingEntities();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Missing required entity name' }, { status: 400 });
    }
    const saved = await saveBillingEntity(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Failed to save entity:', err);
    return NextResponse.json({ error: err.message || 'Database error saving entity' }, { status: 500 });
  }
}
