/**
 * The paper-survey pipeline as a labelled vertical stepper: each of the six
 * stages shows its English name and a short Japanese description of what it
 * does, connected top-to-bottom with a flow that lights up in sequence. Pure
 * CSS/HTML (no SVG text) so the labels stay crisp; under prefers-reduced-motion
 * the flow rests in a calm lit state.
 */
const STEPS: { en: string; jp: string }[] = [
  { en: 'Planner', jp: '調査計画を立てる' },
  { en: 'Collector', jp: '論文を収集する' },
  { en: 'Evaluator', jp: '結果を自己批評する' },
  { en: 'Synthesizer', jp: '要約を生成する' },
  { en: 'Verifier', jp: '出典を検証する' },
  { en: 'Reporter', jp: 'レポートにまとめる' },
]

export default function AgentFlow() {
  return (
    <div className="agentflow" aria-label="論文サーベイエージェントの処理パイプライン（6段階）">
      <ol className="pipeline">
        {STEPS.map((s, i) => (
          <li
            className="pipeline__step"
            key={s.en}
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="pipeline__node" aria-hidden="true">
              <span className="pipeline__dot" />
            </span>
            <span className="pipeline__label">
              <span className="pipeline__en mono">
                <span className="pipeline__no mono">{String(i + 1).padStart(2, '0')}</span>
                {s.en}
              </span>
              <span className="pipeline__jp" lang="ja">
                {s.jp}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
