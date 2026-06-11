import { useMemo } from 'react'

export type DeviceTier = {
  webgl: boolean // WebGL available at all
  mode: '3d' | '2d' // chosen hero renderer
  population: number // robot count
  dpr: [number, number]
  fx: boolean // post-processing on/off
  reduce: boolean // prefers-reduced-motion
  mobile: boolean
}

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

/**
 * Picks the hero renderer and its budget from the device, so the experience
 * degrades gracefully instead of breaking:
 *   - no WebGL            -> Canvas 2D fallback sim
 *   - reduced motion      -> static, no orbit / generation animation
 *   - low memory / mobile -> fewer robots, lower DPR, FX off
 */
export default function useDeviceTier(): DeviceTier {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { webgl: true, mode: '3d', population: 8, dpr: [1, 2], fx: true, reduce: false, mobile: false }
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const webgl = hasWebGL()
    const w = window.innerWidth
    const cores = navigator.hardwareConcurrency || 4
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const mobile = w < 768 || /Mobi|Android/i.test(navigator.userAgent)
    const lowEnd = cores <= 4 || mem <= 4

    if (!webgl) {
      return { webgl: false, mode: '2d', population: 8, dpr: [1, 1.5], fx: false, reduce, mobile }
    }

    let population = 8
    if (mobile) population = 5
    else if (lowEnd) population = 6
    else if (cores >= 8 && mem >= 8) population = 9

    return {
      webgl: true,
      mode: '3d',
      population,
      dpr: mobile ? [1, 1.5] : [1, 2],
      fx: !mobile && !lowEnd, // keep FX for capable machines; still tasteful
      reduce,
      mobile,
    }
  }, [])
}
