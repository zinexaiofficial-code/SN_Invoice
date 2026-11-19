import { NextRequest, NextResponse } from 'next/server';
import {
  recordSupplierPayment,
  voidSupplierPayment,
} from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payableId = params?.id;
    if (!payableId) {
      return NextResponse.json(
        { success: false, error: 'Payable ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await request.json();
    if (!body || !body.amount || Number(body.amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid payment amount is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const transaction = await recordSupplierPayment({
      payableId,
      amount: Number(body.amount),
      paymentDate: body.paymentDate,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      referenceNumber: body.referenceNumber || '',
      chequeId: body.chequeId || undefined,
      bankAccountInfo: body.bankAccountInfo || '',
      receiptUrl: body.receiptUrl || '',
      notes: body.notes || '',
      recordedBy: body.recordedBy || 'Admin',
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in POST /api/supplier-payables/[id]/payments:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to record supplier payment' },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const reason = searchParams.get('reason') || 'Voided by user';
    const voidedBy = searchParams.get('voidedBy') || 'Admin';

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const ok = await voidSupplierPayment(transactionId, reason, voidedBy);
    return NextResponse.json({
      success: ok,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error('Error in DELETE /api/supplier-payables/[id]/payments:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to void payment transaction' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

