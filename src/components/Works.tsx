import WorkRow, { type Work } from './WorkRow'
import EvoWalkerMini from './EvoWalkerMini'
import AgentFlow from './AgentFlow'
import BoardroomFlow from './BoardroomFlow'

// 文言はすべて原文のまま。技術スタックのみ表示用にタグ分割している。
const EVOWALKER: Work = {
  index: '01',
  title: 'EvoWalker AI',
  oneLiner: '遺伝的アルゴリズムで二足歩行を自律学習する3D進化シミュレーター',
  description:
    'AIロボットの個体群が世代交代を繰り返し、ふらつきや転倒を乗り越えてまっすぐ歩けるよう進化していく様子を、3Dとグラフでリアルタイムに観察できるWebアプリ。12個の遺伝子・エリート選抜・突然変異による遺伝的アルゴリズムに加え、歩行の物理（重力・接地・バランス）も外部の物理エンジンに頼らず自作している。',
  tech: ['React 19', 'React Three Fiber', 'Three.js', 'TypeScript', 'Vite'],
  live: 'https://evowalker-ai.vercel.app',
  code: 'https://github.com/008sunset-gif/evowalker-ai',
}

const PAPER_SURVEY: Work = {
  index: '02',
  title: 'Paper Survey Agent',
  oneLiner: 'LLMの出典捏造を機械的・意味的に検証する論文サーベイエージェント',
  description:
    'AIが付けた出典が本当に正しいかを、論文の実際の内容と照合して機械的・意味的にチェックするツール。裏が取れなかった主張も勝手に消さず、「未検証」などのステータスを付けたまま残すので、どこまで信頼できるかが分かる。出典の取得には arXiv と Semantic Scholar を使用。テストは79本あり、外部APIに接続しなくても動作確認できる設計にしている。',
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

const AI_BOARDROOM: Work = {
  index: '03',
  title: 'AI Boardroom',
  oneLiner: '役職の異なるAIが議論し、意思決定の論点とリスクを整理する経営会議',
  description:
    '経営課題を入力すると、役職ごとに異なる視点を持つAIが初期意見・反論・再反論の2巡で議論し、議長AIが論点とリスクを構造化する。議論の前にAIが判断に必要な情報を逆質問するため、一般論でなくその状況に即した議論になる。AIは結論を出さず、人が判断するための材料を整理することに徹している。',
  tech: ['React 18', 'TypeScript', 'Vite', 'Gemini (gemini-2.5-flash-lite)'],
  live: 'https://ai-boardroom-beta.vercel.app',
  code: 'https://github.com/008sunset-gif/ai-boardroom',
}

export default function Works() {
  return (
    <section className="section works" id="works">
      <span className="section__index" aria-hidden="true">
        02
      </span>
      <div className="container">
        <p className="fig works__fig" data-reveal>
          FIG.02 <span className="fig__name">/ 制作したアプリ</span>
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
          <WorkRow
            work={AI_BOARDROOM}
            media={<BoardroomFlow />}
            mediaCaption="FIG.02·C — DISCUSSION FLOW"
          />
        </div>
      </div>
    </section>
  )
}
