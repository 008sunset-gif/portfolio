import WorkRow, { type Work } from './WorkRow'
import EvoWalkerMini from './EvoWalkerMini'
import AgentFlow from './AgentFlow'

// 文言はすべて原文のまま。技術スタックのみ表示用にタグ分割している。
const EVOWALKER: Work = {
  index: '01',
  title: 'EvoWalker AI',
  oneLiner: '遺伝的アルゴリズムで二足歩行を自律学習する3D進化シミュレーター',
  description:
    'AIロボット個体群が世代交代を繰り返し、ふらつき・転倒を克服してまっすぐ歩けるよう進化する過程を3DとSVGグラフで観察できるWebアプリ。12個の遺伝子パラメータ＋エリート選抜＋突然変異の遺伝的アルゴリズムを、外部物理エンジンを使わず自作した。',
  tech: ['React 19', 'React Three Fiber', 'Three.js', 'TypeScript', 'Vite'],
  live: 'https://evowalker-ai.vercel.app',
  code: 'https://github.com/008sunset-gif/evowalker-ai',
}

const PAPER_SURVEY: Work = {
  index: '02',
  title: 'Paper Survey Agent',
  oneLiner: 'LLMの出典捏造を機械的・意味的に検証する論文サーベイエージェント',
  description:
    'LLMが論文調査で出典を捏造する問題に対し、各主張に論文IDを紐付け、arXiv・Semantic Scholar から取得した実際の論文内容と矛盾しないかを検証するCLIツール。裏が取れない主張も消さず、検証ステータス付きで残す。6つの部品で処理を分担し、テストは79本。実APIに依存しないモック設計にした。',
  tech: [
    'Python 3.14',
    'Gemini (langchain-google-genai)',
    'arXiv API',
    'Semantic Scholar API',
    'Pydantic v2',
    'pytest',
  ],
  code: 'https://github.com/008sunset-gif/paper-survey-agent',
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
            mediaCaption="FIG.02·A — LIVE SIMULATION"
          />
          <WorkRow
            work={PAPER_SURVEY}
            media={<AgentFlow />}
            mediaCaption="FIG.02·B — AGENT PIPELINE"
            reverse
          />
        </div>
      </div>
    </section>
  )
}
