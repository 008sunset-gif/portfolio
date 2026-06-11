// Shared metrics written by the 3D scene each frame and read by the DOM
// measurement panel via its own rAF — avoids React re-renders at 60fps.
export const heroMetrics = {
  generation: 1,
  alive: 0,
  distance: 0,
}

// Shared, normalised pointer (-1..1) for camera parallax.
export const heroPointer = { x: 0, y: 0 }

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      heroPointer.x = (e.clientX / window.innerWidth) * 2 - 1
      heroPointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    },
    { passive: true }
  )
}
