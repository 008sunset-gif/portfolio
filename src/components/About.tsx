export default function About() {
  return (
    <section className="section about" id="about">
      <span className="section__index" aria-hidden="true">
        01
      </span>
      <div className="container about__grid">
        <div className="about__rail" data-reveal>
          <p className="fig">
            FIG.01 <span className="fig__name">/ About</span>
          </p>
        </div>

        <div className="about__body" data-reveal-group>
          <p className="about__lead" data-reveal lang="ja">
            個人開発で、生成AIエージェントとリアルタイム3Dの2軸でアプリを作っている。
            共通して関心があるのは「AIの内部で何が起きているか(試行錯誤・学習の過程)を、
            人が直感的に観察でき、再利用できる形に落とすこと」。
          </p>
          <p className="about__affil mono" data-reveal lang="ja">
            所属: 東京電機大学大学院 システムデザイン工学研究科 デザイン工学専攻
          </p>
        </div>
      </div>
    </section>
  )
}
