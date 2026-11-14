import { NextResponse } from 'next/server';
import { getBootstrapData } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getBootstrapData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error('Error fetching bootstrap data:', err);
    return NextResponse.json({ error: err.message || 'Failed to load bootstrap data' }, { status: 500 });
  }
}
