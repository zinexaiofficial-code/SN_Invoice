import { NextRequest, NextResponse } from 'next/server';
import { getAllClients, saveClient, deleteClient, archiveClient } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const list = await getAllClients();
    return NextResponse.json({ success: true, data: list }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientName = body?.name || body?.companyName;
    if (!body || !clientName) {
      return NextResponse.json({ error: 'Missing client name' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    body.name = clientName;
    const saved = await saveClient(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to save client:', err);
    return NextResponse.json({ error: err.message || 'Database error saving client' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    let id = queryId;
    let archiveOnly = searchParams.get('archive') === 'true';

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
        if (body?.archive !== undefined) archiveOnly = Boolean(body.archive);
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing client ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (archiveOnly) {
      const ok = await archiveClient(id);
      return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
    }

    const result = await deleteClient(id);
    return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Failed to delete client:', err);
    return NextResponse.json({ error: err.message || 'Database error deleting client' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
