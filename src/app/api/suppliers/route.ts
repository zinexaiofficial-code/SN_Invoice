import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSuppliers,
  saveSupplier,
  deleteSupplier,
} from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  try {
    const suppliers = await getAllSuppliers();
    return NextResponse.json({
      success: true,
      data: suppliers,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/suppliers:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch suppliers' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const saved = await saveSupplier(body);
    return NextResponse.json({
      success: true,
      data: saved,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in POST /api/suppliers:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save supplier' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied: Super Admin authorization is required to permanently delete suppliers.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const ok = await deleteSupplier(id);
    return NextResponse.json({
      success: ok,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/suppliers:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete supplier' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

