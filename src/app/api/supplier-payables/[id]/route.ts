import { NextRequest, NextResponse } from 'next/server';
import {
  getSupplierPayableById,
  deleteSupplierPayable,
} from '@/lib/serverDbService';

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
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const payable = await getSupplierPayableById(id);
    if (!payable) {
      return NextResponse.json(
        { success: false, error: 'Supplier payable not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      data: payable,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in GET /api/supplier-payables/[id]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch payable' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied: Super Admin authorization is required to permanently delete supplier payables.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const ok = await deleteSupplierPayable(id);
    return NextResponse.json({
      success: ok,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/supplier-payables/[id]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete payable' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

