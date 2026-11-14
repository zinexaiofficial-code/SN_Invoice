import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list = await getAllInvoices();
    return NextResponse.json({ success: true, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.id || !body.invoiceNumber || !body.clientId || !body.billingEntityId) {
      return NextResponse.json({ error: 'Missing required invoice master fields' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveInvoice(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save invoice:', err);
    return NextResponse.json({ error: err.message || 'Database error saving invoice' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

