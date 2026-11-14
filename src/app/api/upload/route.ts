import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedBuffer } from '@/lib/fileStorage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle standard multipart form-data upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const prefix = (formData.get('prefix') as string) || 'asset';

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form-data' }, { status: 400 });
      }

      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 413 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await saveUploadedBuffer(buffer, file.name, prefix);

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Handle JSON base64 data upload (for migrating existing signatures or canvas data)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { dataUrl, filename = 'signature.png', prefix = 'signature' } = body;

      if (!dataUrl || typeof dataUrl !== 'string') {
        return NextResponse.json({ error: 'Missing dataUrl in request' }, { status: 400 });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      if (buffer.length > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 413 });
      }

      const result = await saveUploadedBuffer(buffer, filename, prefix);

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: err.message || 'Internal upload error' }, { status: 500 });
  }
}
