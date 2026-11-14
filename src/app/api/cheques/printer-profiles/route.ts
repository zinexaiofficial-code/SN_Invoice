import { NextRequest, NextResponse } from 'next/server';
import { getAllChequePrinterProfiles, saveChequePrinterProfile, deleteChequePrinterProfile } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const profiles = await getAllChequePrinterProfiles();
    return NextResponse.json({ success: true, data: profiles }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch printer profiles' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const saved = await saveChequePrinterProfile(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save printer profile' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing profile ID' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    const ok = await deleteChequePrinterProfile(id);
    return NextResponse.json({ success: ok }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete printer profile' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

