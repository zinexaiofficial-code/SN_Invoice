import { NextRequest, NextResponse } from 'next/server';
import { getAllVendors, saveVendor, deleteVendor } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list = await getAllVendors();
    return NextResponse.json({ success: true, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name || !String(body.name).trim()) {
      return NextResponse.json(
        { error: 'Vendor name is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveVendor(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save vendor:', err);
    return NextResponse.json({ error: err.message || 'Database error saving vendor' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing vendor id' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    await deleteVendor(id);
    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to delete vendor:', err);
    return NextResponse.json({ error: err.message || 'Database error deleting vendor' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
