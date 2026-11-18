import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMediaSchedules,
  saveMediaSchedule,
  deleteMediaSchedule,
} from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const entityId = searchParams.get('entityId');
    const status = searchParams.get('status');

    let schedules = await getAllMediaSchedules();

    if (clientId) {
      schedules = schedules.filter(s => s.clientId === clientId);
    }
    if (entityId) {
      schedules = schedules.filter(s => s.billingEntityId === entityId);
    }
    if (status && status !== 'all') {
      schedules = schedules.filter(s => s.status === status);
    }

    return NextResponse.json({
      success: true,
      data: schedules,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/schedules:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch schedules' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.billingEntityId || !body.clientId) {
      return NextResponse.json(
        { success: false, error: 'Billing Entity and Client are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveMediaSchedule(body);
    return NextResponse.json({
      success: true,
      data: saved,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in POST /api/schedules:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const success = await deleteMediaSchedule(id);
    return NextResponse.json({
      success,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/schedules:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete schedule' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
