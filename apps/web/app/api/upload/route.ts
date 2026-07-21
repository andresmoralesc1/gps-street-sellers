import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const STORAGE_DIR = path.join(process.cwd(), 'storage')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  // Rate limit BEFORE auth — uploads are expensive (disk I/O).
  // 20 uploads / hour / IP — generous for legit use, blocks storage abuse.
  const ip = getClientIp(req)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'upload', 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas subidas. Intenta más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawFolder = (formData.get('folder') as string || 'misc').replace(/[^a-z0-9_-]/gi, '')

    // Defense in depth: the regex above strips slashes and dots, but we still
    // reject '..', empty strings, and anything that smells like a separator
    // before we hit the filesystem. Cheap to compute, prevents the filename
    // sanitizer from leaking a path separator through legitimate-looking input
    // like '..' (regex collapses to '' or '..' depending on which chars hit).
    if (!rawFolder || rawFolder === '..' || rawFolder === '.' || rawFolder.includes('/') || rawFolder.includes('\\')) {
      return NextResponse.json({ error: 'folder inválido' }, { status: 400 })
    }
    const folder = rawFolder

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Máximo 5MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    // Whitelist the extension from a known-safe set so the client can't
    // rename 'evil.html' to 'evil.jpg' to bypass the MIME check.
    const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const
    const rawExt = path.extname(file.name || '').toLowerCase()
    const ext = ALLOWED_EXTS.includes(rawExt as any) ? rawExt : '.jpg'
    const uuid = randomUUID()
    const filename = `${uuid}${ext}`
    const subdir = path.join(STORAGE_DIR, folder)
    const filepath = path.join(subdir, filename)

    if (!existsSync(subdir)) {
      await mkdir(subdir, { recursive: true })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const url = `/storage/${folder}/${filename}`
    return NextResponse.json({ url }, { status: 201 })
  } catch (err) {
    logger.error(serializeErr(err), 'Upload error:')
    return NextResponse.json({ error: 'Error interno al subir' }, { status: 500 })
  }
}
