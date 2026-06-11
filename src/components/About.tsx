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
            生成AIエージェントとリアルタイム3Dの2分野で、個人でアプリを開発しています。
            AIの内部処理や学習の過程を、人が見て理解できる形にすることに取り組んでいます。
          </p>
          <p className="about__sub" data-reveal lang="ja">
            制作した2つのアプリを下の Selected Works にまとめました。
            コードはすべて GitHub で公開しています。
          </p>
        </div>
      </div>
    </section>
  )
}
