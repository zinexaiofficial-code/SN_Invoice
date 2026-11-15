import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice, deleteInvoice } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const list = await getAllInvoices();
    const found = list.find((i) => i.id === params.id || i.invoiceNumber === params.id);
    if (!found) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json({ success: true, data: found }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    body.id = params.id;
    const saved = await saveInvoice(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = await deleteInvoice(params.id);
    return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

