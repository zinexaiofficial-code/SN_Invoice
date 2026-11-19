import { NextRequest, NextResponse } from 'next/server';
import { convertScheduleToInvoice } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === 'itemized' ? 'itemized' : 'package';

    const invoice = await convertScheduleToInvoice(params.id, mode, {
      invoiceDate: body.invoiceDate,
      dueDate: body.dueDate,
      notes: body.notes,
    });

    return NextResponse.json({
      success: true,
      data: invoice,
      message: `Schedule successfully converted to Invoice #${invoice.invoiceNumber}`,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in POST /api/schedules/[id]/convert-to-invoice:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to convert schedule to invoice' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

