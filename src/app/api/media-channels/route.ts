import { NextRequest, NextResponse } from 'next/server';
import { getAllMediaChannels, saveMediaChannel } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAllMediaChannels();
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Missing channel name' }, { status: 400 });
    }
    const saved = await saveMediaChannel(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
