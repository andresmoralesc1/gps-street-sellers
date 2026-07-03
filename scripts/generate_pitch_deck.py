"""
generate_pitch_deck.py — Regenerate the BarrioTech / CalleViva pitch deck PDF.

Run from repo root:
    python3 scripts/generate_pitch_deck.py

Output: apps/web/public/pitch-deck.pdf

Design references the live marketing site (apps/web/components/marketing/InversionistasView.tsx)
but fixes issues present in the previous binary-only commit d9a5484:
  - Typo "neurallflow" → "neuralflow"
  - Founder avatar placeholder "AM" → real photo (apps/web/public/andres-avatar.png)
  - Bio overflow off the white card on slide 11 (smaller text, taller card)
  - Stale gpsstreetsellers.com email → hola@barriotech.com
  - Wasted whitespace top of slide 4 (Market) → tighter title block + value bar

Branding: naranja primary + cream background + dark slide for metrics.
"""
from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.graphics.shapes import Path as RLPath
from reportlab.lib import pagesizes

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PDF = REPO_ROOT / "apps" / "web" / "public" / "pitch-deck.pdf"
AVATAR = REPO_ROOT / "apps" / "web" / "public" / "andres-avatar.png"

# ---------------------------------------------------------------------------
# Brand palette (matches InversionistasView.tsx)
# ---------------------------------------------------------------------------
ORANGE = HexColor("#F47B20")          # primary
ORANGE_DARK = HexColor("#D9651A")     # primary-600
ORANGE_LIGHT = HexColor("#FCEEE0")    # orange-50 / card accents
CREAM = HexColor("#FFF8F1")           # background-cream
GRAY_900 = HexColor("#111827")        # dark slide bg
WHITE = white
GRAY_700 = HexColor("#374151")
GRAY_500 = HexColor("#6B7280")
GRAY_400 = HexColor("#9CA3AF")

# ---------------------------------------------------------------------------
# Page geometry (landscape letter, 11x8.5in, matches previous deck)
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = landscape(letter)  # 792 x 612 pt
FOOTER_H = 30
MARGIN = 0.6 * inch

URL = "gps.neuralflow.space/inversionistas"  # CORRECT: "neuralflow" not "neurallflow"

CONTENT = {
    "brand": "CALLEVIVA · BARRIOTECH",
    "deck_title": "Pitch Deck 2026 — Confidencial",
    "footer_left": "CalleViva — Pitch Deck 2026",
    "footer_right": URL,
    "tagline": "Transformando la economía informal de Colombia en un ecosistema de datos.",
    "contact_email": "hola@barriotech.com",
}


def draw_footer(c: canvas.Canvas) -> None:
    """Standard footer used on every interior slide."""
    c.setFillColor(GRAY_400)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, MARGIN - 0.15 * inch, CONTENT["footer_left"])
    c.drawRightString(PAGE_W - MARGIN, MARGIN - 0.15 * inch, CONTENT["footer_right"])
    # hairline above footer
    c.setStrokeColor(HexColor("#E5E7EB"))
    c.setLineWidth(0.5)
    c.line(MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN)


def draw_corner_circles(c: canvas.Canvas, color: Color = ORANGE, alpha: float = 0.18) -> None:
    """Decorative translucent circles for cover + closing slides."""
    c.saveState()
    c.setFillColor(Color(color.red, color.green, color.blue, alpha=alpha))
    c.setStrokeColor(Color(0, 0, 0, 0))
    # top-left
    c.circle(MARGIN - 0.5 * inch, PAGE_H - MARGIN + 0.2 * inch, 1.6 * inch, stroke=0, fill=1)
    # bottom-right
    c.circle(PAGE_W - MARGIN + 0.6 * inch, MARGIN + 0.1 * inch, 1.4 * inch, stroke=0, fill=1)
    c.restoreState()


def wrap_text(c: canvas.Canvas, text: str, max_width: float, font: str, size: float):
    """Naive word-wrap that respects max_width. Returns list of lines."""
    words = text.split()
    lines: list[str] = []
    line: list[str] = []
    for w in words:
        trial = " ".join(line + [w])
        if c.stringWidth(trial, font, size) <= max_width:
            line.append(w)
        else:
            if line:
                lines.append(" ".join(line))
            line = [w]
    if line:
        lines.append(" ".join(line))
    return lines


def text_block(c: canvas.Canvas, x: float, y: float, text: str,
               max_width: float, font: str, size: float,
               color: Color = GRAY_700, leading_mult: float = 1.4) -> float:
    """Draw wrapped text starting at (x, y) and return the y after the block."""
    lines = wrap_text(c, text, max_width, font, size)
    leading = size * leading_mult
    c.setFillColor(color)
    c.setFont(font, size)
    cur_y = y
    for ln in lines:
        c.drawString(x, cur_y, ln)
        cur_y -= leading
    return cur_y


# ---------------------------------------------------------------------------
# Slides
# ---------------------------------------------------------------------------

def slide_01_cover(c: canvas.Canvas) -> None:
    """Slide 1 — Cover."""
    c.setFillColor(ORANGE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_corner_circles(c, ORANGE_LIGHT, alpha=0.35)

    cx = PAGE_W / 2

    # brand chip
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    brand = CONTENT["brand"]
    bw = c.stringWidth(brand, "Helvetica-Bold", 12)
    c.drawString(cx - bw / 2, PAGE_H - 1.7 * inch, brand)

    # main tagline (two lines, fixed Y positions so they don't collide with the subtitle)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 34)
    line1 = "Transformando la economía informal"
    line2 = "de Colombia en un ecosistema de datos."
    y_line1 = PAGE_H - 2.7 * inch
    y_line2 = y_line1 - 0.55 * inch
    for ln, yy in [(line1, y_line1), (line2, y_line2)]:
        lw = c.stringWidth(ln, "Helvetica-Bold", 34)
        c.drawString(cx - lw / 2, yy, ln)

    # subtitle — well below the tagline
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 16)
    sub = CONTENT["deck_title"]
    sw = c.stringWidth(sub, "Helvetica", 16)
    c.drawString(cx - sw / 2, y_line2 - 0.7 * inch, sub)

    # tagline at the bottom (over orange) — small, light tone, well below subtitle
    c.setFillColor(Color(1, 1, 1, 0.7))
    c.setFont("Helvetica", 9)
    c.drawCentredString(cx, MARGIN + 0.15 * inch, URL)


def slide_02_problem(c: canvas.Canvas) -> None:
    """Slide 2 — The problem."""
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    # eyebrow + title
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, PAGE_H - 1.2 * inch, "EL PROBLEMA")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, PAGE_H - 1.75 * inch, "Una economía entera, invisible para el mercado digital.")

    # big stat callout
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(MARGIN, PAGE_H - 2.6 * inch, "55,1%")
    c.setFillColor(GRAY_700)
    c.setFont("Helvetica", 12)
    c.drawString(2.0 * inch, PAGE_H - 2.55 * inch, "de la fuerza laboral colombiana")
    c.drawString(2.0 * inch, PAGE_H - 2.75 * inch, "opera en la informalidad.")

    # 3 consequences in columns
    cols = [
        ("Invisibilidad económica", "Sin métricas, sin acceso a crédito, sin datos."),
        ("Brecha de mercado", "Millones de micro-vendedores sin presencia digital."),
        ("Desperdicio publicitario", "Las marcas pierden un canal masivo de comunicación."),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 3
    col_y = PAGE_H - 3.6 * inch
    for i, (h, body) in enumerate(cols):
        x = MARGIN + i * col_w + 0.15 * inch
        # header
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x, col_y, h)
        # body
        text_block(c, x, col_y - 0.3 * inch, body, col_w - 0.3 * inch,
                   "Helvetica", 11, GRAY_700)

    draw_footer(c)


def slide_03_solution(c: canvas.Canvas) -> None:
    """Slide 3 — The solution: CalleViva pillars."""
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # orange bar on left
    c.setFillColor(ORANGE)
    c.rect(0, 0, 0.15 * inch, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.2 * inch, "LA SOLUCIÓN · CALLEVIVA")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.75 * inch,
                 "Infraestructura para el último kilómetro informal.")

    pillars = [
        ("Geolocalización en tiempo real",
         "Red de micro-logística que convierte carritos y puestos de calle en puntos de venta visibles y georreferenciados."),
        ("Monetización híbrida",
         "Venta directa + alquiler de espacio publicitario en el puesto. Doble fuente de ingresos desde un solo lugar."),
        ("Inteligencia de datos",
         "Transformamos la informalidad en un activo de información para desarrollo urbano y marketing hiper-local."),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 3
    y = PAGE_H - 3.0 * inch
    for i, (h, body) in enumerate(pillars):
        x = MARGIN + 0.1 * inch + i * col_w
        # numbered chip
        c.setFillColor(ORANGE)
        c.circle(x + 0.35 * inch, y - 0.2 * inch, 0.35 * inch, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(x + 0.35 * inch, y - 0.28 * inch, str(i + 1))
        # header
        c.setFillColor(GRAY_900)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x, y - 0.85 * inch, h)
        # body
        text_block(c, x, y - 1.2 * inch, body, col_w - 0.4 * inch,
                   "Helvetica", 11, GRAY_700)

    draw_footer(c)


def slide_04_market(c: canvas.Canvas) -> None:
    """Slide 4 — Market opportunity (dark slide)."""
    c.setFillColor(GRAY_900)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.rect(0, 0, 0.15 * inch, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.0 * inch, "MARKET OPPORTUNITY")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.5 * inch,
                 "Un mercado masivo, listo para digitalizarse.")

    # intro paragraph (FIX 5: fill the wasted vertical space)
    c.setFillColor(HexColor("#D1D5DB"))
    c.setFont("Helvetica", 12)
    intro_lines = wrap_text(
        c,
        "La informalidad en Colombia representa más de la mitad de la fuerza laboral y "
        "hasta el 83% en zonas rurales. No hay un actor dominante capturando este mercado — "
        "todos los datos están fuera del radar digital.",
        PAGE_W - 2 * MARGIN - 0.2 * inch, "Helvetica", 12,
    )
    y = PAGE_H - 2.2 * inch
    for ln in intro_lines:
        c.drawString(MARGIN + 0.1 * inch, y, ln)
        y -= 0.22 * inch

    # metric cards
    metrics = [
        ("13,2M", "Trabajadores informales", "en Colombia", "DANE 2026"),
        ("55,1%", "De la fuerza laboral", "nacional", "DANE 2026"),
        ("83%", "Informalidad en", "zonas rurales", "DANE 2026"),
    ]
    card_w = (PAGE_W - 2 * MARGIN) / 3 - 0.2 * inch
    card_h = 1.5 * inch
    card_y = PAGE_H - 4.2 * inch
    for i, (val, l1, l2, src) in enumerate(metrics):
        x = MARGIN + 0.1 * inch + i * (card_w + 0.3 * inch)
        c.setFillColor(HexColor("#1F2937"))
        c.roundRect(x, card_y - card_h, card_w, card_h, 10, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(x + card_w / 2, card_y - 0.7 * inch, val)
        c.setFillColor(WHITE)
        c.setFont("Helvetica", 11)
        c.drawCentredString(x + card_w / 2, card_y - 1.0 * inch, l1)
        c.drawCentredString(x + card_w / 2, card_y - 1.18 * inch, l2)
        c.setFillColor(GRAY_400)
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + card_w / 2, card_y - 1.4 * inch, src)

    # dark-slide footer (white tone)
    c.setFillColor(GRAY_400)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 0.55 * inch, CONTENT["footer_left"])
    c.drawRightString(PAGE_W - MARGIN, 0.55 * inch, CONTENT["footer_right"])
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(PAGE_W / 2, 0.35 * inch,
                        "Fuente: DANE — Departamento Administrativo Nacional de Estadística (Colombia, 2026).")


def slide_05_traction(c: canvas.Canvas) -> None:
    """Slide 5 — Traction / Status."""
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, PAGE_H - 1.2 * inch, "TRACTION · STATUS")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, PAGE_H - 1.75 * inch, "Dónde estamos hoy.")

    items = [
        ("Fase actual",
         "Desarrollo de WebApp MVP enfocada en validación de geolocalización y experiencia de vendedor."),
        ("Modelo de negocio",
         "Suscripciones B2B para vendedores y compradores con funciones extra de visibilidad, y red de publicidad hiper-local para marcas nacionales."),
        ("Visión estratégica",
         "Infraestructura escalable diseñada para expandirse de Bogotá a nivel nacional."),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 3
    y = PAGE_H - 2.8 * inch
    for i, (h, body) in enumerate(items):
        x = MARGIN + i * col_w + 0.15 * inch
        c.setFillColor(CREAM)
        c.roundRect(x, y - 1.4 * inch, col_w - 0.3 * inch, 1.4 * inch, 10, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.circle(x + 0.3 * inch, y - 0.25 * inch, 0.18 * inch, stroke=0, fill=1)
        c.setFillColor(GRAY_900)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 0.2 * inch, y - 0.55 * inch, h)
        text_block(c, x + 0.2 * inch, y - 0.85 * inch, body,
                   col_w - 0.6 * inch, "Helvetica", 10, GRAY_700)

    draw_footer(c)


def slide_06_business_model(c: canvas.Canvas) -> None:
    """Slide 6 — Business model."""
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.rect(0, 0, 0.15 * inch, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.2 * inch, "MODELO DE NEGOCIO")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.75 * inch,
                 "Dos fuentes de ingreso, una sola plataforma.")

    blocks = [
        ("1. Suscripciones B2B",
         "Vendedores y compradores con funciones extra: visibilidad destacada en el mapa, analytics, comunicación prioritaria y push notifications."),
        ("2. Red de publicidad hiper-local",
         "Las marcas nacionales pagan por aparecer en los puntos de venta con mayor tráfico de su categoría. Los vendedores reciben ingresos pasivos por alquilar su espacio."),
    ]
    y = PAGE_H - 2.9 * inch
    for i, (h, body) in enumerate(blocks):
        yy = y - i * 1.4 * inch
        c.setFillColor(WHITE)
        c.roundRect(MARGIN + 0.1 * inch, yy - 1.1 * inch, PAGE_W - 2 * MARGIN - 0.2 * inch,
                    1.1 * inch, 10, stroke=0, fill=1)
        c.setFillColor(GRAY_900)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(MARGIN + 0.4 * inch, yy - 0.3 * inch, h)
        text_block(c, MARGIN + 0.4 * inch, yy - 0.6 * inch, body,
                   PAGE_W - 2 * MARGIN - 0.8 * inch, "Helvetica", 11, GRAY_700)

    # flywheel takeaway
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-BoldOblique", 11)
    c.drawCentredString(PAGE_W / 2, 0.85 * inch,
                        "Efecto de red: más vendedores atraen más compradores, que atraen más marcas — flywheel virtuoso.")

    draw_footer(c)


def slide_07_product(c: canvas.Canvas) -> None:
    """Slide 7 — Product (today + next)."""
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, PAGE_H - 1.2 * inch, "PRODUCTO")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, PAGE_H - 1.75 * inch, "WebApp MVP en validación.")

    today = [
        "Mapa en vivo con geolocalización de vendedores activos.",
        "Perfiles con foto, categoría, reseñas y horarios.",
        "Sistema de favoritos y notificaciones push.",
        "Panel de vendedor: actualizar ubicación, foto, estado.",
        "Suscripciones B2B y sponsorships hiper-locales.",
    ]
    next_ = [
        "Pedidos y pagos in-app (Wompi).",
        "Onboarding gamificado para reducir fricción.",
        "Analytics para vendedores y para marcas.",
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 2 - 0.3 * inch
    y = PAGE_H - 2.7 * inch

    # Hoy column
    c.setFillColor(CREAM)
    c.roundRect(MARGIN, y - 2.3 * inch, col_w, 2.3 * inch, 10, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(MARGIN + 0.25 * inch, y - 0.3 * inch, "HOY")
    ty = y - 0.7 * inch
    for it in today:
        c.setFillColor(ORANGE)
        c.circle(MARGIN + 0.35 * inch, ty + 0.07 * inch, 0.06 * inch, stroke=0, fill=1)
        c.setFillColor(GRAY_700)
        c.setFont("Helvetica", 11)
        c.drawString(MARGIN + 0.55 * inch, ty, it)
        ty -= 0.3 * inch

    # Próximamente column
    nx = MARGIN + col_w + 0.6 * inch
    c.setFillColor(ORANGE_LIGHT)
    c.roundRect(nx, y - 2.3 * inch, col_w, 2.3 * inch, 10, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(nx + 0.25 * inch, y - 0.3 * inch, "PRÓXIMAMENTE")
    ty = y - 0.7 * inch
    for it in next_:
        c.setFillColor(ORANGE)
        c.circle(nx + 0.35 * inch, ty + 0.07 * inch, 0.06 * inch, stroke=0, fill=1)
        c.setFillColor(GRAY_700)
        c.setFont("Helvetica", 11)
        c.drawString(nx + 0.55 * inch, ty, it)
        ty -= 0.4 * inch

    draw_footer(c)


def slide_08_advantage(c: canvas.Canvas) -> None:
    """Slide 8 — Why now / why us."""
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.rect(0, 0, 0.15 * inch, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.2 * inch, "VENTAJA COMPETITIVA")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.75 * inch,
                 "Por qué ahora y por qué nosotros.")

    cols = [
        ("Timing", [
            "La informalidad migra a smartphones.",
            "El COVID aceleró la adopción digital.",
            "Aún no hay un actor dominante.",
        ]),
        ("Defensibilidad", [
            "Datos de geolocalización únicos.",
            "Red de vendedores = switching cost.",
            "Partnerships con alcaldías locales.",
        ]),
        ("Equipo", [
            "Founder técnico full-stack.",
            "Track record en automatización.",
            "Visión: tecnología para la base.",
        ]),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 3
    y = PAGE_H - 2.8 * inch
    for i, (h, items) in enumerate(cols):
        x = MARGIN + 0.1 * inch + i * col_w
        c.setFillColor(WHITE)
        c.roundRect(x, y - 2.2 * inch, col_w - 0.3 * inch, 2.2 * inch, 10, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(x + 0.25 * inch, y - 0.4 * inch, h)
        ty = y - 0.85 * inch
        for it in items:
            if not it:
                ty -= 0.1 * inch
                continue
            c.setFillColor(ORANGE)
            c.circle(x + 0.35 * inch, ty + 0.07 * inch, 0.05 * inch, stroke=0, fill=1)
            c.setFillColor(GRAY_700)
            c.setFont("Helvetica", 11)
            c.drawString(x + 0.55 * inch, ty, it)
            ty -= 0.32 * inch

    draw_footer(c)


def slide_09_roadmap(c: canvas.Canvas) -> None:
    """Slide 9 — 18-month roadmap (timeline)."""
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, PAGE_H - 1.2 * inch, "ROADMAP")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN, PAGE_H - 1.75 * inch, "De Bogotá a toda Colombia en 18 meses.")

    milestones = [
        ("Q3 2026", "MVP cerrado", "Lanzamiento WebApp con mapa y registro de vendedores."),
        ("Q4 2026", "Pagos y sponsorships", "Integración Wompi para suscripciones B2B y marketplace de publicidad hiper-local para marcas."),
        ("Q1 2027", "Expansión regional", "Onboarding de vendedores en 5 ciudades principales + partnerships con alcaldías."),
        ("Q2 2027", "Nacional", "Cobertura en 20+ ciudades + equipo comercial para marcas nacionales."),
    ]
    n = len(milestones)
    col_w = (PAGE_W - 2 * MARGIN) / n - 0.2 * inch
    line_y = PAGE_H - 3.0 * inch          # where the orange line runs
    label_y = PAGE_H - 2.55 * inch        # where the quarter pill sits (above line)
    title_y = PAGE_H - 3.35 * inch        # where the milestone title sits (just below line)
    body_y  = PAGE_H - 3.85 * inch        # where the description starts

    # Horizontal timeline bar (drawn FIRST so dots + text sit on top).
    c.setStrokeColor(ORANGE)
    c.setLineWidth(3)
    c.line(MARGIN + 0.5 * inch, line_y, PAGE_W - MARGIN - 0.5 * inch, line_y)

    for i, (q, h, body) in enumerate(milestones):
        cx_milestone = MARGIN + 0.5 * inch + i * (col_w + 0.2 * inch) + col_w / 2

        # quarter pill above the line
        c.setFillColor(CREAM)
        c.roundRect(cx_milestone - col_w / 2, label_y, col_w, 0.35 * inch, 5, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(cx_milestone, label_y + 0.12 * inch, q)

        # dot ON the line (white-rimmed so it pops)
        c.setFillColor(WHITE)
        c.circle(cx_milestone, line_y, 0.16 * inch, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.circle(cx_milestone, line_y, 0.10 * inch, stroke=0, fill=1)

        # milestone title below the line
        c.setFillColor(GRAY_900)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(cx_milestone, title_y, h)

        # description
        text_block(c,
                   cx_milestone - col_w / 2, body_y,
                   body,
                   col_w + 0.05 * inch,
                   "Helvetica", 9.5, GRAY_700, leading_mult=1.4)

    draw_footer(c)


def slide_10_ask(c: canvas.Canvas) -> None:
    """Slide 10 — The ask + milestones."""
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN, PAGE_H - 1.2 * inch, "ASK")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(MARGIN, PAGE_H - 1.85 * inch, "Buscando $300K USD seed.")
    c.setFillColor(GRAY_700)
    c.setFont("Helvetica", 12)
    c.drawString(MARGIN, PAGE_H - 2.2 * inch, "Uso de fondos:")

    use = [
        ("50%", "Equipo — 2 ingenieros full-time + 1 comercial."),
        ("25%", "Producto — completar MVP, pagos y analytics."),
        ("15%", "Adquisición — marketing local, referidos y alianzas."),
        ("10%", "Operaciones — legal, contabilidad e infraestructura."),
    ]
    col_w = (PAGE_W - 2 * MARGIN) / 2 - 0.2 * inch
    y = PAGE_H - 2.65 * inch
    # Left column — use of funds
    c.setFillColor(CREAM)
    c.roundRect(MARGIN, y - 2.0 * inch, col_w, 2.0 * inch, 10, stroke=0, fill=1)
    ty = y - 0.45 * inch
    for pct, desc in use:
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(MARGIN + 0.25 * inch, ty, pct)
        c.setFillColor(GRAY_700)
        c.setFont("Helvetica", 11)
        c.drawString(MARGIN + 0.95 * inch, ty + 0.02 * inch, desc)
        ty -= 0.4 * inch

    # Right column — milestones
    rx = MARGIN + col_w + 0.4 * inch
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(rx, y - 0.05 * inch, "Hitos en 12 meses")
    hits = [
        "1.000 vendedores activos en Bogotá",
        "50 marcas usando la red publicitaria",
        "10.000 compradores recurrentes",
        "MRR de $5K USD",
    ]
    ty = y - 0.5 * inch
    for h in hits:
        c.setFillColor(ORANGE)
        c.circle(rx + 0.15 * inch, ty + 0.08 * inch, 0.08 * inch, stroke=0, fill=1)
        c.setFillColor(GRAY_900)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(rx + 0.4 * inch, ty, h)
        ty -= 0.4 * inch

    draw_footer(c)


def slide_11_team(c: canvas.Canvas) -> None:
    """Slide 11 — Team (FIX 2: real photo, FIX 3: bio fits the card)."""
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(ORANGE)
    c.rect(0, 0, 0.15 * inch, PAGE_H, stroke=0, fill=1)

    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.2 * inch, "EQUIPO")

    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(MARGIN + 0.1 * inch, PAGE_H - 1.75 * inch, "Quién está detrás")

    # White card — sized to fit photo + name + role + bio with breathing room.
    card_w = 3.8 * inch
    card_h = 3.5 * inch
    card_x = (PAGE_W - card_w) / 2
    card_y = PAGE_H - 2.0 * inch - card_h
    c.setFillColor(WHITE)
    c.roundRect(card_x, card_y, card_w, card_h, 14, stroke=0, fill=1)

    # Photo (FIX 2) — circular clipped
    photo_d = 1.5 * inch
    photo_cx = card_x + card_w / 2
    photo_cy = card_y + card_h - photo_d / 2 - 0.3 * inch
    if AVATAR.exists():
        # Build a circular clip path, then draw image into it
        p = c.beginPath()
        p.circle(photo_cx, photo_cy, photo_d / 2)
        c.saveState()
        c.clipPath(p, stroke=0, fill=0)
        c.drawImage(str(AVATAR),
                    photo_cx - photo_d / 2, photo_cy - photo_d / 2,
                    width=photo_d, height=photo_d,
                    preserveAspectRatio=True, mask='auto')
        c.restoreState()  # drop the clip
        # ring around photo
        c.setStrokeColor(ORANGE)
        c.setLineWidth(3)
        c.circle(photo_cx, photo_cy, photo_d / 2 + 2, stroke=1, fill=0)
    else:
        # Defensive fallback (shouldn't hit) — initials.
        c.setFillColor(ORANGE_LIGHT)
        c.circle(photo_cx, photo_cy, photo_d / 2, stroke=0, fill=1)
        c.setFillColor(ORANGE)
        c.setFont("Helvetica-Bold", 48)
        c.drawCentredString(photo_cx, photo_cy - 0.2 * inch, "AM")

    # Name
    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(card_x + card_w / 2, card_y + 1.3 * inch, "Andrés Morales")
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(card_x + card_w / 2, card_y + 1.05 * inch, "FUNDADOR Y CEO")

    # Bio (FIX 3 — anchored near the bottom of the card; smaller font + tighter
    # line-height so the wrapped text always fits).
    bio = ("Arquitecto de soluciones tecnológicas enfocado en automatización "
           "y escalabilidad. Conecto tecnología real con necesidades reales "
           "para transformar la base de la pirámide.")
    bio_size = 9.5
    bio_leading = 13
    lines = wrap_text(c, bio, card_w - 0.6 * inch, "Helvetica", bio_size)
    # Last line sits ~0.3in above the card's bottom; first line is computed
    # backwards so the block reads top-down with breathing room under the role.
    last_y = card_y + 0.35 * inch
    first_y = last_y + (len(lines) - 1) * bio_leading
    c.setFillColor(GRAY_700)
    c.setFont("Helvetica", bio_size)
    for i, ln in enumerate(lines):
        c.drawCentredString(card_x + card_w / 2, first_y - i * bio_leading, ln)

    draw_footer(c)


def slide_12_contact(c: canvas.Canvas) -> None:
    """Slide 12 — Contact / Let's talk (FIX 4: barriotech email)."""
    c.setFillColor(ORANGE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    draw_corner_circles(c, ORANGE_LIGHT, alpha=0.35)

    cx = PAGE_W / 2
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 44)
    title = "Conversemos."
    tw = c.stringWidth(title, "Helvetica-Bold", 44)
    c.drawString(cx - tw / 2, PAGE_H - 2.0 * inch, title)

    c.setFont("Helvetica", 16)
    sub = "Estamos buscando inversores y aliados estratégicos para escalar."
    sw = c.stringWidth(sub, "Helvetica", 16)
    c.drawString(cx - sw / 2, PAGE_H - 2.6 * inch, sub)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    email = CONTENT["contact_email"]
    ew = c.stringWidth(email, "Helvetica-Bold", 22)
    c.drawString(cx - ew / 2, PAGE_H - 3.4 * inch, email)

    c.setFont("Helvetica", 14)
    url = URL
    uw = c.stringWidth(url, "Helvetica", 14)
    c.drawString(cx - uw / 2, PAGE_H - 3.85 * inch, url)

    c.setFont("Helvetica", 11)
    sig = "Andrés Morales · Fundador y CEO"
    sgw = c.stringWidth(sig, "Helvetica", 11)
    c.drawString(cx - sgw / 2, PAGE_H - 4.4 * inch, sig)

    # tiny credit
    c.setFillColor(Color(1, 1, 1, 0.55))
    c.setFont("Helvetica", 8)
    c.drawCentredString(cx, MARGIN + 0.05 * inch,
                        f"{CONTENT['footer_left']} · {URL}")


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

SLIDES = [
    slide_01_cover,
    slide_02_problem,
    slide_03_solution,
    slide_04_market,
    slide_05_traction,
    slide_06_business_model,
    slide_07_product,
    slide_08_advantage,
    slide_09_roadmap,
    slide_10_ask,
    slide_11_team,
    slide_12_contact,
]


def build(out_path: Path = OUT_PDF) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(out_path), pagesize=landscape(letter))
    c.setTitle("CalleViva — Pitch Deck 2026")
    c.setAuthor("BarrioTech / Hermes Agent")
    c.setSubject("Pitch deck — seed round")

    for slide in SLIDES:
        slide(c)
        c.showPage()

    c.save()
    return out_path


if __name__ == "__main__":
    out = build()
    print(f"✅ wrote {out} ({out.stat().st_size:,} bytes, {len(SLIDES)} slides)")
    sys.exit(0)
