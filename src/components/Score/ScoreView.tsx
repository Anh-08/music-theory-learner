import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useT } from '../../i18n/useT'
import { keySignature } from '../../theory/keys'
import { measureFill, scoreKey, scoreTuning, type Score } from '../../theory/score'
import type { Cursor, EventRef } from '../../theory/scoreEdit'
import { cursorBox, hitTest, layoutScore, type Hit, type ScoreGeometry, type ScoreViewMode } from '../../theory/scoreLayout'
import { drawScore, type Vex } from './drawScore'
import { loadVex } from './loadVex'

/** Extra text under an event (learning overlay: degrees, intervals…). */
export interface ScoreLabel {
  measure: number
  event: number
  text: string
  className?: string
}

export interface ScoreViewProps {
  score: Score
  view: ScoreViewMode
  cursor?: Cursor | null
  selection?: EventRef[]
  playing?: EventRef | null
  labels?: ScoreLabel[]
  onPick?: (hit: Hit, e: MouseEvent) => void
}

/** A score drawn with VexFlow, with the cursor, selection and playback position drawn on top. */
export function ScoreView({ score, view, cursor, selection, playing, labels, onPick }: ScoreViewProps) {
  const { t } = useT()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [vex, setVex] = useState<Vex | null>(null)
  const [failed, setFailed] = useState(false)
  const [geo, setGeo] = useState<ScoreGeometry | null>(null)

  useEffect(() => {
    let alive = true
    loadVex().then(
      (v) => alive && setVex(() => v),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const strings = scoreTuning(score).strings.length
  const keyAcc = useMemo(() => {
    const sig = keySignature(scoreKey(score))
    return sig.sharps.length + sig.flats.length
  }, [score])
  const layout = useMemo(() => (width > 0 ? layoutScore(score, { width, view, strings, keyAccidentals: keyAcc }) : null), [score, width, view, strings, keyAcc])

  useLayoutEffect(() => {
    if (!vex || !layout || !canvas.current) return
    try {
      setGeo(drawScore(vex, canvas.current, score, layout, { view }))
    } catch (err) {
      console.error('Score drawing failed', err)
    }
  }, [vex, layout, score, view])

  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (!geo || !onPick) return
    const r = e.currentTarget.getBoundingClientRect()
    const hit = hitTest(geo, e.clientX - r.left, e.clientY - r.top)
    if (hit) onPick(hit, e)
  }

  const cur = geo && cursor ? cursorBox(geo, cursor.measure, cursor.event, cursor.string) : null
  const play = geo && playing ? cursorBox(geo, playing.measure, playing.event, 1) : null
  const playBox = useRef<HTMLDivElement>(null)
  const playTop = play?.top
  // Keep the line being played in view.
  useEffect(() => {
    playBox.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [playTop])
  const overBars = geo ? geo.measures.filter((m) => score.measures[m.index] && measureFill(score.measures[m.index], score.timeSig) === 'over') : []

  return (
    <div ref={wrap} className="relative w-full">
      {failed && <p className="p-4 text-sm text-red-600 dark:text-red-400">{t('sheet.loadError')}</p>}
      {!vex && !failed && <p className="p-4 text-sm text-stone-500">{t('sheet.loading')}</p>}
      <div className="relative cursor-text" onClick={click} data-testid="score-canvas">
        <div ref={canvas} className="text-stone-900 dark:[filter:invert(1)_hue-rotate(180deg)]" />
        {geo && (
          <div className="pointer-events-none absolute inset-0">
            {overBars.map((m) => {
              const sys = geo.systems[m.system]
              return (
                <div
                  key={`over-${m.index}`}
                  title={t('sheet.overFull')}
                  className="absolute rounded bg-red-500/10 ring-1 ring-red-500/50"
                  style={{ left: m.x, top: sys.top + 20, width: m.width, height: sys.bottom - sys.top - 24 }}
                />
              )
            })}
            {selection?.map((ref) => {
              const b = cursorBox(geo, ref.measure, ref.event, 1)
              return b ? <div key={`sel-${ref.measure}-${ref.event}`} className="absolute rounded bg-sky-400/20" style={{ left: b.x - 12, top: b.top + 24, width: 24, height: b.bottom - b.top - 30 }} /> : null
            })}
            {play && <div ref={playBox} className="absolute rounded bg-amber-400/30" style={{ left: play.x - 13, top: play.top + 20, width: 26, height: play.bottom - play.top - 24 }} />}
            {cur && (
              <>
                <div className="absolute w-0.5 bg-sky-500" style={{ left: cur.x - 1, top: cur.top + 24, height: cur.bottom - cur.top - 30 }} />
                {cur.stringY !== undefined && <div className="absolute rounded-sm border-2 border-sky-500" style={{ left: cur.x - 9, top: cur.stringY - 8, width: 18, height: 16 }} />}
              </>
            )}
            {labels?.map((l, i) => {
              const b = cursorBox(geo, l.measure, l.event, 1)
              if (!b) return null
              return (
                <span key={i} className={`absolute -translate-x-1/2 text-[11px] font-semibold leading-none ${l.className ?? 'text-stone-500'}`} style={{ left: b.x, top: b.bottom - 14 }}>
                  {l.text}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
