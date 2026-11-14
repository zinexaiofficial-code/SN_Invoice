import { NextRequest, NextResponse } from 'next/server';
import { getBrandingSettings, saveBrandingSettings } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getBrandingSettings();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await saveBrandingSettings(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
