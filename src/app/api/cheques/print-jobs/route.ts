import { NextRequest, NextResponse } from 'next/server';
import { getChequePrintJobs, recordChequePrintJob } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chequeId = searchParams.get('chequeId') || undefined;
    const jobs = await getChequePrintJobs(chequeId);
    return NextResponse.json({ success: true, data: jobs }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch print jobs' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await recordChequePrintJob(body);
    return NextResponse.json({ success: true, data: saved }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record print job' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

