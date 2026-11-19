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
    if (!body) {
      return NextResponse.json(
        { error: 'Missing request body' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const chequeNumber = (body.chequeNumber && String(body.chequeNumber).trim()) || `CHQ-${Date.now().toString().slice(-6)}`;
    const bank = (body.drawerBank && String(body.drawerBank).trim()) ||
                 (body.bankName && String(body.bankName).trim()) ||
                 (body.bank && String(body.bank).trim()) ||
                 'General Bank';

    const today = new Date().toISOString().split('T')[0];
    const chequeToSave = {
      ...body,
      id: (body.id && String(body.id).trim()) || `chq-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      chequeNumber,
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
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Permission denied: Super Admin authorization is required to permanently delete cheques.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

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

