import { NextResponse } from 'next/server';
import { getBootstrapData } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const data = await getBootstrapData();
    return NextResponse.json({
      success: true,
      data,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error fetching bootstrap data:', err);
    return NextResponse.json({ error: err.message || 'Failed to load bootstrap data' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

