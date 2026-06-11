import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import YubatakeScene from '../three/YubatakeScene'
import YubatakeFallback from './YubatakeFallback'
import Preloader from './Preloader'
import useDeviceTier from '../hooks/useDeviceTier'

// FIG.00 = 「誰か」だけを示す。何をする人かは ABOUT(FIG.01) に書く。
const PROFILE: { key: string; val: string }[] = [
  { key: '所属', val: '東京電機大学大学院 システムデザイン工学研究科 デザイン工学専攻' },
  { key: '出身', val: '群馬県草津町' },
  { key: '専門', val: '個人アプリ開発' },
]

export default function Hero() {
  const tier = useDeviceTier()
  const [loaded, setLoaded] = useState(false)
  const profileRef = useRef<HTMLDListElement>(null)

  // プロフィール各行を順にフェードイン（プリローダー解除と同時）。reduced-motion は即表示。
  useEffect(() => {
    if (!loaded) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const rows = profileRef.current?.querySelectorAll('.hero__prow')
    if (!rows || rows.length === 0) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12, delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [loaded])

  return (
    <header className="hero" id="top">
      <Preloader onDone={() => setLoaded(true)} />

      <div className="hero3d">
        {tier.mode === '3d' ? <YubatakeScene tier={tier} /> : <YubatakeFallback />}
        <div className="hero3d__scrim" aria-hidden="true" />
      </div>

      <div className="container hero__inner">
        <p className="hero__eyebrow mono">FIG.00 — PROFILE / 草津 湯畑</p>
        <h1 className="hero__name mono">
          大場 祐飛 <span className="hero__name-en">/ Yuhi Oba</span>
        </h1>

        <dl className="hero__profile mono" ref={profileRef}>
          {PROFILE.map((row) => (
            <div className="hero__prow" key={row.key}>
              <dt className="hero__pkey">{row.key}</dt>
              <dd className="hero__pval" lang="ja">
                {row.val}
              </dd>
            </div>
          ))}
        </dl>

        <div className="hero__actions">
          <a className="btn btn--primary" href="#works">
            作品を見る <span aria-hidden="true">↓</span>
          </a>
          <a
            className="btn btn--ghost mono"
            href="https://github.com/008sunset-gif"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  )
}
