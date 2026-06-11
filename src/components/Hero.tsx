import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Hero3DScene from '../three/Hero3DScene'
import EvoWalkerCanvas from './EvoWalkerCanvas'
import Preloader from './Preloader'
import useDeviceTier from '../hooks/useDeviceTier'

// 1ページ目の自己紹介。事実を簡潔に伝える文体（ポエム調にしない）。
const DECLARATION = [
  '生成AIエージェントとリアルタイム3Dを使った、個人アプリ開発をしています。',
  '制作した2つのアプリを下にまとめました。コードはGitHubで公開しています。',
]

export default function Hero() {
  const tier = useDeviceTier()
  const [loaded, setLoaded] = useState(false)
  const declRef = useRef<HTMLParagraphElement>(null)

  // 宣言文を1行ずつ 0.15s 刻みでフェードイン（プリローダー解除と同時）。reduced-motion は即表示。
  useEffect(() => {
    if (!loaded) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const lines = declRef.current?.querySelectorAll('.hero__line')
    if (!lines || lines.length === 0) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lines,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [loaded])

  return (
    <header className="hero" id="top">
      <Preloader onDone={() => setLoaded(true)} />

      <div className="hero3d">
        {tier.mode === '3d' ? <Hero3DScene tier={tier} /> : <EvoWalkerCanvas />}
        <div className="hero3d__scrim" aria-hidden="true" />
      </div>

      <div className="container hero__inner">
        <p className="hero__eyebrow mono">FIG.00 — PROFILE / 自己紹介</p>
        <h1 className="hero__name mono">
          大場 祐飛 <span className="hero__name-en">/ Yuhi Oba</span>
        </h1>
        <p className="hero__affil mono" lang="ja">
          東京電機大学大学院 システムデザイン工学研究科 デザイン工学専攻
        </p>

        <p className="hero__declaration" lang="ja" ref={declRef}>
          {DECLARATION.map((line) => (
            <span className="hero__line" key={line}>
              {line}
            </span>
          ))}
        </p>

        <div className="hero__actions">
          <a className="btn btn--primary" href="#works">
            View Works <span aria-hidden="true">↓</span>
          </a>
          <a
            className="btn btn--ghost mono"
            href="https://github.com/008sunset-gif"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  )
}
