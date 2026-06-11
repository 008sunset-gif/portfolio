import WorkRow, { type Work } from './WorkRow'
import EvoWalkerMini from './EvoWalkerMini'
import AgentFlow from './AgentFlow'

// 文言はすべて原文のまま。技術スタックのみ表示用にタグ分割している。
const EVOWALKER: Work = {
  index: '01',
  title: 'EvoWalker AI',
  oneLiner: '遺伝的アルゴリズムで二足歩行を自律学習する3D進化シミュレーター',
  description:
    'AIロボット個体群が世代交代を繰り返し、ふらつき・転倒を克服してまっすぐ歩けるよう進化する過程を3DとSVGグラフで観察できるWebアプリ。12個の遺伝子パラメータ＋エリート選抜＋突然変異のGAを外部物理エンジン無しで自作。',
  voice:
    '「外部物理エンジンに頼らず歩行物理を自作したのは、挙動を一行ずつ説明できる状態にしたかったからだ。」',
  tech: ['React 19', 'React Three Fiber', 'Three.js', 'TypeScript(strict)', 'Vite 8'],
  live: 'https://evowalker-ai.vercel.app/',
  code: 'https://github.com/008sunset-gif/evowalker-ai',
}

const DEEPDIVE: Work = {
  index: '02',
  title: 'DeepDive',
  oneLiner: '4つのAIエージェントが自律調査するマルチエージェント型リサーチエージェント',
  description:
    '質問を入力すると Planner→Researcher→Writer が連携し、Web検索と統合を繰り返して引用付きMarkdownレポートを自動生成。Pydanticで全出力を型保証し、ハルシネーション対策とローカル完結を重視。',
  voice:
    '「すべての主張に出典を付けるのは、AIの出力を『信じる』ではなく『検証できる』ものにしたいからだ。」',
  tech: ['Python 3.12', 'LangGraph', 'LangChain', 'Gemini', 'Tavily', 'Pydantic', 'Streamlit'],
  code: 'https://github.com/008sunset-gif/deepdive',
}

export default function Works() {
  return (
    <section className="section works" id="works">
      <span className="section__index" aria-hidden="true">
        02
      </span>
      <div className="container">
        <p className="fig works__fig" data-reveal>
          FIG.02 <span className="fig__name">/ Selected Works</span>
        </p>

        <div className="works__list">
          <WorkRow
            work={EVOWALKER}
            media={<EvoWalkerMini />}
            mediaCaption="FIG.02·A — LIVE SIMULATION / 同一エンジン"
          />
          <WorkRow
            work={DEEPDIVE}
            media={<AgentFlow />}
            mediaCaption="FIG.02·B — AGENT PIPELINE"
            reverse
          />
        </div>
      </div>
    </section>
  )
}
