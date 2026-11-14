import { NextRequest, NextResponse } from 'next/server';
import { getAllBillingEntities, saveBillingEntity, deleteBillingEntity, archiveBillingEntity } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list = await getAllBillingEntities();
    return NextResponse.json({ success: true, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Missing required entity name' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveBillingEntity(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save entity:', err);
    return NextResponse.json({ error: err.message || 'Database error saving entity' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let archiveOnly = searchParams.get('archive') === 'true';

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
        if (body?.archive !== undefined) archiveOnly = Boolean(body.archive);
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing billing entity ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (archiveOnly) {
      const ok = await archiveBillingEntity(id);
      return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
    }

    const result = await deleteBillingEntity(id);
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to delete billing entity:', err);
    return NextResponse.json({ error: err.message || 'Database error deleting entity' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

