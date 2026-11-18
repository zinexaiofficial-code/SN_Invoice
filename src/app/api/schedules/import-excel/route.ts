import { NextRequest, NextResponse } from 'next/server';
import { parseExcelScheduleBuffer } from '@/lib/excelScheduleParser';
import { getAllBillingEntities, getAllClients } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No Excel file uploaded' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fetch existing entities and clients to match automatically
    const [entities, clients] = await Promise.all([
      getAllBillingEntities(),
      getAllClients(),
    ]);

    const parsed = parseExcelScheduleBuffer(
      buffer,
      entities.map(e => ({ id: e.id, name: e.name, invoicePrefix: e.prefix || (e as any).invoicePrefix })),
      clients.map(c => ({ id: c.id, companyName: c.name || c.companyName || '' }))
    );

    return NextResponse.json({
      success: true,
      data: parsed,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error parsing uploaded schedule Excel:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to parse Excel file' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
