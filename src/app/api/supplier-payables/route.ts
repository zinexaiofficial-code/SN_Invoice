import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSupplierPayables,
  saveSupplierPayable,
  deleteSupplierPayable,
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
    const billingEntityId = searchParams.get('billingEntityId') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const scheduleId = searchParams.get('scheduleId') || undefined;
    const status = searchParams.get('status') || undefined;

    const payables = await getAllSupplierPayables({
      billingEntityId,
      supplierId,
      scheduleId,
      status,
    });

    return NextResponse.json({
      success: true,
      data: payables,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/supplier-payables:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch payables' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.billingEntityId || !body.supplierId) {
      return NextResponse.json(
        { success: false, error: 'Billing Entity and Supplier are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveSupplierPayable(body);
    return NextResponse.json({
      success: true,
      data: saved,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in POST /api/supplier-payables:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save payable' },
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
        { success: false, error: 'Payable ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const ok = await deleteSupplierPayable(id);
    return NextResponse.json({
      success: ok,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/supplier-payables:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete payable' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
