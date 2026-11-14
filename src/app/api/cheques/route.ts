import { NextRequest, NextResponse } from 'next/server';
import { getAllCheques, saveCheque, deleteCheque } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list = await getAllCheques();
    return NextResponse.json({ success: true, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bank = body?.drawerBank || body?.bankName;
    if (!body || !body.chequeNumber || !bank) {
      return NextResponse.json(
        { error: 'Missing required cheque fields: chequeNumber and bank/drawerBank are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const chequeToSave = {
      ...body,
      id: body.id || `chq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      bankName: bank,
      drawerBank: bank,
      amount: Number(body.amount) || 0,
      chequeDate: body.chequeDate || today,
      receivedOrIssuedDate: body.receivedOrIssuedDate || body.issueDate || today,
      type: body.type || 'incoming',
    };

    const saved = await saveCheque(chequeToSave);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save cheque:', err);
    return NextResponse.json({ error: err.message || 'Database error saving cheque' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing cheque ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const ok = await deleteCheque(id);
    return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to delete cheque:', err);
    return NextResponse.json({ error: err.message || 'Database error deleting cheque' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

