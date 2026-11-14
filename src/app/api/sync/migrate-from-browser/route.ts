import { NextRequest, NextResponse } from 'next/server';
import { migrateFromBrowser } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await migrateFromBrowser(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Browser migration error:', err);
    return NextResponse.json({ error: err.message || 'Failed to migrate browser data' }, { status: 500 });
  }
}

