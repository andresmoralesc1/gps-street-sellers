import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET  /api/sponsorships          — list current user's sponsorships
 * POST /api/sponsorships          — create a sponsorship (plan + duration)
 *
 * Plans:
 *   semanal   — 7 days   — COP $20.000
 *   mensual   — 30 days  — COP $60.000
 *
 * Payment integration with Wompi is OUT OF SCOPE for this endpoint — it
 * returns a "pending_payment" sponsorship and a checkout URL placeholder.
 * The Wompi webhook will flip status to 'active' when payment confirms.
 *
 * For now this endpoint can mark sponsorship as 'active' immediately
 * (manual payment / transfer / Nequi direct — useful for the beta).
 */

const PRICING = {
  semanal:  { days: 7,  amount_cents: 20_000_00 }, // COP 20.000 (stored in cents)
  mensual:  { days: 30, amount_cents: 60_000_00 },
}

async function getMyVendorId(req: NextRequest) {
  let token: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
  else token = req.cookies.get('token')?.value || null

  if (!token) return { error: 'No autorizado', status: 401 } as const

  const decoded = await verifyToken(token)
  if (!decoded) return { error: 'Token inválido', status: 401 } as const

  const r = await pool.query(
    'SELECT v.id FROM vendors v JOIN profiles p ON p.id = v.profile_id WHERE p.user_id = $1',
    [decoded.userId]
  )
  if (r.rows.length === 0) return { error: 'No tienes un perfil de vendedor', status: 403 } as const
  return { vendorId: r.rows[0].id as string }
}

export async function GET(req: NextRequest) {
  const auth = await getMyVendorId(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await pool.query(
    `SELECT id, plan, amount_cents, starts_at, ends_at, status, created_at
     FROM sponsorships
     WHERE vendor_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [auth.vendorId]
  )

  const sponsorships = result.rows.map((s) => ({
    id: s.id,
    plan: s.plan,
    amountCents: Number(s.amount_cents),
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    status: s.status,
    active: s.status === 'active' && new Date(s.ends_at) > new Date(),
    createdAt: s.created_at,
  }))

  return NextResponse.json({ sponsorships })
}

export async function POST(req: NextRequest) {
  const auth = await getMyVendorId(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const plan = body.plan as 'semanal' | 'mensual' | undefined

  if (!plan || !(plan in PRICING)) {
    return NextResponse.json(
      { error: 'plan must be one of: semanal, mensual' },
      { status: 400 }
    )
  }

  const config = PRICING[plan]

  // Don't allow stacking — if there's an active sponsorship, reject.
  // (We could allow renewals that extend the window; deferred for v2.)
  const activeResult = await pool.query(
    `SELECT id, ends_at FROM sponsorships
     WHERE vendor_id = $1 AND status = 'active' AND ends_at > NOW()
     LIMIT 1`,
    [auth.vendorId]
  )

  if (activeResult.rows.length > 0) {
    return NextResponse.json(
      {
        error: 'Ya tienes una sponsorship activa',
        activeUntil: activeResult.rows[0].ends_at,
      },
      { status: 409 }
    )
  }

  // Beta gate: sponsorship activation requires explicit opt-in via env var.
  // In production, payment verification (Wompi webhook) is required BEFORE
  // activation. Setting ENABLE_BETA_SPONSORSHIPS=true in .env re-enables the
  // dev/beta shortcut. Default = disabled (safer for prod).
  if (process.env.ENABLE_BETA_SPONSORSHIPS !== 'true') {
    return NextResponse.json(
      {
        error:
          'Pagos aún no disponibles. Estamos integrando Wompi (PSE/Nequi). ' +
          'Si quieres patrocinar tu tienda en beta, contacta a soporte.',
      },
      { status: 503 }
    )
  }

  const insertResult = await pool.query(
    `INSERT INTO sponsorships (vendor_id, plan, amount_cents, ends_at, status)
     VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL, 'active')
     RETURNING id, plan, amount_cents, starts_at, ends_at, status`,
    [auth.vendorId, plan, config.amount_cents, config.days]
  )

  return NextResponse.json({
    sponsorship: {
      id: insertResult.rows[0].id,
      plan: insertResult.rows[0].plan,
      amountCents: Number(insertResult.rows[0].amount_cents),
      startsAt: insertResult.rows[0].starts_at,
      endsAt: insertResult.rows[0].ends_at,
      status: insertResult.rows[0].status,
    },
  })
}