import { NextRequest, NextResponse } from 'next/server';
import { getAllInvoices, saveInvoice } from '@/lib/serverDbService';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const list = await getAllInvoices();
    const found = list.find((i) => i.id === params.id || i.invoiceNumber === params.id);
    if (!found) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: found });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = getDbPool();
    if (pool) {
      await pool.query('DELETE FROM invoices WHERE id = $1', [params.id]);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
