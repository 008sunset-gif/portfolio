import { useEffect, useRef } from 'react'
import { EvoWalkerSim } from '../lib/evoWalker'

/**
 * Hosts the EvoWalker Canvas 2D simulation. Renders with requestAnimationFrame,
 * pauses when scrolled out of view (IntersectionObserver) to spare the CPU, and
 * falls back to a single pre-evolved still frame under prefers-reduced-motion.
 */
export default function EvoWalkerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const genLabelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sim = new EvoWalkerSim({ population: 8, genDurationSec: 6 })

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      const parent = canvas.parentElement!
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sim.resize(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    const setLabel = () => {
      if (genLabelRef.current) {
        genLabelRef.current.textContent = `Generation: ${sim.generation}`
      }
    }

    // Reduced motion: evolve a handful of generations off-screen, draw one
    // clean still frame, and stop. No animation loop.
    if (reduce) {
      // evolve a few generations (so the gait looks learned), but stop
      // mid-generation so the frozen frame shows walkers mid-stride.
      sim.warm(60 * 20) // ~3.3 generations
      sim.draw(ctx)
      setLabel()
      return () => ro.disconnect()
    }

    let raf = 0
    let last = performance.now()
    let visible = true

    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (visible) {
        sim.update(dt)
        sim.draw(ctx)
        setLabel()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // pause when the hero is off-screen
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
        last = performance.now() // avoid a huge dt on resume
      },
      { threshold: 0.01 }
    )
    io.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) {
        visible = false
      } else {
        visible = true
        last = performance.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="evo">
      <canvas ref={canvasRef} className="evo__canvas" aria-hidden="true" />
      <span ref={genLabelRef} className="evo__gen mono">
        Generation: 1
      </span>
    </div>
  )
}
