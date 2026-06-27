import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const STORAGE_DIR = path.join(process.cwd(), 'storage')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function getToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.cookies.get('token')?.value || null
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req)
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let decoded: { userId: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string || 'misc').replace(/[^a-z0-9_-]/gi, '')

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Máximo 5MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    const ext = path.extname(file.name || '.jpg').toLowerCase()
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
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Error interno al subir' }, { status: 500 })
  }
}
