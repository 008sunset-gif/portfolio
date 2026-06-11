// カテゴリ名・項目は原文のまま。
const SKILLS: { label: string; items: string[] }[] = [
  { label: '言語', items: ['TypeScript', 'Python'] },
  { label: 'フロント/3D', items: ['React', 'React Three Fiber', 'Three.js', 'Vite'] },
  {
    label: 'AI/エージェント',
    items: ['Gemini', 'LangChain', 'Pydantic', 'RAG', 'マルチエージェント設計'],
  },
  { label: 'その他', items: ['arXiv / Semantic Scholar API', 'pytest', '遺伝的アルゴリズム', 'Git/GitHub'] },
]

export default function Skills() {
  return (
    <section className="section skills" id="skills">
      <span className="section__index" aria-hidden="true">
        03
      </span>
      <div className="container">
        <p className="fig" data-reveal>
          FIG.03 <span className="fig__name">/ Skills</span>
        </p>
        <dl className="skills__list" data-reveal-group>
          {SKILLS.map((row, i) => (
            <div className="skills__row" key={row.label} data-reveal>
              <dt className="skills__cat mono" lang="ja">
                <span className="skills__no">{String(i + 1).padStart(2, '0')}</span>
                {row.label}
              </dt>
              <dd className="skills__items">
                {row.items.map((it) => (
                  <span className="skills__tag mono" key={it}>
                    {it}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
