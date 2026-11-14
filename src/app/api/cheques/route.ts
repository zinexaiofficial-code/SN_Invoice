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
    if (!body || !body.chequeNumber || !body.bankName) {
      return NextResponse.json({ error: 'Missing required cheque fields' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveCheque(body);
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

