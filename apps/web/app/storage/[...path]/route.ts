import { NextRequest, NextResponse } from 'next/server';
import { readFile, existsSync } from 'fs';
import { promisify } from 'util';
import path from 'path';

const readFileAsync = promisify(readFile);

const STORAGE_DIR = path.join(process.cwd(), 'storage');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ path: string[] }> }
) {
  const params = await paramsPromise
  try {
    const filepath = path.join(STORAGE_DIR, ...params.path);

    // Security: ensure path is within STORAGE_DIR
    if (!filepath.startsWith(STORAGE_DIR)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ext = path.extname(filepath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const file = await readFileAsync(filepath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
