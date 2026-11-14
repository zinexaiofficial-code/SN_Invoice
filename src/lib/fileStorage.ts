import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function getUploadsDir(): string {
  const baseDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const uploadsDir = path.join(baseDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export interface SavedFileResult {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export async function saveUploadedBuffer(
  buffer: Buffer,
  originalFilename: string,
  prefix: string = 'file'
): Promise<SavedFileResult> {
  const uploadsDir = getUploadsDir();

  // Extract clean extension
  const ext = path.extname(originalFilename).toLowerCase() || '.png';
  const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf'];
  const safeExt = allowedExts.includes(ext) ? ext : '.png';

  // Generate unique hash-based filename
  const hash = crypto.randomBytes(12).toString('hex');
  const safeFilename = `${prefix}_${Date.now()}_${hash}${safeExt}`;
  const targetPath = path.join(uploadsDir, safeFilename);

  // Write file to persistent storage
  fs.writeFileSync(targetPath, buffer);

  // Derive mime type
  let mimeType = 'application/octet-stream';
  if (safeExt === '.png') mimeType = 'image/png';
  else if (safeExt === '.jpg' || safeExt === '.jpeg') mimeType = 'image/jpeg';
  else if (safeExt === '.webp') mimeType = 'image/webp';
  else if (safeExt === '.svg') mimeType = 'image/svg+xml';
  else if (safeExt === '.pdf') mimeType = 'application/pdf';

  return {
    filename: safeFilename,
    url: `/api/uploads/${safeFilename}`,
    size: buffer.length,
    mimeType,
  };
}

export function getUploadedFilePath(filename: string): string | null {
  // Prevent directory traversal
  const safeName = path.basename(filename);
  const targetPath = path.join(getUploadsDir(), safeName);
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  return null;
}
