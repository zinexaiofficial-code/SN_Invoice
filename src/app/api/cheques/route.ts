import { NextRequest, NextResponse } from 'next/server';
import { getAllCheques, saveCheque } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAllCheques();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.chequeNumber || !body.bankName) {
      return NextResponse.json({ error: 'Missing required cheque fields' }, { status: 400 });
    }
    const saved = await saveCheque(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Failed to save cheque:', err);
    return NextResponse.json({ error: err.message || 'Database error saving cheque' }, { status: 500 });
  }
}
