import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * Instrument-style boot sequence: the ring/logo draws in, the name resolves and
 * a 00→100 counter runs, then the panel lifts to reveal the hero — matching the
 * A brief loading sequence before the hero reveals. Respects reduced motion (snaps through quickly).
 */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.body.classList.add('is-loading')
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis
    lenis?.stop?.()

    const counter = { v: 0 }
    const len = ring.current?.getTotalLength?.() ?? 300
    gsap.set(ring.current, { strokeDasharray: len, strokeDashoffset: len })

    const tl = gsap.timeline()
    tl.to(ring.current, { strokeDashoffset: 0, duration: reduce ? 0.2 : 1.5, ease: 'power2.inOut' }, 0)
      .to(
        counter,
        {
          v: 100,
          duration: reduce ? 0.3 : 2,
          ease: 'power2.inOut',
          onUpdate: () => setCount(Math.round(counter.v)),
        },
        0
      )
      .to('.preloader__inner', { opacity: 0, y: -16, duration: 0.5, ease: 'power2.in' }, '+=0.12')
      .to('.preloader', { yPercent: -100, duration: reduce ? 0.25 : 0.9, ease: 'expo.inOut' }, '<0.1')
      .add(() => {
        document.body.classList.remove('is-loading')
        lenis?.start?.()
        onDone()
      })
      .set(root.current, { display: 'none' })

    return () => {
      tl.kill()
      document.body.classList.remove('is-loading')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="preloader" ref={root}>
      <div className="preloader__inner">
        <svg className="preloader__logo" viewBox="0 0 120 120" width="92" height="92">
          <circle
            ref={ring}
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#5eead4"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="60" cy="60" r="4" fill="#5eead4" />
        </svg>
        <div className="preloader__meta mono">
          <span className="preloader__name">大場 祐飛 / Yuhi Oba</span>
          <span className="preloader__count">{String(count).padStart(3, '0')}</span>
          <span className="preloader__label">LOADING PORTFOLIO</span>
        </div>
      </div>
    </div>
  )
}
