import { useEffect, useRef } from 'react'
import { heroMetrics } from '../lib/heroMetrics'

/**
 * Bottom-right instrument read-out. Reads the shared heroMetrics object on its
 * own rAF (no React re-render at 60fps) and writes the numbers to the DOM.
 */
export default function MeasurementPanel() {
  const gen = useRef<HTMLSpanElement>(null)
  const alive = useRef<HTMLSpanElement>(null)
  const dist = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (gen.current) gen.current.textContent = String(heroMetrics.generation).padStart(2, '0')
      if (alive.current) alive.current.textContent = String(heroMetrics.alive).padStart(2, '0')
      if (dist.current) dist.current.textContent = heroMetrics.distance.toFixed(2) + 'm'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="panel mono" aria-hidden="true">
      <div className="panel__title">EVO·WALKER / LIVE</div>
      <div className="panel__row">
        <span className="panel__key">GENERATION</span>
        <span className="panel__val" ref={gen}>
          01
        </span>
      </div>
      <div className="panel__row">
        <span className="panel__key">生存数 ALIVE</span>
        <span className="panel__val" ref={alive}>
          00
        </span>
      </div>
      <div className="panel__row">
        <span className="panel__key">最高到達距離</span>
        <span className="panel__val" ref={dist}>
          0.00m
        </span>
      </div>
    </div>
  )
}
