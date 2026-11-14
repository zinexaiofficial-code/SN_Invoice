import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapData, migrateFromBrowser } from '@/lib/serverDbService';

export const dynamic = 'force-dynamic';

// Download complete JSON backup of all business data
export async function GET() {
  try {
    const data = await getBootstrapData();
    const backupPayload = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      generator: 'SN Invoice Automated Enterprise Backup',
      ...data,
    };

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sn_invoice_backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Restore complete JSON backup into PostgreSQL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid backup file payload' }, { status: 400 });
    }

    const result = await migrateFromBrowser(body);
    return NextResponse.json({
      message: 'Database backup restored successfully',
      ...result,
    });
  } catch (err: any) {
    console.error('Backup restore error:', err);
    return NextResponse.json({ error: err.message || 'Failed to restore backup' }, { status: 500 });
  }
}
