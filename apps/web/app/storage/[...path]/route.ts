import { NextRequest, NextResponse } from 'next/server';
import { readFile, existsSync, statSync } from 'fs';
import { promisify } from 'util';
import path from 'path';

const readFileAsync = promisify(readFile);

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const STORAGE_DIR_WITH_SEP = STORAGE_DIR.endsWith(path.sep) ? STORAGE_DIR : STORAGE_DIR + path.sep;

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
    // SECURITY: reject any segment containing '..' or empty segments up front.
    // This catches the common path-traversal payloads before they reach path.join.
    for (const segment of params.path) {
      if (segment === '' || segment === '.' || segment === '..' || segment.includes('\0')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const filepath = path.resolve(STORAGE_DIR, ...params.path);

    // Security: ensure the resolved path is strictly inside STORAGE_DIR.
    // We compare against STORAGE_DIR + path.sep so that a sibling directory
    // like /app/storage-evil/ does NOT pass the startsWith check.
    if (filepath !== STORAGE_DIR && !filepath.startsWith(STORAGE_DIR_WITH_SEP)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Don't serve directories
    if (existsSync(filepath) && statSync(filepath).isDirectory()) {
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
