import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FlaskConical, History, Search, Scale, FileText, Database } from 'lucide-react'

/* ══ Magnifying Dock ══════════════════════════════════════════════════════
   Adapted from Bencho's "Magnifying dock" (MIT — bencho.dev/licence). The
   gesture and spring code below is theirs, kept close to the original;
   what changed is the data it drives (five generic buttons became this
   site's six routes, wired to react-router) and the labelling: Bencho's
   own version named the icon in a travelling tooltip that only appeared
   on hover, but this dock IS the primary navigation, and primary nav
   wants its labels visible without asking — so each icon now carries a
   small permanent label instead, and the tooltip is gone (it would just
   be repeating, on hover, the word already sitting under the icon). See
   THIRD_PARTY_NOTICES.md.
   ═══════════════════════════════════════════════════════════════════════ */

type Item = { key: string; label: string; to: string; end?: boolean; Icon: typeof FlaskConical }

const DOCK: Item[] = [
  { key: 'labs', label: 'Laboratorios', to: '/', end: true, Icon: FlaskConical },
  { key: 'timeline', label: 'Cronología', to: '/timeline', Icon: History },
  { key: 'browse', label: 'Explorar', to: '/browse', Icon: Search },
  { key: 'weight', label: 'Peso', to: '/weight', Icon: Scale },
  { key: 'report', label: 'Reportes', to: '/report', Icon: FileText },
  { key: 'data', label: 'Datos', to: '/crear', Icon: Database },
]

const isRouteActive = (pathname: string, item: Item) =>
  item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)

/* ══ dock, distance based magnification ═══════════════════
   Scale falls off with distance from the cursor rather than
   applying only to the hovered item, which is what stops it
   reading as a row of buttons that happen to grow. */

export function MagnifyingDock({
  /* what the glyph under the cursor grows to */
  magnify = 1.32,
  /* how many neighbours either side feel it. This is the knob
     that decides whether the dock reads as a row of buttons
     that happen to grow or as a sheet being pushed up from
     underneath — at 0 it is the former, and no amount of
     magnification rescues it. */
  spread = 2,
  /* how far the nearest glyph rises out of the bar. Bencho's
     default was 8, tuned for a floating dock with open space
     above it; in this header the dock has a drawn border on all
     sides, so a glyph rising too far reads as escaping the bar
     rather than lifting off it. 5 is what dock.css's top padding
     is actually sized to contain — see the note there. */
  lift = 5,
  /* whether each icon carries its own label underneath it.
     Off collapses the dock back to icon-only, for a narrow
     viewport — see the media query in dock.css. */
  labels = true,
}: {
  magnify?: number
  spread?: number
  lift?: number
  labels?: boolean
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeIndex = DOCK.findIndex((item) => isRouteActive(location.pathname, item))
  const active = DOCK[activeIndex >= 0 ? activeIndex : 0].key

  const [hover, setHover] = useState<number | null>(null)

  /* ── THE BAR READS THE POINTER, THE ITEMS DO NOT ─────────
     Each item used to carry its own onMouseEnter, which fails
     on a touch screen twice over. A mouse event is the smaller
     half of it — the real problem is that a touch is captured
     to whatever it started on, so sliding a finger along the
     dock keeps sending every event to the first icon you
     landed on and nothing else ever learns the finger arrived.

     One handler on the bar, and the index comes from where the
     pointer is: the nearest item centre to the pointer's x.
     Measured rather than derived from the index, because the
     items are not all the same width once one of them is
     magnified — the geometry moves as you sweep, which is
     exactly what makes a dock a dock, and an arithmetic guess
     would lag it. */
  const bar = useRef<HTMLElement | null>(null)
  const down = useRef(false)
  /* set when a finger has already chosen on lift, so the click
     the browser sends afterwards — aimed at whichever item the
     touch STARTED on, which is not the one it ended over — does
     not undo the choice. A mouse never sets it. */
  const chose = useRef(false)

  const at = (clientX: number) => {
    const items = bar.current?.querySelectorAll('.gdock-item')
    if (!items?.length) return null
    let best = 0
    let gap = Infinity
    items.forEach((el, i) => {
      const b = el.getBoundingClientRect()
      const d = Math.abs(clientX - (b.left + b.width / 2))
      if (d < gap) { gap = d; best = i }
    })
    return best
  }

  /* Crossing onto a glyph, not hovering one: the house sound
     system (lib/sounds, bound via data-cuelume-hover) plays the
     quiet tick — pitched by nothing fancier than which button
     fired the pointerover, which is already "crossing", not
     "hovering on every pixel". Nothing to wire here. */
  const to = (i: number | null) => setHover(i)

  const track = (e: React.PointerEvent) => {
    /* a mouse magnifies on hover, the way it always did; a
       finger has to be down, or the bar would answer a scroll
       passing over it */
    if (e.pointerType !== 'mouse' && !down.current) return
    to(at(e.clientX))
  }

  return (
    <nav
      className="gdock"
      aria-label="Navegación principal"
      ref={bar}
      /* ── CAPTURE PHASE, and no pointer capture ───────────
         Two different things with confusingly similar names.

         The phase is capture because each item stops
         pointerdown propagating — it has to, or the wall card
         behind it treats a press on the dock as a press on the
         card. Bubbling handlers here never ran: measured, the
         magnification sat on item 0 through a full sweep.
         Capture runs top-down, before the child can stop it.

         What this does NOT do is call setPointerCapture. The
         touch is already captured to the item it began on
         whether we ask or not, and those events reach here
         with their real coordinates, which is all this needs.
         Capturing on the bar as well would retarget the click
         and take it from the item — breaking the mouse to fix
         the finger. */
      onPointerDownCapture={(e) => {
        down.current = true
        /* ── disarmed HERE, not by the click ────────────────
           `chose` used to be cleared by the click it was meant
           to swallow, which assumes a click always follows a
           touch. It does not: a finger that lands on one item
           and lifts over another is a drag, and a browser is
           entitled to send no click at all. Measured — the flag
           stayed armed and ate the next real mouse click, so
           the dock ignored the first thing you pressed after
           any touch sweep. Cleared at the start of the next
           gesture instead, which is true whatever the browser
           decided to do with the last one. */
        chose.current = false
        to(at(e.clientX))
      }}
      onPointerMoveCapture={track}
      /* ── and the touch has to CHOOSE something ────────────
         With the bar holding the capture the button underneath
         never gets its click, so the lift is where a finger
         picks: whichever item it came to rest over. A mouse is
         untouched by this — it still clicks the button. */
      onPointerUpCapture={(e) => {
        if (down.current && e.pointerType !== 'mouse') {
          const i = at(e.clientX)
          if (i !== null) {
            chose.current = true
            if (DOCK[i].key !== active) navigate(DOCK[i].to)
          }
        }
        down.current = false
        if (e.pointerType !== 'mouse') to(null)
      }}
      onPointerCancelCapture={() => { down.current = false; to(null) }}
      onPointerLeave={() => { if (!down.current) to(null) }}
    >
      {DOCK.map(({ key, label, to: path, Icon }, i) => {
        const d = hover === null ? 99 : Math.abs(i - hover)
        /* A raised cosine over the reach, rather than the three
           hand-picked steps this used to carry. Those could not
           be made adjustable without also picking every
           intermediate value by hand, and a curve is what the
           effect was always imitating: 1 under the cursor,
           easing to 0 at the edge of the reach, and flat zero
           past it. */
        const f = d > spread ? 0 : (1 + Math.cos((Math.PI * d) / (spread + 1))) / 2
        const scale = 1 + (magnify - 1) * f
        return (
          <button
            key={key}
            type="button"
            className="gdock-item"
            aria-label={label}
            aria-current={active === key ? 'page' : undefined}
            data-near={d <= 1 ? d : undefined}
            data-active={active === key}
            data-cuelume-hover="tick"
            data-cuelume-toggle="page"
            onClick={() => {
              /* the lift already chose — see `chose` */
              if (chose.current) return
              if (key !== active) navigate(path)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* the glyph magnifies, not the button — scaling the
                whole item dragged the label along with it, which
                looked like the WORD was being magnified rather
                than the icon above it */}
            <span
              className="gdock-glyph"
              style={{ transform: `translateY(${-lift * f}px) scale(${scale})` }}
            >
              <Icon size={20} strokeWidth={2} />
            </span>
            {labels && <span className="gdock-label">{label}</span>}
          </button>
        )
      })}
    </nav>
  )
}

export default MagnifyingDock
