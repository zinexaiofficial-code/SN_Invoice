import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice, deleteInvoice, deleteInvoicesBatch } from '@/lib/serverDbService';

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
    if (!body || !body.clientId || !body.billingEntityId) {
      return NextResponse.json({ error: 'Missing required invoice master fields (clientId, billingEntityId)' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveInvoice(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save invoice:', err);
    return NextResponse.json({ error: err.message || 'Database error saving invoice' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Permission denied: Super Admin authorization is required to permanently delete invoices.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let idsToDelete: string[] = [];
    if (idsParam) {
      idsToDelete = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (id) {
      idsToDelete = [id.trim()];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids;
        } else if (body?.id) {
          idsToDelete = [body.id];
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'No invoice IDs provided for deletion' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const ok = await deleteInvoicesBatch(idsToDelete);
    return NextResponse.json({ success: ok, count: idsToDelete.length }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to batch delete invoices:', err);
    return NextResponse.json({ error: err.message || 'Database error deleting invoices' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

