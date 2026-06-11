import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Gentle "fade + rise" reveal for every [data-reveal] element as it scrolls into
 * view. Elements sharing a [data-reveal-group] parent stagger in together.
 * Respects prefers-reduced-motion (handled in CSS; we simply skip animating).
 */
export default function useReveal() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const ctx = gsap.context(() => {
      // grouped staggers
      gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-reveal]')
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: group, start: 'top 82%' },
        })
      })

      // standalone reveals (not inside a group)
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        if (el.closest('[data-reveal-group]')) return
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%' },
        })
      })

      ScrollTrigger.refresh()
    })

    return () => ctx.revert()
  }, [])
}
