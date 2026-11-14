import { NextRequest, NextResponse } from 'next/server';
import { createChequePdf } from '@/lib/chequePdfGenerator';
import { ChequePrintPayload } from '@/types/chequePrint';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload: ChequePrintPayload = await req.json();
    if (!payload || !payload.template || !payload.liveData) {
      return NextResponse.json({ error: 'Missing required print payload' }, { status: 400 });
    }

    const doc = createChequePdf(payload);
    const pdfArrayBuffer = doc.output('arraybuffer');

    const filename = `Cheque_${payload.liveData.chequeNumber || 'Print'}_${payload.printType || 'final'}.pdf`;

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Cheque PDF generation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
