import { NextRequest, NextResponse } from 'next/server';
import { getMediaScheduleById, deleteMediaSchedule } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = await getMediaScheduleById(params.id);
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/schedules/[id]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteMediaSchedule(params.id);
    return NextResponse.json({
      success,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/schedules/[id]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
