import { NextRequest, NextResponse } from 'next/server';
import { getAllChequeTemplates, saveChequeTemplate, deleteChequeTemplate } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const templates = await getAllChequeTemplates();
    return NextResponse.json({ success: true, data: templates }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch templates' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.bankName || !body.templateName) {
      return NextResponse.json({ error: 'bankName and templateName are required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveChequeTemplate(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save template' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const ok = await deleteChequeTemplate(id);
    return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete template' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
